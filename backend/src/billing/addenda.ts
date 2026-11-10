import {BadRequestException,Body,ConflictException,Controller,Get,Inject,Injectable,Module,NotFoundException,Param,Post,Req,Res,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Request,Response} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AuthModule} from '../auth/auth.module';
import {SessionGuard,TeamGuard,type Account} from '../auth/auth';
import {allowedClientIds} from '../auth/client-access';
import {assertActiveStaff,lockTeamProject} from '../team/access';
import {DocumentsModule} from '../documents/documents.module';
import {PdfService} from '../documents/pdf.service';
import {parse} from './dto';
import {validateReceipt,MAX_RECEIPT_BYTES} from './receipt-validation';
const draftDto=z.object({contractVersion:z.number().int().positive(),expectedRevision:z.number().int().nonnegative(),reason:z.string().trim().min(5).max(2000),addedScope:z.string().trim().max(5000),removedScope:z.string().trim().max(5000),deltaCents:z.number().int().min(-1000000000).max(1000000000),deliveryImpact:z.string().trim().min(3).max(2000),conditions:z.string().trim().min(5).max(5000),mode:z.enum(['online','physical'])}).strict().refine(v=>!!(v.addedScope||v.removedScope),'Describe el alcance añadido o retirado.');
const versionDto=z.object({version:z.number().int().positive()}).strict();
const acceptDto=versionDto.extend({sha256:z.string().regex(/^[a-f0-9]{64}$/),signerName:z.string().trim().min(2).max(160),accepted:z.literal(true),reviewedPdf:z.literal(true)}).strict();
const consent='He revisado la propuesta complementaria identificada por su versión y PDF. Acepto el alcance añadido o retirado, el impacto económico, los plazos y las condiciones indicadas. El contrato original conserva su evidencia.';
const normalized=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
type R=Request&{account:Account};
function expose(r:any){return {id:r.id,contractId:r.contrato_id,version:r.version,status:r.estado,data:r.datos,sha256:r.sha256,createdAt:new Date(r.created_at).toISOString(),acceptance:r.aceptacion||null};}
const select="SELECT a.*,CASE WHEN e.adenda_id IS NULL THEN NULL ELSE jsonb_build_object('mode',e.modo,'signerName',e.nombre,'acceptedAt',e.accepted_at,'sha256',e.sha256) END AS aceptacion FROM contrato_adendas a LEFT JOIN adenda_aceptaciones e ON e.adenda_id=a.id";
@Injectable()
export class AddendaService{
 constructor(@Inject(Database)private db:Database,@Inject(PdfService)private pdf:PdfService){}
 private async access(tx:Sql,a:Account,id:string,client=false){
  parse(z.uuid(),id);
  const row=(await tx.query('SELECT * FROM contratos WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row)throw new NotFoundException('Contrato no disponible.');
  if(client){if(!(await allowedClientIds(tx,a)).includes(row.cliente_id)||row.estado==='borrador')throw new NotFoundException('Contrato no disponible.');}
  else{await assertActiveStaff(tx,a);if(a.role!=='admin'){if(!row.equipo_proyecto_id)throw new NotFoundException('Contrato no disponible.');await lockTeamProject(tx,a,row.equipo_proyecto_id);}}
  return row;
 }
 async list(a:Account,id:string,client=false){return this.db.transaction(async tx=>{await this.access(tx,a,id,client);return (await tx.query(select+" WHERE a.contrato_id=$1"+(client?" AND a.estado<>'draft'":'')+' ORDER BY a.version DESC',[id])).rows.map(expose);});}
 async create(a:Account,id:string,body:unknown){const input=parse(draftDto,body);return this.db.transaction(async tx=>{
  const parent=await this.access(tx,a,id),c=parent.datos;
  this.requireOriginalAcceptance(parent);
  if(c.version!==input.contractVersion)throw new ConflictException('El contrato cambió. Actualiza antes de preparar un acuerdo.');
  const revision=Number((await tx.query('SELECT COALESCE(max(version),0) AS version FROM contrato_adendas WHERE contrato_id=$1',[id])).rows[0].version);
  if(input.expectedRevision!==revision)throw new ConflictException('Ya hay una propuesta más reciente. Actualiza el historial.');
  const adendaId=randomUUID(),version=revision+1,number=c.number+'-A'+String(version).padStart(2,'0');
  const data={...input,id:adendaId,number,contractId:id,contractNumber:c.number,client:structuredClone(c.client),issuer:structuredClone(c.issuer),projectName:c.projectName,version,createdAt:new Date().toISOString()};
  const bytes=await this.pdf.reportPdf('Acuerdo complementario',number,[{title:'Contrato original y partes',text:c.number+' / '+c.projectName+'\nCliente: '+c.client.name+' / '+c.client.taxId+'\nPrestador: '+c.issuer.name+' / '+c.issuer.taxId+'\nVersión del contrato de origen: '+c.version},{title:'Motivo',text:input.reason},{title:'Alcance añadido',text:input.addedScope||'Sin alcance añadido.'},{title:'Alcance retirado',text:input.removedScope||'Sin alcance retirado.'},{title:'Impacto económico acordado',text:new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(input.deltaCents/100)+'\nEste acuerdo conserva los saldos y cuotas anteriores. Cualquier cargo adicional, devolución o ajuste financiero requiere una operación administrativa separada y explícita.'},{title:'Impacto en plazos',text:input.deliveryImpact},{title:'Condiciones complementarias',text:input.conditions},{title:'Aceptación',text:consent+'\nModalidad: '+(input.mode==='online'?'Aceptación autenticada en el portal, sin certificado digital.':'Firma externa: ambas partes firman el documento y el equipo adjunta el ejemplar firmado.')+'\nFirma del cliente: ____________________\nFirma de TUKNEX: ____________________'}]);
  const hash=createHash('sha256').update(bytes).digest('hex');await tx.query('INSERT INTO contrato_adendas(id,contrato_id,version,datos,pdf,sha256,creado_por) VALUES($1,$2,$3,$4,$5,$6,$7)',[adendaId,id,version,JSON.stringify(data),bytes,hash,a.id]);
  await this.audit(tx,a,id,'adenda_preparada',{id:adendaId,version});return expose((await tx.query(select+' WHERE a.id=$1',[adendaId])).rows[0]);
 });}
 private requireOriginalAcceptance(row:any){const c=row.datos;if(row.estado==='cancelado'||row.estado==='borrador'||(c.signatureMode==='online'?!c.clientAcceptance:!c.clientSignedAt&&!['activo','finalizado'].includes(row.estado)))throw new ConflictException('El cliente debe aceptar primero el contrato original.');}
 private async audit(tx:Sql,a:Account,id:string,action:string,data:unknown){await tx.query('INSERT INTO auditoria(id,accion,entidad_id,datos,actor_id,actor_nombre,actor_rol) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),action,id,JSON.stringify(data),a.id,a.name,a.role]);}
 async publish(a:Account,id:string,adendaId:string,body:unknown){const input=parse(versionDto,body);parse(z.uuid(),adendaId);return this.db.transaction(async tx=>{const parent=await this.access(tx,a,id);this.requireOriginalAcceptance(parent);const row=(await tx.query('SELECT * FROM contrato_adendas WHERE id=$1 AND contrato_id=$2 FOR UPDATE',[adendaId,id])).rows[0];if(!row||row.version!==input.version)throw new NotFoundException('Propuesta no disponible.');if(row.estado==='sent')return expose(row);if(row.estado!=='draft')throw new ConflictException('Esta propuesta ya fue resuelta.');const latest=(await tx.query('SELECT max(version) AS version FROM contrato_adendas WHERE contrato_id=$1',[id])).rows[0];if(Number(latest.version)!==row.version)throw new ConflictException('Publica la propuesta más reciente.');await tx.query("UPDATE contrato_adendas SET estado='superseded' WHERE contrato_id=$1 AND estado='sent'",[id]);await tx.query("UPDATE contrato_adendas SET estado='sent' WHERE id=$1",[adendaId]);await this.audit(tx,a,id,'adenda_publicada',{id:adendaId,version:row.version});return expose({...row,estado:'sent'});});}
 async file(a:Account,id:string,adendaId:string,client=false,evidence=false){parse(z.uuid(),adendaId);return this.db.transaction(async tx=>{await this.access(tx,a,id,client);const row=(await tx.query('SELECT * FROM contrato_adendas WHERE id=$1 AND contrato_id=$2'+(client?" AND estado<>'draft'":''),[adendaId,id])).rows[0];if(!row)throw new NotFoundException('Documento no disponible.');if(evidence){const file=(await tx.query('SELECT c.* FROM adenda_aceptaciones e JOIN comprobantes c ON c.id=e.comprobante_id WHERE e.adenda_id=$1',[adendaId])).rows[0];if(!file)throw new NotFoundException('No hay ejemplar firmado adjunto.');return{bytes:Buffer.from(file.contenido),mime:file.mime,filename:file.nombre};}return {bytes:Buffer.from(row.pdf),mime:'application/pdf',filename:row.datos.number+'.pdf'};});}
 async accept(a:Account,id:string,adendaId:string,body:unknown,file?:{buffer:Buffer;originalname:string}){
  const input=parse(acceptDto,body);parse(z.uuid(),adendaId);return this.db.transaction(async tx=>{const parent=await this.access(tx,a,id,a.role==='client');const row=(await tx.query(select+' WHERE a.id=$1 AND a.contrato_id=$2 FOR UPDATE OF a',[adendaId,id])).rows[0];if(!row)throw new NotFoundException('Propuesta no disponible.');const physical=a.role!=='client';
   if(row.version!==input.version||row.sha256!==input.sha256||createHash('sha256').update(Buffer.from(row.pdf)).digest('hex')!==row.sha256)throw new ConflictException('Revisa el PDF de esta versión antes de aceptar.');
   if(normalized(input.signerName)!==normalized(row.datos.client.name))throw new BadRequestException('Indica el nombre del titular del acuerdo.');
   if(row.estado==='accepted'){if(row.aceptacion?.mode===(physical?'physical':'online')&&row.aceptacion?.sha256===input.sha256)return expose(row);throw new ConflictException('La aceptación ya está registrada.');}
   this.requireOriginalAcceptance(parent);
   if(row.estado!=='sent'||row.datos.mode!==(physical?'physical':'online'))throw new ConflictException('Esta propuesta no está pendiente de esta modalidad de aceptación.');
   let receiptId:string|null=null;if(physical){const proof=validateReceipt(file);receiptId=randomUUID();await tx.query('INSERT INTO comprobantes(id,nombre,mime,contenido,sha256) VALUES($1,$2,$3,$4,$5)',[receiptId,proof.name,proof.mime,proof.bytes,proof.sha256]);}
   await tx.query('INSERT INTO adenda_aceptaciones(adenda_id,usuario_id,modo,nombre,consentimiento,sha256,comprobante_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[adendaId,a.id,physical?'physical':'online',input.signerName,consent,input.sha256,receiptId]);await tx.query("UPDATE contrato_adendas SET estado='accepted' WHERE id=$1",[adendaId]);await this.audit(tx,a,parent.id,'adenda_aceptada',{id:adendaId,version:row.version,sha256:row.sha256,mode:physical?'physical':'online'});return expose((await tx.query(select+' WHERE a.id=$1',[adendaId])).rows[0]);
  });
 }
}
function download(res:Response,doc:{bytes:Buffer;mime:string;filename:string}){res.set({'Content-Type':doc.mime,'Content-Disposition':'attachment; filename="'+doc.filename.replace(/[^a-zA-Z0-9._-]/g,'_')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(doc.bytes);}
@Controller('api/account/contracts/:contractId/addenda') @UseGuards(SessionGuard)
class AccountAddendaController{constructor(@Inject(AddendaService)private service:AddendaService){} @Get()list(@Req()r:R,@Param('contractId')id:string){return this.service.list(r.account,id,true);} @Get(':id/pdf')async pdf(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Res()res:Response){download(res,await this.service.file(r.account,id,aid,true));} @Get(':id/evidence')async evidence(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Res()res:Response){download(res,await this.service.file(r.account,id,aid,true,true));} @Post(':id/accept')accept(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Body()b:unknown){return this.service.accept(r.account,id,aid,b);}}
@Controller('api/team/contracts/:contractId/addenda') @UseGuards(TeamGuard)
class StaffAddendaController{constructor(@Inject(AddendaService)private service:AddendaService){} @Get()list(@Req()r:R,@Param('contractId')id:string){return this.service.list(r.account,id);} @Post()create(@Req()r:R,@Param('contractId')id:string,@Body()b:unknown){return this.service.create(r.account,id,b);} @Post(':id/publish')publish(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Body()b:unknown){return this.service.publish(r.account,id,aid,b);} @Get(':id/pdf')async pdf(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Res()res:Response){download(res,await this.service.file(r.account,id,aid));} @Get(':id/evidence')async evidence(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Res()res:Response){download(res,await this.service.file(r.account,id,aid,false,true));} @Post(':id/physical-acceptance') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_RECEIPT_BYTES}}))physical(@Req()r:R,@Param('contractId')id:string,@Param('id')aid:string,@Body()b:Record<string,string>,@UploadedFile()file?:Express.Multer.File){return this.service.accept(r.account,id,aid,{version:Number(b.version),sha256:b.sha256,signerName:b.signerName,accepted:b.accepted==='true',reviewedPdf:b.reviewedPdf==='true'},file);}}
@Module({imports:[DatabaseModule,AuthModule,DocumentsModule],providers:[AddendaService],controllers:[AccountAddendaController,StaffAddendaController],exports:[AddendaService]}) export class AddendaModule{}
