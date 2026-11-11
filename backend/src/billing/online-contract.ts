import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,Inject,Injectable,Module,NotFoundException,Param,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AuthModule} from '../auth/auth.module';
import {SessionGuard,type Account} from '../auth/auth';
import {allowedClientIds} from '../auth/client-access';
import {activityContext} from '../auth/activity-context';
import {BillingModule} from './billing.module';
import {BillingService} from './billing.service';
import {parse} from './dto';
import {DocumentsModule} from '../documents/documents.module';
import {PdfService} from '../documents/pdf.service';
import {contractAcceptanceText,type Contract,type ContractAcceptance} from '../domain/billing/types';
const reviewDto=z.object({version:z.number().int().positive()}).strict();
const acceptDto=reviewDto.extend({documentId:z.uuid(),sha256:z.string().regex(/^[0-9a-f]{64}$/),signerName:z.string().trim().min(2).max(160),accepted:z.literal(true),acknowledgedPdf:z.literal(true)}).strict();
const normalized=(name:string)=>name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
type ActorRequest=Request&{account:Account};
@Injectable()
export class OnlineContractService {
 constructor(@Inject(Database)private db:Database,@Inject(PdfService)private pdf:PdfService,@Inject(BillingService)private billing:BillingService){}
 private async contract(tx:Sql,a:Account,id:string){
  parse(z.uuid(),id);
  if(a.role!=='client'||!a.clientId)throw new ForbiddenException('La aceptación debe realizarse desde la cuenta del cliente.');
  const user=(await tx.query('SELECT rol,activo,cliente_id FROM usuarios WHERE id=$1 FOR UPDATE',[a.id])).rows[0];
  if(!user?.activo||user.rol!=='client'||user.cliente_id!==a.clientId)throw new ForbiddenException('Esta cuenta ya no tiene acceso al contrato.');
  const row=(await tx.query("SELECT datos FROM contratos WHERE id=$1 AND cliente_id=ANY($2::uuid[]) AND estado<>'borrador' FOR UPDATE",[id,await allowedClientIds(tx,a)])).rows[0];
  if(!row)throw new NotFoundException('Contrato no disponible.');
  const c=row.datos as Contract;
  if(c.signatureMode!=='online')throw new ConflictException('Este contrato utiliza firma presencial o externa.');
  return c;
 }
 private actionable(c:Contract,version:number){
  if(c.version!==version)throw new ConflictException('El contrato cambió. Actualiza y revisa su PDF vigente.');
  if(c.clientAcceptance||!['enviado','firmado_tuknex'].includes(c.status))throw new ConflictException('Este contrato no está pendiente de tu aceptación.');
 }
 async review(a:Account,id:string,body:unknown){
  const input=parse(reviewDto,body);
  return this.db.transaction(async tx=>{
   const c=await this.contract(tx,a,id);this.actionable(c,input.version);
   let row=(await tx.query('SELECT documento_id,sha256 FROM contrato_revisiones WHERE contrato_id=$1 AND version=$2',[id,c.version])).rows[0];
   if(!row){
    const bytes=await this.pdf.contractPdf(c),documentId=randomUUID(),sha256=createHash('sha256').update(bytes).digest('hex');
    await tx.query("INSERT INTO documentos(id,tipo,entidad_id,version,contenido,sha256) VALUES($1,'contract',$2,$3,$4,$5)",[documentId,id,c.version,bytes,sha256]);
    await tx.query('INSERT INTO contrato_revisiones(documento_id,contrato_id,version,datos,sha256) VALUES($1,$2,$3,$4,$5)',[documentId,id,c.version,JSON.stringify(c),sha256]);
    row={documento_id:documentId,sha256};
   }
   return {documentId:row.documento_id,version:c.version,sha256:row.sha256,consentText:contractAcceptanceText};
  });
 }
 async document(a:Account,id:string,documentId:string){
  parse(z.uuid(),documentId);
  return this.db.transaction(async tx=>{
   const c=await this.contract(tx,a,id);
   const row=(await tx.query('SELECT d.contenido,d.sha256,r.version FROM contrato_revisiones r JOIN documentos d ON d.id=r.documento_id WHERE r.documento_id=$1 AND r.contrato_id=$2',[documentId,id])).rows[0];
   if(!row||(!(c.clientAcceptance?.documentId===documentId)&&row.version!==c.version))throw new NotFoundException('Versión de revisión no disponible. Actualiza el contrato.');
   return{bytes:Buffer.from(row.contenido),filename:c.number+'-version-'+row.version+'.pdf'};
  });
 }
 async accept(a:Account,id:string,body:unknown){
  const input=parse(acceptDto,body);
  return this.db.transaction(async tx=>{
   const c=await this.contract(tx,a,id);
   if(c.clientAcceptance){
    const old=c.clientAcceptance;
    if(old.acceptedByUserId===a.id&&old.documentId===input.documentId&&old.documentSha256===input.sha256&&old.acceptedVersion===input.version&&normalized(old.signerName)===normalized(input.signerName))return c;
    throw new ConflictException('La aceptación de este contrato ya quedó registrada.');
   }
   this.actionable(c,input.version);
   if(normalized(input.signerName)!==normalized(c.client.name))throw new BadRequestException('Escribe el nombre del titular indicado en el contrato.');
   const reviewed=(await tx.query('SELECT r.datos,r.sha256,d.contenido,d.sha256 AS file_sha FROM contrato_revisiones r JOIN documentos d ON d.id=r.documento_id WHERE r.documento_id=$1 AND r.contrato_id=$2 AND r.version=$3',[input.documentId,id,input.version])).rows[0];
   if(!reviewed||reviewed.sha256!==input.sha256||reviewed.file_sha!==input.sha256||createHash('sha256').update(Buffer.from(reviewed.contenido)).digest('hex')!==input.sha256||JSON.stringify(reviewed.datos)!==JSON.stringify(c))throw new ConflictException('La revisión no corresponde al contrato vigente. Vuelve a abrir su PDF.');
   const acceptance:ContractAcceptance={id:randomUUID(),acceptedAt:new Date().toISOString(),acceptedVersion:c.version,signerName:input.signerName,acceptedByUserId:a.id,documentId:input.documentId,documentSha256:input.sha256,consentText:contractAcceptanceText};
   await tx.query('INSERT INTO contrato_aceptaciones(id,contrato_id,documento_id,usuario_id,version,nombre,sha256,consentimiento,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[acceptance.id,id,input.documentId,a.id,c.version,input.signerName,input.sha256,contractAcceptanceText,acceptance.acceptedAt]);
   c.clientAcceptance=acceptance;c.clientSignedAt=acceptance.acceptedAt;c.status='firmado_cliente';c.version++;
   await tx.query('UPDATE contratos SET estado=$2,datos=$3,version=$4,updated_at=now() WHERE id=$1',[id,c.status,JSON.stringify(c),c.version]);
   await activityContext.run({actor:a},()=>this.billing.audit(tx,'contrato_aceptado_en_linea',id,{documentId:acceptance.documentId,sha256:acceptance.documentSha256,acceptedVersion:acceptance.acceptedVersion,acceptedAt:acceptance.acceptedAt}));
   return c;
  });
 }
}
@Controller('api/account/contracts')
@UseGuards(SessionGuard)
class OnlineContractController {
 constructor(@Inject(OnlineContractService)private service:OnlineContractService){}
 @Post(':id/acceptance-review') review(@Req()r:ActorRequest,@Param('id')id:string,@Body()b:unknown){return this.service.review(r.account,id,b);}
 @Get(':id/acceptance-review/:documentId/pdf') async document(@Req()r:ActorRequest,@Param('id')id:string,@Param('documentId')documentId:string,@Res()res:Response){const doc=await this.service.document(r.account,id,documentId);res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+doc.filename+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(doc.bytes);}
 @Post(':id/accept') accept(@Req()r:ActorRequest,@Param('id')id:string,@Body()b:unknown){return this.service.accept(r.account,id,b);}
}
@Module({imports:[DatabaseModule,AuthModule,BillingModule,DocumentsModule],providers:[OnlineContractService],controllers:[OnlineContractController]})
export class OnlineContractModule {}
