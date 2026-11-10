import {Body,ConflictException,Controller,Get,Inject,Injectable,Module,NotFoundException,Param,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AdminGuard,SessionGuard,TeamGuard,type Account} from '../auth/auth';
import {allowedClientIds} from '../auth/client-access';
import {AuthModule} from '../auth/auth.module';
import {activityContext} from '../auth/activity-context';
import {lockTeamProject} from '../team/access';
import {BillingModule} from './billing.module';
import {BillingService} from './billing.service';
import {DocumentsModule} from '../documents/documents.module';
import {PdfService} from '../documents/pdf.service';
import {parse} from './dto';
import {saveQuoteVersion} from './quote-versions';
import {todayLima} from '../domain/billing/finance';
import type {BillingQuote} from '../domain/billing/types';
import {enqueueNotification} from '../notifications/outbox';
type ActorRequest=Request&{account:Account};
const responseDto=z.object({version:z.number().int().positive(),decision:z.enum(['request_changes','decline','confirm_proposal']),comment:z.string().trim().max(2000),idempotencyKey:z.uuid()}).strict().refine(v=>v.decision!=='request_changes'||v.comment.length>=5,'Explica los cambios que necesitas.');
@Injectable()
export class QuoteResponsesService{
 constructor(@Inject(Database)private db:Database,@Inject(BillingService)private billing:BillingService,@Inject(PdfService)private pdf:PdfService){}
 private async scope(tx:Sql,a:Account,id:string,teamId?:string){
  parse(z.uuid(),id);let own:string[]|null=null;
  if(teamId){const project=await lockTeamProject(tx,a,teamId);if(!project.cliente_id)throw new NotFoundException('Proyecto no disponible.');}
  else if(a.role==='client')own=await allowedClientIds(tx,a);
  else{const user=(await tx.query("SELECT id FROM usuarios WHERE id=$1 AND activo=true AND rol='admin' FOR UPDATE",[a.id])).rows[0];if(!user)throw new NotFoundException('Cotización no disponible.');}
  const row=(await tx.query('SELECT datos,equipo_proyecto_id FROM cotizaciones WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row||teamId&&row.equipo_proyecto_id!==teamId||own&&(!own.includes(row.datos.clientId)||row.datos.status==='draft'))throw new NotFoundException('Cotización no disponible.');
  return {quote:row.datos as BillingQuote,teamId:row.equipo_proyecto_id as string|null,own};
 }
 async history(a:Account,id:string,teamId?:string){return this.db.transaction(async tx=>{
  const {quote,own}=await this.scope(tx,a,id,teamId);await saveQuoteVersion(tx,quote);
  const rows=(await tx.query('SELECT version,datos,created_at,legacy_snapshot FROM cotizacion_versiones WHERE cotizacion_id=$1 ORDER BY version DESC',[id])).rows.filter(r=>!own||own.includes(r.datos.clientId)&&r.datos.status!=='draft');
  const visible=new Set(rows.map(r=>r.version)),responses=(await tx.query('SELECT id,version,decision,comentario AS comment,autor_nombre AS "authorName",created_at AS "createdAt" FROM cotizacion_respuestas WHERE cotizacion_id=$1 ORDER BY created_at DESC',[id])).rows.filter(r=>visible.has(r.version));
  return{currentVersion:quote.version,versions:rows.map(r=>({version:r.version,status:r.datos.status,projectName:r.datos.projectName,totalCents:r.datos.totalCents,createdAt:r.created_at,legacySnapshot:r.legacy_snapshot})),responses};
 });}
 async respond(a:Account,id:string,body:unknown){const input=parse(responseDto,body);return this.db.transaction(async tx=>{
  if(a.role!=='client')throw new NotFoundException('Usa una cuenta de cliente para responder.');
  const {quote,teamId}=await this.scope(tx,a,id),prior=(await tx.query('SELECT id,version,decision,comentario FROM cotizacion_respuestas WHERE usuario_id=$1 AND idempotency_key=$2',[a.id,input.idempotencyKey])).rows[0];
  if(prior){const same=prior.version===input.version&&prior.decision===input.decision&&prior.comentario===input.comment&&(await tx.query('SELECT id FROM cotizacion_respuestas WHERE id=$1 AND cotizacion_id=$2',[prior.id,id])).rows.length;if(!same)throw new ConflictException('Este identificador ya se usó para otra respuesta.');return{ok:true,id:prior.id};}
  if(quote.version!==input.version)throw new ConflictException('La propuesta cambió. Revisa su versión actual antes de responder.');
  if(quote.status!=='sent')throw new ConflictException('Esta propuesta ya no está pendiente de respuesta.');
  if(quote.validUntil<todayLima())throw new ConflictException('La vigencia de la propuesta terminó. Pide al equipo una actualización.');
  const existing=(await tx.query('SELECT id FROM cotizacion_respuestas WHERE cotizacion_id=$1 AND version=$2',[id,input.version])).rows[0];if(existing)throw new ConflictException('Tu respuesta a esta versión ya quedó registrada.');
  await saveQuoteVersion(tx,quote,a.id);const responseId=randomUUID();await tx.query('INSERT INTO cotizacion_respuestas(id,cotizacion_id,version,usuario_id,decision,comentario,idempotency_key,datos,autor_nombre) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[responseId,id,input.version,a.id,input.decision,input.comment,input.idempotencyKey,JSON.stringify(quote),a.name]);
  if(input.decision!=='request_changes'){quote.status=input.decision==='confirm_proposal'?'accepted':'rejected';quote.version++;await tx.query('UPDATE cotizaciones SET estado=$2,version=$3,datos=$4,updated_at=now() WHERE id=$1',[id,quote.status,quote.version,JSON.stringify(quote)]);await saveQuoteVersion(tx,quote,a.id);}
  await activityContext.run({actor:a,projectId:teamId||undefined},()=>this.billing.audit(tx,'respuesta_cotizacion',id,{responseId,decision:input.decision,answeredVersion:input.version,currentVersion:quote.version}));
  const responsible=teamId?(await tx.query('SELECT responsable_id FROM equipo_proyectos WHERE id=$1',[teamId])).rows[0]?.responsable_id:null;
  await enqueueNotification(tx,{key:'quote_response:'+responseId,kind:'quote_response',entityId:id,projectName:quote.projectName,projectId:teamId,route:'/admin/cotizaciones?cotizacion='+id,recipientIds:responsible?[responsible]:[]});
  return{ok:true,id:responseId,quote};
 });}
 async versionPdf(a:Account,id:string,rawVersion:string,res:Response,teamId?:string){const version=parse(z.coerce.number().int().positive(),rawVersion);const snapshot=await this.db.transaction(async tx=>{const {quote,own}=await this.scope(tx,a,id,teamId);await saveQuoteVersion(tx,quote);const row=(await tx.query('SELECT datos FROM cotizacion_versiones WHERE cotizacion_id=$1 AND version=$2',[id,version])).rows[0];if(!row||own&&(!own.includes(row.datos.clientId)||row.datos.status==='draft'))throw new NotFoundException('Versión no disponible.');return row.datos as BillingQuote;});const bytes=await this.pdf.quotePdf(snapshot);res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+snapshot.number+'-v'+snapshot.version+'.pdf"','Cache-Control':'no-store'}).send(bytes);}
}
@Controller('api/account/quotes')@UseGuards(SessionGuard)
class ClientQuoteResponsesController{constructor(@Inject(QuoteResponsesService)private service:QuoteResponsesService){}@Get(':id/responses')history(@Req()r:ActorRequest,@Param('id')id:string){return this.service.history(r.account,id);}@Post(':id/responses')respond(@Req()r:ActorRequest,@Param('id')id:string,@Body()body:unknown){return this.service.respond(r.account,id,body);}@Get(':id/versions/:version/pdf')pdf(@Req()r:ActorRequest,@Param('id')id:string,@Param('version')version:string,@Res()res:Response){return this.service.versionPdf(r.account,id,version,res);}}
@Controller('api/billing/quote-responses')@UseGuards(AdminGuard)
class AdminQuoteResponsesController{constructor(@Inject(QuoteResponsesService)private service:QuoteResponsesService){}@Get(':id')history(@Req()r:ActorRequest,@Param('id')id:string){return this.service.history(r.account,id);}@Get(':id/versions/:version/pdf')pdf(@Req()r:ActorRequest,@Param('id')id:string,@Param('version')version:string,@Res()res:Response){return this.service.versionPdf(r.account,id,version,res);}}
@Controller('api/team/projects/:pid/quote-responses')@UseGuards(TeamGuard)
class TeamQuoteResponsesController{constructor(@Inject(QuoteResponsesService)private service:QuoteResponsesService){}@Get(':id')history(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string){return this.service.history(r.account,id,pid);}@Get(':id/versions/:version/pdf')pdf(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Param('version')version:string,@Res()res:Response){return this.service.versionPdf(r.account,id,version,res,pid);}}
@Module({imports:[DatabaseModule,AuthModule,BillingModule,DocumentsModule],providers:[QuoteResponsesService],controllers:[ClientQuoteResponsesController,AdminQuoteResponsesController,TeamQuoteResponsesController]})export class QuoteResponsesModule{}
