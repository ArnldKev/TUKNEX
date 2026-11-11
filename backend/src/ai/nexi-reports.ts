import {Body,ConflictException,Controller,Get,Inject,Injectable,Module,NotFoundException,Param,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {AuthModule} from '../auth/auth.module';
import {TeamGuard,type Account} from '../auth/auth';
import {assertActiveStaff,lockTeamProject} from '../team/access';
import {parse} from '../billing/dto';
import {QuoteAiModule,QuoteAiService,formalQuoteContext} from './quote-ai';
import {aiAdminRequestSchema,aiEnvelopeSchema,aiReportSchema,type AiEnvelope} from '../domain/quote/ai';
import {createQuoteProject} from '../domain/quote/project';
import {quoteDefaults,quoteFormSchema} from '../domain/quote/form';
import {projectFromFormalQuote} from '../domain/billing/formal-quote-analysis';
import type {BillingQuote} from '../domain/billing/types';
const sourceKind=z.enum(['request','formal']),uuid=z.uuid();
const reviewSchema=z.object({expectedVersion:z.number().int().nonnegative(),reviewed:aiReportSchema,approved:z.boolean(),internalNote:z.string().trim().max(2000),idempotencyKey:uuid}).strict();
type ActorRequest=Request&{account:Account};
@Injectable()
export class NexiReportsService{
 constructor(@Inject(Database)private db:Database,@Inject(QuoteAiService)private ai:QuoteAiService){}
 private async source(tx:Sql,actor:Account,kind:'request'|'formal',id:string){
  const table=kind==='request'?'solicitudes_cotizacion':'cotizaciones';
  const found=(await tx.query('SELECT equipo_proyecto_id FROM '+(kind==='request'?'(SELECT s.id,p.id AS equipo_proyecto_id FROM solicitudes_cotizacion s LEFT JOIN equipo_proyectos p ON p.solicitud_id=s.id) AS sources':table)+' WHERE id=$1',[id])).rows[0];
  if(!found)throw new NotFoundException('Fuente del informe no disponible.');
  if(found.equipo_proyecto_id)await lockTeamProject(tx,actor,found.equipo_proyecto_id);
  else {if(actor.role!=='admin')throw new NotFoundException('Fuente del informe no disponible.');await assertActiveStaff(tx,actor);}
  const row=(await tx.query('SELECT * FROM '+table+' WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row)throw new NotFoundException('Fuente del informe no disponible.');
  if(kind==='request')return {revision:Number(row.revision),project:createQuoteProject({...quoteDefaults,...quoteFormSchema.parse(row.respuestas)},id),terms:undefined};
  const quote=row.datos as BillingQuote;
  return {revision:Number(row.version),project:projectFromFormalQuote(quote),terms:formalQuoteContext(quote)};
 }
 private expose(row:Record<string,any>,reviews:Record<string,any>[]=[]){return {id:row.id,sourceKind:row.tipo_fuente,sourceId:row.fuente_id,sourceRevision:row.revision_fuente,envelope:row.generado,createdAt:new Date(row.created_at).toISOString(),reviews:reviews.map(r=>({id:r.id,version:r.version,reviewed:r.revisado,approved:r.aprobado,internalNote:r.nota_interna,createdAt:new Date(r.created_at).toISOString()}))};}
 async list(actor:Account,kind:unknown,id:string){
  const type=parse(sourceKind,kind);parse(uuid,id);
  return this.db.transaction(async tx=>{
   const source=await this.source(tx,actor,type,id);
   const rows=(await tx.query('SELECT * FROM nexi_informes WHERE tipo_fuente=$1 AND fuente_id=$2 ORDER BY created_at DESC,id DESC LIMIT 50',[type,id])).rows;
   const reviews=rows.length?(await tx.query('SELECT * FROM nexi_informe_revisiones WHERE informe_id=ANY($1::uuid[]) ORDER BY version DESC',[rows.map(row=>row.id)])).rows:[];
   return {sourceRevision:source.revision,reports:rows.map(row=>this.expose(row,reviews.filter(r=>r.informe_id===row.id)))};
  });
 }
 async generate(actor:Account,kind:unknown,id:string,body:unknown,req:Request,res:Response){
  const type=parse(sourceKind,kind),input=parse(aiAdminRequestSchema,body);parse(uuid,id);
  const source=await this.db.transaction(tx=>this.source(tx,actor,type,id));
  if(source.revision!==input.version)throw new ConflictException('La fuente cambió. Actualízala antes de analizarla.');
  const envelope=aiEnvelopeSchema.parse(await this.ai.analyze(req,source.project,res,source.terms));
  if(res.destroyed)throw new ConflictException('Consulta cancelada. No se guardó ningún informe.');
  return this.db.transaction(async tx=>{
   const current=await this.source(tx,actor,type,id);
   if(current.revision!==source.revision||JSON.stringify(current.project)!==JSON.stringify(source.project)||JSON.stringify(current.terms)!==JSON.stringify(source.terms))throw new ConflictException('La fuente cambió mientras NEXI analizaba. No se guardó un informe desactualizado.');
   // Canonical source and original generated envelope are immutable. No public drafts reach this table.
   const row=(await tx.query('INSERT INTO nexi_informes(id,tipo_fuente,fuente_id,revision_fuente,instantanea,generado,creado_por) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[envelope.id,type,id,source.revision,JSON.stringify({project:source.project,terms:source.terms}),JSON.stringify(envelope),actor.id])).rows[0];
   return this.expose(row);
  });
 }
 async review(actor:Account,kind:unknown,id:string,reportId:string,body:unknown){
  const type=parse(sourceKind,kind),input=parse(reviewSchema,body);parse(uuid,id);parse(uuid,reportId);
  return this.db.transaction(async tx=>{
   const current=await this.source(tx,actor,type,id);
   const report=(await tx.query('SELECT * FROM nexi_informes WHERE id=$1 AND tipo_fuente=$2 AND fuente_id=$3 FOR UPDATE',[reportId,type,id])).rows[0];
   if(!report)throw new NotFoundException('Informe no disponible.');
   const replay=(await tx.query('SELECT * FROM nexi_informe_revisiones WHERE informe_id=$1 AND clave_idempotencia=$2',[reportId,input.idempotencyKey])).rows[0];
   if(replay){if(!isDeepStrictEqual(replay.revisado,input.reviewed)||replay.aprobado!==input.approved||replay.nota_interna!==input.internalNote)throw new ConflictException('La misma operación ya se usó para otra revisión.');return {version:replay.version};}
   if(current.revision!==report.revision_fuente)throw new ConflictException('Este informe corresponde a una versión anterior. Genera uno de la fuente actual antes de aprobar.');
   const version=Number((await tx.query('SELECT COALESCE(max(version),0)::int AS version FROM nexi_informe_revisiones WHERE informe_id=$1',[reportId])).rows[0].version);
   if(version!==input.expectedVersion)throw new ConflictException('Otra persona revisó el informe. Actualiza para conservar ambas revisiones.');
   await tx.query('INSERT INTO nexi_informe_revisiones(id,informe_id,version,revisado,aprobado,nota_interna,autor_id,clave_idempotencia) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),reportId,version+1,JSON.stringify(input.reviewed),input.approved,input.internalNote,actor.id,input.idempotencyKey]);
   return {version:version+1};
  });
 }
}
@Controller('api/nexi-reports')
@UseGuards(TeamGuard)
class NexiReportsController{
 constructor(@Inject(NexiReportsService)private service:NexiReportsService){}
 @Get(':kind/:id')list(@Req()req:ActorRequest,@Param('kind')kind:string,@Param('id')id:string,@Query()query:unknown){parse(z.object({}).strict(),query);return this.service.list(req.account,kind,id);}
 @Post(':kind/:id/generate')generate(@Req()req:ActorRequest,@Param('kind')kind:string,@Param('id')id:string,@Body()body:unknown,@Res({passthrough:true})res:Response){return this.service.generate(req.account,kind,id,body,req,res);}
 @Post(':kind/:id/:reportId/reviews')review(@Req()req:ActorRequest,@Param('kind')kind:string,@Param('id')id:string,@Param('reportId')reportId:string,@Body()body:unknown){return this.service.review(req.account,kind,id,reportId,body);}
}
@Module({imports:[DatabaseModule,AuthModule,QuoteAiModule],providers:[NexiReportsService],controllers:[NexiReportsController],exports:[NexiReportsService]})
export class NexiReportsModule{}
