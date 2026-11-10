import {Body,ConflictException,Controller,Get,Inject,Injectable,Logger,Module,NotFoundException,OnModuleDestroy,OnModuleInit,Param,Post,UseGuards} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AdminGuard} from '../auth/auth';
import {AuthModule} from '../auth/auth.module';
import {parse} from '../billing/dto';
export function notificationConfig(){
 let origin='';try{const url=new URL(process.env.APP_PUBLIC_URL||'');if(url.protocol==='https:'||(process.env.NODE_ENV!=='production'&&url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))origin=url.origin;}catch{}
 return {enabled:process.env.NOTIFICATIONS_ENABLED==='true',available:!!(origin&&process.env.RESEND_API_KEY?.trim()&&process.env.EMAIL_FROM?.trim()),origin};
}
@Injectable()
export class NotificationsService implements OnModuleInit,OnModuleDestroy{
 private timer?:ReturnType<typeof setInterval>;private running=false;
 constructor(@Inject(Database)private db:Database){}
 onModuleInit(){this.timer=setInterval(()=>{void this.drain().catch(()=>Logger.warn('No se pudo procesar la bandeja de avisos.','Notifications'));},30000);this.timer.unref();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async list(){const config=notificationConfig();return {enabled:config.enabled,available:config.available,items:(await this.db.query('SELECT n.id,n.tipo AS kind,n.entidad_id AS "entityId",n.proyecto_nombre AS "projectName",n.ruta AS route,n.estado AS status,n.intentos AS attempts,n.error_codigo AS "errorCode",n.created_at AS "createdAt",n.enviado_at AS "sentAt",u.nombre AS "recipientName" FROM notificaciones_salida n JOIN usuarios u ON u.id=n.destinatario_id ORDER BY n.created_at DESC LIMIT 200')).rows};}
 async retry(id:string){parse(z.uuid(),id);return this.db.transaction(async tx=>{const row=(await tx.query('SELECT estado,bloqueo_hasta FROM notificaciones_salida WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException('Aviso no disponible.');if(row.estado==='sent'||row.estado==='cancelled')throw new ConflictException('Este aviso ya terminó.');if(row.bloqueo_hasta&&new Date(row.bloqueo_hasta).getTime()>Date.now())throw new ConflictException('El aviso ya se está procesando.');await tx.query("UPDATE notificaciones_salida SET estado='pending',intentos=0,proximo_intento=now(),bloqueo_hasta=NULL,bloqueo_token=NULL,error_codigo=NULL WHERE id=$1",[id]);return {ok:true};});}
 async drain(){
  const config=notificationConfig();if(this.running||!config.enabled||!config.available)return {processed:0};this.running=true;let processed=0;
  try{for(let i=0;i<10;i++){
   const token=randomUUID(),row=await this.db.transaction(async tx=>{await tx.query("UPDATE notificaciones_salida SET estado='failed',error_codigo='delivery_unconfirmed',bloqueo_hasta=NULL,bloqueo_token=NULL WHERE estado='sending' AND bloqueo_hasta<=now() AND intentos>=5");const found=(await tx.query("SELECT * FROM notificaciones_salida WHERE ((estado='pending' AND proximo_intento<=now()) OR (estado='sending' AND bloqueo_hasta<=now())) AND intentos<5 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED")).rows[0];if(!found)return null;await tx.query("UPDATE notificaciones_salida SET estado='sending',intentos=intentos+1,bloqueo_token=$2,bloqueo_hasta=now()+interval '45 seconds' WHERE id=$1",[found.id,token]);return {...found,intentos:found.intentos+1} as Record<string,any>;});
   if(!row)break;processed++;
   const recipient=(await this.db.query("SELECT u.correo FROM usuarios u WHERE u.id=$1 AND u.activo=true AND u.rol=$2 AND (u.rol='admin' OR EXISTS(SELECT 1 FROM equipo_proyectos p WHERE p.id=$3 AND p.responsable_id=u.id))",[row.destinatario_id,row.destinatario_rol,row.equipo_proyecto_id])).rows[0];
   if(!recipient){await this.db.query("UPDATE notificaciones_salida SET estado='cancelled',error_codigo='recipient_unavailable',bloqueo_hasta=NULL,bloqueo_token=NULL WHERE id=$1 AND bloqueo_token=$2",[row.id,token]);continue;}
   try{
    if(!/^\/(admin|equipo)(?:[/?#]|$)/.test(row.ruta)||row.ruta.startsWith('//'))throw Error('invalid_route');
    const url=new URL(row.ruta,config.origin);if(url.origin!==config.origin)throw Error('invalid_route');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'tuknex-notification-'+row.id},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[recipient.correo],subject:'TUKNEX · '+(({quote_request:'Nueva solicitud de cotización',orientation:'Solicitud de orientación',quote_response:'Respuesta a una propuesta'} as Record<string,string>)[row.tipo]||'Actualización de proyecto'),text:['Proyecto: '+row.proyecto_nombre,'Identificador: '+row.entidad_id,'Recibido: '+new Date(row.created_at).toISOString(),'Tipo: '+row.tipo,'Revisa el detalle desde tu cuenta: '+url.href].join('\n')})});
    if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('delivery_unavailable');}const result=await response.json() as {id?:unknown};if(typeof result.id!=='string')throw Error('delivery_unconfirmed');
    await this.db.query("UPDATE notificaciones_salida SET estado='sent',enviado_at=now(),proveedor_id=$3,error_codigo=NULL,bloqueo_hasta=NULL,bloqueo_token=NULL WHERE id=$1 AND bloqueo_token=$2",[row.id,token,result.id]);
   }catch{await this.db.query("UPDATE notificaciones_salida SET estado=$3,error_codigo='delivery_unavailable',proximo_intento=now()+($4::integer*interval '1 second'),bloqueo_hasta=NULL,bloqueo_token=NULL WHERE id=$1 AND bloqueo_token=$2",[row.id,token,row.intentos>=5?'failed':'pending',Math.min(3600,30*2**row.intentos)]);}
  }return {processed};}finally{this.running=false;}
 }
}
@Controller('api/billing/notifications')
@UseGuards(AdminGuard)
class NotificationsController{constructor(@Inject(NotificationsService)private service:NotificationsService){}@Get()list(){return this.service.list();}@Post(':id/retry')retry(@Param('id')id:string,@Body()body:unknown){parse(z.object({}).strict(),body);return this.service.retry(id);}}
@Module({imports:[DatabaseModule,AuthModule],providers:[NotificationsService],controllers:[NotificationsController],exports:[NotificationsService]})
export class NotificationsModule{}
