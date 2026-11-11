import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,Inject,Injectable,Module,NotFoundException,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AuthModule} from './auth.module';
import {AdminGuard,type Account} from './auth';
import {activityContext} from './activity-context';
import {BillingService} from '../billing/billing.service';
import {BillingModule} from '../billing/billing.module';
import {parse} from '../billing/dto';
const previewDto=z.object({userId:z.uuid(),action:z.enum(['link','unlink']).default('link')}).strict();
const confirmDto=z.object({previewId:z.uuid(),confirmed:z.literal(true),reason:z.string().trim().min(10).max(500)}).strict();
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const accountFields=(u:Record<string,any>)=>({id:u.id,name:u.nombre,email:u.correo,dni:u.dni||'',active:u.activo,clientId:u.cliente_id});
@Injectable()
export class ClientAssociationsService{
 constructor(@Inject(Database)private db:Database,@Inject(BillingService)private billing:BillingService){}
 private async admin(tx:Sql,a:Account){const u=(await tx.query('SELECT rol,activo FROM usuarios WHERE id=$1 FOR UPDATE',[a.id])).rows[0];if(a.role!=='admin'||!u?.activo||u.rol!=='admin')throw new ForbiddenException('Solo el administrador principal puede asociar cuentas.');}
 private async impact(tx:Sql,id:string){
  const [requests,quotes,contracts,payments,reports]=await Promise.all([
   tx.query("SELECT id,numero,revision,estado,respuestas->>'businessName' AS name FROM solicitudes_cotizacion WHERE cliente_id=$1 ORDER BY created_at,id",[id]),
   tx.query("SELECT id,numero,version,estado,datos->>'projectName' AS name FROM cotizaciones WHERE cliente_id=$1 ORDER BY created_at,id",[id]),
   tx.query("SELECT id,numero_contrato AS numero,version,estado,datos->>'projectName' AS name FROM contratos WHERE cliente_id=$1 ORDER BY created_at,id",[id]),
   tx.query('SELECT p.id,p.contrato_id,p.monto::text AS amount,p.fecha_pago::text AS date,p.anulado,p.comprobante_id FROM pagos p JOIN contratos c ON c.id=p.contrato_id WHERE c.cliente_id=$1 ORDER BY p.created_at,p.id',[id]),
   tx.query('SELECT id,contrato_id,importe::text AS amount,fecha::text AS date,estado,revision,comprobante_id FROM pago_reportes WHERE cliente_id=$1 ORDER BY created_at,id',[id]),
  ]);
  return {requests:requests.rows,quotes:quotes.rows,contracts:contracts.rows,payments:payments.rows,reports:reports.rows};
 }
 private async snapshot(tx:Sql,id:string,userId:string,action:'link'|'unlink'){
  const client=(await tx.query('SELECT id,datos,updated_at FROM clientes WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!client)throw new NotFoundException('Ficha de cliente no encontrada.');
  const primary=(await tx.query("SELECT id,nombre,correo,dni,activo,cliente_id FROM usuarios WHERE cliente_id=$1 AND rol='client' FOR UPDATE",[id])).rows[0];
  const target=(await tx.query("SELECT id,nombre,correo,dni,activo,cliente_id FROM usuarios WHERE id=$1 AND rol='client' FOR UPDATE",[userId])).rows[0];
  if(!target||!target.cliente_id||(action==='link'&&!target.activo))throw new BadRequestException('Selecciona una cuenta de cliente activa.');
  if(primary)throw new ConflictException('Esta ficha ya es la ficha principal de una cuenta. Su identidad no se transfiere desde esta operación.');
  const link=(await tx.query('SELECT * FROM cliente_cuenta_asociaciones WHERE cliente_id=$1 FOR UPDATE',[id])).rows[0];
  if(action==='link'&&link?.activo)throw new ConflictException('Esta ficha ya está asociada. Revísala antes de cambiar el acceso.');
  if(action==='unlink'&&(!link?.activo||link.usuario_id!==userId))throw new ConflictException('La asociación ya no corresponde a esta cuenta.');
  const impact=await this.impact(tx,id);
  return {client:client.datos,clientUpdatedAt:new Date(client.updated_at).toISOString(),account:accountFields(target),action,version:link?.revision||0,impact};
 }
 async accounts(actor:Account,query:unknown){
  const input=parse(z.object({search:z.string().trim().max(254).default('')}).strict(),query);
  return this.db.transaction(async tx=>{await this.admin(tx,actor);const q=input.search.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();return(await tx.query("SELECT id,nombre,correo,dni,activo,cliente_id FROM usuarios WHERE rol='client' AND activo=true AND strpos(translate(lower(nombre||' '||correo||' '||COALESCE(dni,'')),'áéíóúüñ','aeiouun'),$1)>0 ORDER BY nombre,id LIMIT 50",[q])).rows.map(accountFields);});
 }
 async state(actor:Account,id:string){
  parse(z.uuid(),id);
  return this.db.transaction(async tx=>{await this.admin(tx,actor);const client=(await tx.query('SELECT datos FROM clientes WHERE id=$1',[id])).rows[0];if(!client)throw new NotFoundException('Ficha de cliente no encontrada.');
   const primary=(await tx.query("SELECT id,nombre,correo,dni,activo,cliente_id FROM usuarios WHERE cliente_id=$1 AND rol='client'",[id])).rows[0];
   const link=(await tx.query('SELECT a.*,u.nombre,u.correo,u.dni,u.activo AS cuenta_activa,u.cliente_id AS principal_id FROM cliente_cuenta_asociaciones a JOIN usuarios u ON u.id=a.usuario_id WHERE a.cliente_id=$1',[id])).rows[0];
   const history=await tx.query('SELECT h.id,h.accion AS action,h.revision,h.motivo AS reason,h.created_at AS "createdAt",u.nombre AS administrator,t.nombre AS "accountName" FROM cliente_asociacion_historial h JOIN usuarios u ON u.id=h.administrador_id JOIN usuarios t ON t.id=h.usuario_id WHERE h.cliente_id=$1 ORDER BY h.created_at DESC,h.id',[id]);
   return {client:client.datos,primary:!!primary,account:primary?accountFields(primary):link?.activo?{id:link.usuario_id,name:link.nombre,email:link.correo,dni:link.dni,active:link.cuenta_activa,clientId:link.principal_id}:null,version:link?.revision||0,history:history.rows};
  });
 }
 async preview(actor:Account,id:string,body:unknown){parse(z.uuid(),id);const input=parse(previewDto,body);return this.db.transaction(async tx=>{await this.admin(tx,actor);const snapshot=await this.snapshot(tx,id,input.userId,input.action),previewId=randomUUID(),expiresAt=new Date(Date.now()+10*60000).toISOString();await tx.query('DELETE FROM cliente_asociacion_revisiones WHERE expires_at<now() AND confirmado_at IS NULL');await tx.query('INSERT INTO cliente_asociacion_revisiones(id,cliente_id,usuario_id,administrador_id,accion,version,huella,resumen,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[previewId,id,input.userId,actor.id,input.action,snapshot.version,digest(snapshot),JSON.stringify(snapshot),expiresAt]);return {previewId,expiresAt,...snapshot};});}
 async confirm(actor:Account,id:string,body:unknown){
  parse(z.uuid(),id);const input=parse(confirmDto,body);
  return this.db.transaction(async tx=>{await this.admin(tx,actor);const ticket=(await tx.query('SELECT * FROM cliente_asociacion_revisiones WHERE id=$1 AND cliente_id=$2 AND administrador_id=$3 FOR UPDATE',[input.previewId,id,actor.id])).rows[0];if(!ticket)throw new NotFoundException('Revisión no disponible.');
   if(ticket.confirmado_at){if(ticket.motivo!==input.reason)throw new ConflictException('Esta confirmación ya se registró con otro motivo.');return {ok:true,revision:ticket.version+1,replayed:true};}
   if(new Date(ticket.expires_at).getTime()<=Date.now())throw new ConflictException('La revisión caducó. Consulta nuevamente los documentos afectados.');
   const snapshot=await this.snapshot(tx,id,ticket.usuario_id,ticket.accion);if(snapshot.version!==ticket.version||digest(snapshot)!==ticket.huella)throw new ConflictException('La ficha, la cuenta o sus documentos cambiaron. Vuelve a revisar la asociación.');
   const next=snapshot.version+1;
   await tx.query('INSERT INTO cliente_cuenta_asociaciones(cliente_id,usuario_id,activo,revision,creado_por,actualizado_por) VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(cliente_id) DO UPDATE SET usuario_id=excluded.usuario_id,activo=excluded.activo,revision=excluded.revision,actualizado_por=excluded.actualizado_por,updated_at=now()',[id,ticket.usuario_id,ticket.accion==='link',next,actor.id]);
   await tx.query('INSERT INTO cliente_asociacion_historial(id,revision_id,cliente_id,usuario_id,administrador_id,accion,revision,motivo,resumen) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),ticket.id,id,ticket.usuario_id,actor.id,ticket.accion,next,input.reason,JSON.stringify(snapshot)]);
   await tx.query('UPDATE cliente_asociacion_revisiones SET confirmado_at=now(),motivo=$2 WHERE id=$1',[ticket.id,input.reason]);
   await activityContext.run({actor},()=>this.billing.audit(tx,ticket.accion==='link'?'ficha_cuenta_asociada':'ficha_cuenta_desasociada',id,{userId:ticket.usuario_id,revision:next,reason:input.reason,previewId:ticket.id}));
   return {ok:true,revision:next,replayed:false};
  });
 }
}
@Controller('api/billing')
@UseGuards(AdminGuard)
class ClientAssociationsController{
 constructor(@Inject(ClientAssociationsService)private service:ClientAssociationsService){}
 @Get('client-accounts') accounts(@Req()r:Request&{account:Account},@Query()q:unknown){return this.service.accounts(r.account,q);}
 @Get('clients/:id/account-association') state(@Req()r:Request&{account:Account},@Param('id')id:string){return this.service.state(r.account,id);}
 @Post('clients/:id/account-association/preview') preview(@Req()r:Request&{account:Account},@Param('id')id:string,@Body()b:unknown){return this.service.preview(r.account,id,b);}
 @Post('clients/:id/account-association/confirm') confirm(@Req()r:Request&{account:Account},@Param('id')id:string,@Body()b:unknown){return this.service.confirm(r.account,id,b);}
}
@Module({imports:[DatabaseModule,AuthModule,BillingModule],providers:[ClientAssociationsService],controllers:[ClientAssociationsController],exports:[ClientAssociationsService]})
export class ClientAssociationsModule{}
