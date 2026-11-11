import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,Inject,Injectable,Module,NotFoundException,Param,Patch,Post,Req,Res,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Request,Response} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AuthModule} from '../auth/auth.module';
import {AdminGuard,SessionGuard,type Account} from '../auth/auth';
import {allowedClientIds} from '../auth/client-access';
import {activityContext} from '../auth/activity-context';
import {BillingModule} from './billing.module';
import {BillingService} from './billing.service';
import {parse,paymentDto} from './dto';
import {todayLima} from '../domain/billing/finance';
import {validateReceipt,MAX_RECEIPT_BYTES} from './receipt-validation';
import {enqueueNotification} from '../notifications/outbox';
const fields=paymentDto.omit({receiptId:true,idempotencyKey:true}).extend({contractId:z.uuid()});
const submitDto=fields.extend({idempotencyKey:z.uuid()}).strict();
const updateDto=fields.omit({contractId:true}).extend({version:z.number().int().positive()}).strict();
const decisionDto=z.object({idempotencyKey:z.uuid(),version:z.number().int().positive(),action:z.enum(['confirm','observe','reject']),reason:z.string().trim().min(10).max(500)}).strict();
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reportDate=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
function reportFingerprint(input:z.infer<typeof fields>,receiptSha256:string){return hash({contractId:input.contractId,installmentId:input.installmentId||null,amountCents:input.amountCents,date:input.date,method:input.method,reference:input.reference,observation:input.observation,receiptSha256});}
const selection=`SELECT r.*,r.fecha::text AS report_date,c.numero_contrato,c.datos->>'projectName' AS project_name,u.nombre AS client_name FROM pago_reportes r JOIN contratos c ON c.id=r.contrato_id JOIN usuarios u ON u.id=r.usuario_id`;
function expose(row:Record<string,any>){return{id:row.id,clientId:row.cliente_id,userId:row.usuario_id,clientName:row.client_name,contractId:row.contrato_id,contractNumber:row.numero_contrato,projectName:row.project_name,installmentId:row.cuota_id||undefined,amountCents:Number(row.importe),date:row.report_date||reportDate(row.fecha),method:row.metodo,reference:row.referencia,observation:row.observacion,status:row.estado,version:row.revision,paymentId:row.pago_id||undefined,lastReason:row.ultimo_motivo,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};}
type ActorRequest=Request&{account:Account};
@Injectable()
export class PaymentReportsService{
 constructor(@Inject(Database)private db:Database,@Inject(BillingService)private billing:BillingService){}
 private async admin(tx:Sql,a:Account){const row=(await tx.query('SELECT rol,activo FROM usuarios WHERE id=$1 FOR UPDATE',[a.id])).rows[0];if(a.role!=='admin'||row?.rol!=='admin'||!row.activo)throw new ForbiddenException('Solo el administrador confirma o revisa pagos.');}
 private async contract(tx:Sql,a:Account,id:string){const access=await allowedClientIds(tx,a),row=(await tx.query("SELECT id,cliente_id,datos FROM contratos WHERE id=$1 AND cliente_id=ANY($2::uuid[]) AND estado NOT IN ('borrador','cancelado','finalizado') FOR UPDATE",[id,access])).rows[0];if(!row)throw new NotFoundException('Contrato no disponible para reportar pagos.');return row;}
 private async validateTerms(tx:Sql,contractId:string,input:z.infer<typeof fields>){
  if(input.date>todayLima())throw new BadRequestException('No reportes como realizado un pago futuro.');
  const balances=await tx.query('SELECT id,monto,pagado FROM saldo_cuotas WHERE contrato_id=$1'+(input.installmentId?' AND id=$2':''),input.installmentId?[contractId,input.installmentId]:[contractId]);
  if(!balances.rows.length)throw new BadRequestException('La cuota no pertenece a este contrato.');
  if(input.amountCents>balances.rows.reduce((sum,r)=>sum+Number(r.monto)-Number(r.pagado),0))throw new BadRequestException('El importe supera el saldo de las cuotas seleccionadas.');
 }
 private async history(tx:Sql,id:string,a:Account,action:string,version:number,reason:string,data:unknown){await tx.query('INSERT INTO pago_reporte_historial(id,reporte_id,actor_id,accion,revision,motivo,datos) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,a.id,action,version,reason,JSON.stringify(data)]);}
 private async row(tx:Sql,id:string){return(await tx.query(selection+' WHERE r.id=$1',[id])).rows[0];}
 async list(a:Account){return this.db.transaction(async tx=>{if(a.role==='admin'){await this.admin(tx,a);return(await tx.query(selection+' ORDER BY r.created_at DESC')).rows.map(expose);}const ids=await allowedClientIds(tx,a);return(await tx.query(selection+' WHERE r.cliente_id=ANY($1::uuid[]) ORDER BY r.created_at DESC',[ids])).rows.map(expose);});}
 async submit(a:Account,raw:unknown,file?:Express.Multer.File){
  const input=parse(submitDto,raw),receipt=validateReceipt(file),fingerprint=reportFingerprint(input,receipt.sha256);
  return this.db.transaction(async tx=>{
   const contract=await this.contract(tx,a,input.contractId);
   const prior=(await tx.query('SELECT id,entrada_hash FROM pago_reportes WHERE usuario_id=$1 AND clave_idempotencia=$2',[a.id,input.idempotencyKey])).rows[0];
   if(prior){if(prior.entrada_hash!==fingerprint)throw new ConflictException('La clave de reintento pertenece a otro reporte.');return expose(await this.row(tx,prior.id));}
   const duplicate=(await tx.query("SELECT id FROM pago_reportes WHERE contrato_id=$1 AND huella=$2 AND estado<>'rejected'",[contract.id,fingerprint])).rows[0];if(duplicate)return expose(await this.row(tx,duplicate.id));
   await this.validateTerms(tx,contract.id,input);const receiptId=randomUUID(),id=randomUUID();
   await tx.query('INSERT INTO comprobantes(id,nombre,mime,contenido,sha256) VALUES($1,$2,$3,$4,$5)',[receiptId,receipt.name,receipt.mime,receipt.bytes,receipt.sha256]);
   await tx.query('INSERT INTO pago_reportes(id,usuario_id,cliente_id,contrato_id,cuota_id,importe,fecha,metodo,referencia,observacion,comprobante_id,clave_idempotencia,entrada_hash,huella) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)',[id,a.id,contract.cliente_id,contract.id,input.installmentId||null,input.amountCents,input.date,input.method,input.reference,input.observation,receiptId,input.idempotencyKey,fingerprint]);
   await this.history(tx,id,a,'submitted',1,'Reporte enviado por el cliente',{...input,receiptSha256:receipt.sha256});
   await activityContext.run({actor:a},()=>this.billing.audit(tx,'pago_reportado',id,{contractId:contract.id,amountCents:input.amountCents}));
   await enqueueNotification(tx,{key:'payment-report:'+id+':1',kind:'payment_report',entityId:id,projectName:contract.datos.projectName,route:'/admin/pagos'});
   return expose(await this.row(tx,id));
  });
 }
 async update(a:Account,id:string,raw:unknown,file?:Express.Multer.File){
  parse(z.uuid(),id);const input=parse(updateDto,raw),receipt=file?validateReceipt(file):null;
  return this.db.transaction(async tx=>{const owned=await allowedClientIds(tx,a),r=(await tx.query('SELECT * FROM pago_reportes WHERE id=$1 AND cliente_id=ANY($2::uuid[]) FOR UPDATE',[id,owned])).rows[0];if(!r)throw new NotFoundException('Reporte no disponible.');if(r.revision!==input.version||r.estado!=='observed')throw new ConflictException('Solo puedes corregir un reporte observado de su versión vigente.');
   const contract=await this.contract(tx,a,r.contrato_id);await this.validateTerms(tx,r.contrato_id,{...input,contractId:r.contrato_id});
   let receiptId=r.comprobante_id,sha256=(await tx.query('SELECT sha256 FROM comprobantes WHERE id=$1',[receiptId])).rows[0].sha256;
   if(receipt){receiptId=randomUUID();sha256=receipt.sha256;await tx.query('INSERT INTO comprobantes(id,nombre,mime,contenido,sha256) VALUES($1,$2,$3,$4,$5)',[receiptId,receipt.name,receipt.mime,receipt.bytes,receipt.sha256]);}
   const fingerprint=reportFingerprint({...input,contractId:r.contrato_id},sha256);
   const duplicate=(await tx.query("SELECT id FROM pago_reportes WHERE contrato_id=$1 AND huella=$2 AND estado<>'rejected' AND id<>$3",[r.contrato_id,fingerprint,id])).rows[0];if(duplicate)throw new ConflictException('Ya existe otro reporte con estos datos y comprobante.');
   await tx.query("UPDATE pago_reportes SET cuota_id=$2,importe=$3,fecha=$4,metodo=$5,referencia=$6,observacion=$7,comprobante_id=$8,huella=$9,estado='pending',revision=revision+1,ultimo_motivo='',updated_at=now() WHERE id=$1",[id,input.installmentId||null,input.amountCents,input.date,input.method,input.reference,input.observation,receiptId,fingerprint]);
   await this.history(tx,id,a,'updated',r.revision+1,'Reporte corregido por el cliente',{...input,previousReceiptId:r.comprobante_id,receiptSha256:sha256});
   await enqueueNotification(tx,{key:'payment-report:'+id+':'+(r.revision+1),kind:'payment_report_updated',entityId:id,projectName:contract.datos.projectName,route:'/admin/pagos'});
   return expose(await this.row(tx,id));
  });
 }
 async decide(a:Account,id:string,raw:unknown){
  parse(z.uuid(),id);const input=parse(decisionDto,raw),fingerprint=hash({id,...input});
  return this.db.transaction(async tx=>{await this.admin(tx,a);const prior=(await tx.query('SELECT * FROM pago_reporte_decisiones WHERE clave=$1',[input.idempotencyKey])).rows[0];if(prior){if(prior.reporte_id!==id||prior.administrador_id!==a.id||prior.entrada_hash!==fingerprint)throw new ConflictException('La clave de decisión pertenece a otra operación.');return prior.resultado;}
   const r=(await tx.query('SELECT *,fecha::text AS report_date FROM pago_reportes WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)throw new NotFoundException('Reporte no encontrado.');
   const repeated=(await tx.query('SELECT * FROM pago_reporte_decisiones WHERE clave=$1',[input.idempotencyKey])).rows[0];if(repeated){if(repeated.reporte_id!==id||repeated.administrador_id!==a.id||repeated.entrada_hash!==fingerprint)throw new ConflictException('La clave de decisión pertenece a otra operación.');return repeated.resultado;}
   if(r.revision!==input.version||r.estado!=='pending')throw new ConflictException('El reporte cambió o ya fue revisado. Actualiza antes de decidir.');
   let paymentId:string|undefined;
   if(input.action==='confirm'){
    const scopedDb={query:tx.query.bind(tx),transaction:<R>(fn:(t:Sql)=>Promise<R>)=>fn(tx),mode:this.db.mode} as unknown as Database;
    const result=await activityContext.run({actor:a},()=>new BillingService(scopedDb).recordPayment(r.contrato_id,{installmentId:r.cuota_id||undefined,amountCents:Number(r.importe),date:r.report_date||reportDate(r.fecha),method:r.metodo,reference:r.referencia,observation:r.observacion,receiptId:r.comprobante_id,idempotencyKey:r.id}));paymentId=result.id;
   }
   const status=input.action==='confirm'?'confirmed':input.action==='observe'?'observed':'rejected';
   await tx.query('UPDATE pago_reportes SET estado=$2,revision=revision+1,pago_id=$3,ultimo_motivo=$4,updated_at=now() WHERE id=$1',[id,status,paymentId||null,input.reason]);
   await this.history(tx,id,a,input.action,r.revision+1,input.reason,{paymentId:paymentId||null,before:r.estado,after:status});
   await activityContext.run({actor:a},()=>this.billing.audit(tx,'reporte_pago_revisado',id,{action:input.action,paymentId:paymentId||null,reason:input.reason}));
   const result=expose(await this.row(tx,id));await tx.query('INSERT INTO pago_reporte_decisiones(clave,reporte_id,administrador_id,entrada_hash,resultado) VALUES($1,$2,$3,$4,$5)',[input.idempotencyKey,id,a.id,fingerprint,JSON.stringify(result)]);return result;
  });
 }
 async detail(a:Account,id:string){parse(z.uuid(),id);return this.db.transaction(async tx=>{if(a.role==='admin')await this.admin(tx,a);else{const ids=await allowedClientIds(tx,a);if(!(await tx.query('SELECT id FROM pago_reportes WHERE id=$1 AND cliente_id=ANY($2::uuid[])',[id,ids])).rows[0])throw new NotFoundException('Reporte no disponible.');}const row=await this.row(tx,id);if(!row)throw new NotFoundException('Reporte no disponible.');const history=await tx.query('SELECT h.id,h.accion AS action,h.revision,h.motivo AS reason,h.created_at AS "createdAt",u.nombre AS "actorName" FROM pago_reporte_historial h JOIN usuarios u ON u.id=h.actor_id WHERE h.reporte_id=$1 ORDER BY h.revision,h.created_at,h.id',[id]);return {...expose(row),history:history.rows};});}
 async receipt(a:Account,id:string){parse(z.uuid(),id);return this.db.transaction(async tx=>{if(a.role==='admin')await this.admin(tx,a);const access=a.role==='admin'?null:await allowedClientIds(tx,a);const row=(await tx.query('SELECT c.mime,c.contenido,r.cliente_id FROM pago_reportes r JOIN comprobantes c ON c.id=r.comprobante_id WHERE r.id=$1',[id])).rows[0];if(!row||access&&!access.includes(row.cliente_id))throw new NotFoundException('Comprobante no disponible.');return {mime:row.mime,bytes:Buffer.from(row.contenido)};});}
}
function multipart(value:unknown){if(typeof value!=='string')throw new BadRequestException('Faltan los datos del reporte.');try{return JSON.parse(value);}catch{throw new BadRequestException('Los datos del reporte no tienen un formato válido.');}}
async function sendReceipt(service:PaymentReportsService,actor:Account,id:string,res:Response){const file=await service.receipt(actor,id);res.set({'Content-Type':file.mime,'Content-Disposition':'attachment; filename="reporte-'+id+(file.mime==='application/pdf'?'.pdf':file.mime==='image/png'?'.png':'.jpg')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(file.bytes);}
@Controller('api/account/payment-reports')
@UseGuards(SessionGuard)
class ClientPaymentReportsController{
 constructor(@Inject(PaymentReportsService)private service:PaymentReportsService){}
 @Get() list(@Req()r:ActorRequest){return this.service.list(r.account);}
 @Get(':id') detail(@Req()r:ActorRequest,@Param('id')id:string){return this.service.detail(r.account,id);}
 @Post() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_RECEIPT_BYTES,files:1}})) submit(@Req()r:ActorRequest,@Body('data')body:unknown,@UploadedFile()file?:Express.Multer.File){return this.service.submit(r.account,multipart(body),file);}
 @Patch(':id') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_RECEIPT_BYTES,files:1}})) update(@Req()r:ActorRequest,@Param('id')id:string,@Body('data')body:unknown,@UploadedFile()file?:Express.Multer.File){return this.service.update(r.account,id,multipart(body),file);}
 @Get(':id/receipt') receipt(@Req()r:ActorRequest,@Param('id')id:string,@Res()res:Response){return sendReceipt(this.service,r.account,id,res);}
}
@Controller('api/billing/payment-reports')
@UseGuards(AdminGuard)
class AdminPaymentReportsController{
 constructor(@Inject(PaymentReportsService)private service:PaymentReportsService){}
 @Get() list(@Req()r:ActorRequest){return this.service.list(r.account);}
 @Get(':id') detail(@Req()r:ActorRequest,@Param('id')id:string){return this.service.detail(r.account,id);}
 @Post(':id/decision') decision(@Req()r:ActorRequest,@Param('id')id:string,@Body()body:unknown){return this.service.decide(r.account,id,body);}
 @Get(':id/receipt') receipt(@Req()r:ActorRequest,@Param('id')id:string,@Res()res:Response){return sendReceipt(this.service,r.account,id,res);}
}
@Module({imports:[DatabaseModule,AuthModule,BillingModule],providers:[PaymentReportsService],controllers:[ClientPaymentReportsController,AdminPaymentReportsController],exports:[PaymentReportsService]})
export class PaymentReportsModule{}
