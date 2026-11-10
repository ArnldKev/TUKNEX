import {projectFromFormalQuote} from '../domain/billing/formal-quote-analysis';
import {Body,Controller,Get,Post,Patch,Param,Query,Req,Res,Inject,Injectable,Module,UseGuards,ForbiddenException,NotFoundException,BadRequestException,ConflictException} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Sql} from '../database/database';
import {DatabaseModule} from '../database/database.module';
import {assertActiveStaff,assertActiveAssignee,lockTeamProject} from './access';
import {quoteRequestSelect,exposeQuoteRequest} from '../quotes/quote-requests';
import {AuthModule} from '../auth/auth.module';
import {AdminGuard,TeamGuard,type Account} from '../auth/auth';
import {credentials} from '../auth/account-fields';
import {hashPassword} from '../auth/passwords';
import {activityContext} from '../auth/activity-context';
import {BillingModule} from '../billing/billing.module';
import {BillingService} from '../billing/billing.service';
import {parse,quoteDto,contractDto} from '../billing/dto';
import {DocumentsModule} from '../documents/documents.module';
import {PdfService} from '../documents/pdf.service';
import {QuoteAiModule,QuoteAiService,formalQuoteContext} from '../ai/quote-ai';
import {aiAdminRequestSchema} from '../domain/quote/ai';
import {createQuoteProject} from '../domain/quote/project';
type ActorRequest=Request&{account:Account};
const uuid=z.uuid(),assignment=z.object({assigneeId:uuid.nullable(),revision:z.number().int().positive()}).strict();
function project(r:any){return {id:r.id,requestId:r.solicitud_id,clientId:r.cliente_id,clientLinked:!!r.cliente_id,title:r.titulo,assigneeId:r.responsable_id,assigneeName:r.responsable_nombre||null,status:r.estado,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at};}
const activityFields=`a.*,to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time`;
function event(r:any){return {cursor:r.cursor_time+'|'+r.id,id:r.id,action:r.accion,entityId:r.entidad_id,actorId:r.actor_id,actorName:r.actor_nombre||'Registro anterior',actorRole:r.actor_rol,projectId:r.equipo_proyecto_id,data:r.datos,createdAt:r.created_at};}
@Injectable()
export class TeamService {
 constructor(@Inject(Database)private db:Database,@Inject(BillingService)private billing:BillingService,@Inject(QuoteAiService)private ai:QuoteAiService){}
 private owner(a:Account){if(a.role!=='admin')throw new ForbiddenException('Solo el administrador principal gestiona el equipo.');}
 private async actor(tx:Sql,a:Account){await assertActiveStaff(tx,a);}
 private async assignee(tx:Sql,id:string|null){await assertActiveAssignee(tx,id);}
 private async access(tx:Sql,a:Account,id:string){return lockTeamProject(tx,a,id);}
 private scoped<T>(a:Account,id:string,fn:(tx:Sql,r:any,billing:BillingService)=>Promise<T>):Promise<T>{
  return this.db.transaction(async tx=>{
   const r=await this.access(tx,a,id);
   const scopedDb={query:tx.query.bind(tx),transaction:<R>(f:(t:Sql)=>Promise<R>)=>f(tx),mode:this.db.mode} as unknown as Database;
   return activityContext.run({actor:a,projectId:id},()=>fn(tx,r,new BillingService(scopedDb)));
  });
 }
 private async scopedRecord(tx:Sql,table:'cotizaciones'|'contratos',pid:string,id:string){
  parse(uuid,id);const r=(await tx.query('SELECT datos FROM '+table+' WHERE id=$1 AND equipo_proyecto_id=$2 FOR UPDATE',[id,pid])).rows[0];
  if(!r)throw new NotFoundException('Documento no disponible.');return r.datos;
 }
 async members(a:Account){
  this.owner(a);
  return (await this.db.query("SELECT id,nombre,correo,rol,activo FROM usuarios WHERE rol='subadmin' ORDER BY nombre")).rows.map(r=>({id:r.id,name:r.nombre,email:r.correo,role:r.rol,active:r.activo}));
 }
 async createMember(a:Account,body:unknown){
  this.owner(a);const input=parse(credentials,body),hash=await hashPassword(input.password),id=randomUUID();
  return this.db.transaction(async tx=>{
   await this.actor(tx,a);
   try{await tx.query("INSERT INTO usuarios(id,nombre,correo,password_hash,rol) VALUES($1,$2,$3,$4,'subadmin')",[id,input.name,input.email,hash]);}
   catch(e:any){if(e.code==='23505')throw new ConflictException('Ese correo ya tiene una cuenta.');throw e;}
   await this.billing.audit(tx,'subadministrador_creado',id,{name:input.name});
   return {id,name:input.name,email:input.email,role:'subadmin',active:true};
  });
 }
 async memberStatus(a:Account,id:string,body:unknown){
  this.owner(a);parse(uuid,id);const {active}=parse(z.object({active:z.boolean()}).strict(),body);
  return this.db.transaction(async tx=>{
   await this.actor(tx,a);
   const r=(await tx.query("UPDATE usuarios SET activo=$2 WHERE id=$1 AND rol='subadmin' RETURNING id",[id,active])).rows[0];
   if(!r)throw new NotFoundException('Subadministrador no encontrado.');
   if(!active)await tx.query('DELETE FROM sesiones WHERE usuario_id=$1',[id]);
   await this.billing.audit(tx,active?'subadministrador_activado':'subadministrador_desactivado',id,{active});
   return {id,active};
  });
 }
 async history(a:Account,cursor?:string,pid?:string){
  const params:unknown[]=[],clauses:string[]=[];
  if(a.role!=='admin'){params.push(a.id);clauses.push('p.responsable_id=$'+params.length);}
  if(pid){parse(uuid,pid);params.push(pid);clauses.push('a.equipo_proyecto_id=$'+params.length);}
  if(cursor){
   const input=parse(z.tuple([z.iso.datetime(),uuid]),cursor.split('|'));
   params.push(input[0],input[1]);clauses.push('(a.created_at,a.id)<($'+(params.length-1)+'::timestamptz,$'+params.length+'::uuid)');
  }
  const read=async(tx:Sql)=>{
   const rows=await tx.query('SELECT '+activityFields+' FROM auditoria a LEFT JOIN equipo_proyectos p ON p.id=a.equipo_proyecto_id '+(clauses.length?'WHERE '+clauses.join(' AND '):'')+' ORDER BY a.created_at DESC,a.id DESC LIMIT 150',params);
   return rows.rows.map(event);
  };
  if(pid)return this.scoped(a,pid,async tx=>read(tx));
  return read(this.db);
 }
 async dashboard(a:Account){
  const rows=await this.db.query('SELECT p.*,u.nombre responsable_nombre FROM equipo_proyectos p LEFT JOIN usuarios u ON u.id=p.responsable_id '+(a.role==='admin'?'':'WHERE p.responsable_id=$1 ')+'ORDER BY p.updated_at DESC',a.role==='admin'?[]:[a.id]);
  const unassigned=a.role==='admin'?(await this.db.query('SELECT s.id,s.numero,s.respuestas,s.estado FROM solicitudes_cotizacion s WHERE NOT EXISTS(SELECT 1 FROM equipo_proyectos p WHERE p.solicitud_id=s.id) ORDER BY s.created_at DESC')).rows.map(r=>({id:r.id,number:r.numero,title:r.respuestas.businessName||r.respuestas.offering,status:r.estado})):[];
  const activity=await this.db.query('SELECT '+activityFields+' FROM auditoria a '+(a.role==='admin'?'':'JOIN equipo_proyectos p ON p.id=a.equipo_proyecto_id WHERE p.responsable_id=$1 ')+'ORDER BY a.created_at DESC,a.id DESC LIMIT 150',a.role==='admin'?[]:[a.id]);
  return {projects:rows.rows.map(project),unassignedRequests:unassigned,members:a.role==='admin'?await this.members(a):[],activity:activity.rows.map(event)};
 }
 async assignRequest(a:Account,body:unknown){
  this.owner(a);const input=parse(z.object({requestId:uuid,assigneeId:uuid.nullable()}).strict(),body);
  return this.db.transaction(async tx=>{
   await this.actor(tx,a);await this.assignee(tx,input.assigneeId);
   const request=(await tx.query('SELECT * FROM solicitudes_cotizacion WHERE id=$1 FOR UPDATE',[input.requestId])).rows[0];
   if(!request)throw new NotFoundException('Solicitud no encontrada.');
   if((await tx.query('SELECT id FROM equipo_proyectos WHERE solicitud_id=$1',[input.requestId])).rows.length)throw new ConflictException('Esta solicitud ya tiene un proyecto. Actualiza el equipo.');
   const id=randomUUID();
   const r=(await tx.query('INSERT INTO equipo_proyectos(id,solicitud_id,cliente_id,titulo,responsable_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,input.requestId,request.cliente_id,request.respuestas.businessName||request.respuestas.offering||'Nuevo proyecto',input.assigneeId])).rows[0];
   await activityContext.run({actor:a,projectId:id},()=>this.billing.audit(tx,'proyecto_asignado',id,{assigneeId:input.assigneeId}));
   return project(r);
  });
 }
 async assign(a:Account,id:string,body:unknown){
  this.owner(a);const input=parse(assignment,body);
  return this.scoped(a,id,async(tx,r,b)=>{
   if(r.revision!==input.revision)throw new ConflictException('El proyecto cambió. Actualiza antes de reasignar.');
   await this.assignee(tx,input.assigneeId);
   const next=(await tx.query('UPDATE equipo_proyectos SET responsable_id=$2,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[id,input.assigneeId])).rows[0];
   await b.audit(tx,'responsable_asignado',id,{before:r.responsable_id,after:input.assigneeId});return project(next);
  });
 }
 async progress(a:Account,id:string,body:unknown){
  const input=parse(z.object({status:z.enum(['pending','working','review','completed']),revision:z.number().int().positive()}).strict(),body);
  return this.scoped(a,id,async(tx,r,b)=>{
   if(r.revision!==input.revision)throw new ConflictException('El proyecto cambió. Actualiza antes de continuar.');
   const next=(await tx.query('UPDATE equipo_proyectos SET estado=$2,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[id,input.status])).rows[0];
   await b.audit(tx,'avance_proyecto',id,{before:r.estado,after:input.status});return project(next);
  });
 }
 async detail(a:Account,id:string){
  return this.scoped(a,id,async(tx,r,b)=>{
   const [client,quotes,contracts,request,activity,settings]=await Promise.all([
    tx.query('SELECT datos FROM clientes WHERE id=$1',[r.cliente_id]),
    tx.query('SELECT datos FROM cotizaciones WHERE equipo_proyecto_id=$1 ORDER BY created_at DESC',[id]),
    tx.query('SELECT datos FROM contratos WHERE equipo_proyecto_id=$1 ORDER BY created_at DESC',[id]),
    tx.query(quoteRequestSelect+' WHERE s.id=$1',[r.solicitud_id]),
    tx.query('SELECT '+activityFields+' FROM auditoria a WHERE equipo_proyecto_id=$1 ORDER BY a.created_at DESC,a.id DESC LIMIT 150',[id]),b.settings()
   ]);
   return {project:project(r),request:request.rows[0]?exposeQuoteRequest(request.rows[0]):null,
    data:{clients:client.rows.map(c=>c.datos),quotes:quotes.rows.map(q=>q.datos),contracts:contracts.rows.map(c=>c.datos),installments:[],payments:[],issuer:settings.issuer,rates:settings.rates,mode:this.db.mode,summary:{activeContracts:0,collectedCents:0,outstandingCents:0,overdueCents:0}},activity:activity.rows.map(event)};
  });
 }
 async quote(a:Account,pid:string,body:unknown,id?:string){
  const input=parse(quoteDto.extend({expectedVersion:z.number().int().positive().optional()}),body);
  if(input.legacyId)throw new BadRequestException('No se admiten referencias de importación en este espacio.');
  return this.scoped(a,pid,async(tx,r,b)=>{
   if(!r.cliente_id)throw new BadRequestException('Vincula primero una cuenta de cliente a esta solicitud.');
   if(input.clientId!==r.cliente_id)throw new ForbiddenException('El cliente no corresponde a este proyecto.');
   if(id){const old=await this.scopedRecord(tx,'cotizaciones',pid,id);if(input.expectedVersion!==old.version)throw new ConflictException('La cotización cambió. Actualiza antes de editar.');}
   const {expectedVersion,...values}=input;
   const q=await b.createQuote({...values,isDemo:false},id);
   await tx.query('UPDATE cotizaciones SET equipo_proyecto_id=$2 WHERE id=$1',[q.id,pid]);await tx.query('UPDATE equipo_proyectos SET updated_at=now() WHERE id=$1',[pid]);return q;
  });
 }
 async contract(a:Account,pid:string,body:unknown,id?:string){
  const input=parse(contractDto,body);
  return this.scoped(a,pid,async(tx,r,b)=>{
   if(!r.cliente_id)throw new BadRequestException('Vincula primero una cuenta de cliente a esta solicitud.');
   if(input.clientId!==r.cliente_id)throw new ForbiddenException('El cliente no corresponde a este proyecto.');
   if(input.quoteId)await this.scopedRecord(tx,'cotizaciones',pid,input.quoteId);
   if(input.sourceQuoteId)await this.scopedRecord(tx,'cotizaciones',pid,input.sourceQuoteId);
   if(input.sourceRequestId&&input.sourceRequestId!==r.solicitud_id)throw new ForbiddenException('La solicitud no corresponde a este proyecto.');
   if(id){const old=await this.scopedRecord(tx,'contratos',pid,id);if(input.projectId&&input.projectId!==old.projectId)throw new ForbiddenException('No cambies el proyecto del contrato.');}
   else if(input.projectId)throw new ForbiddenException('El proyecto del contrato se crea en el servidor.');
   const c=await b.createContract({...input,isDemo:false},id);
   await tx.query('UPDATE contratos SET equipo_proyecto_id=$2 WHERE id=$1',[c.id,pid]);await tx.query('UPDATE equipo_proyectos SET updated_at=now() WHERE id=$1',[pid]);return c;
  });
 }
 async convert(a:Account,pid:string,id:string){
  return this.scoped(a,pid,async(tx,_r,b)=>{
   if(!_r.cliente_id)throw new BadRequestException('Vincula primero una cuenta de cliente a esta solicitud.');
   await this.scopedRecord(tx,'cotizaciones',pid,id);const c=await b.convert(id);
   await tx.query('UPDATE contratos SET equipo_proyecto_id=$2 WHERE id=$1',[c.id,pid]);await tx.query('UPDATE equipo_proyectos SET updated_at=now() WHERE id=$1',[pid]);return c;
  });
 }
 async contractStatus(a:Account,pid:string,id:string,body:unknown){
  return this.scoped(a,pid,async(tx,_r,b)=>{
   if(!_r.cliente_id)throw new BadRequestException('Vincula primero una cuenta de cliente a esta solicitud.');
   const before=await this.scopedRecord(tx,'contratos',pid,id),next=await b.status(id,body);
   await b.audit(tx,'revision_estado_contrato',id,{before,after:next});return next;
  });
 }
 async analyze(a:Account,pid:string,req:Request,res:Response,body:unknown){
  const input=parse(aiAdminRequestSchema,body);
  if(input.version!==1)throw new NotFoundException('Versión no disponible.');
  const detail=await this.detail(a,pid);
  if(!detail.request)throw new NotFoundException('Solicitud no disponible.');
  return this.ai.analyze(req,createQuoteProject(detail.request.values,detail.request.id),res);
 }
 async analyzeFormal(a:Account,pid:string,id:string,req:Request,res:Response,body:unknown){
  const input=parse(aiAdminRequestSchema,body),detail=await this.detail(a,pid);
  const quote=detail.data.quotes.find(q=>q.id===id);
  if(!quote)throw new NotFoundException('Cotización no disponible en este proyecto.');
  if(quote.version!==input.version)throw new ConflictException('La cotización cambió. Actualiza antes de solicitar el análisis.');
  return this.ai.analyze(req,projectFromFormalQuote(quote),res,formalQuoteContext(quote));
 }
 async document(a:Account,pid:string,kind:'quotes'|'contracts',id:string,res:Response){
  return this.scoped(a,pid,async(tx,_r,b)=>{
   await this.scopedRecord(tx,kind==='quotes'?'cotizaciones':'contratos',pid,id);
   const doc=await new PdfService(b.db,b).document(kind==='quotes'?'quote':'contract',id);
   res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+doc.filename+'"','Cache-Control':'no-store'}).send(doc.bytes);
  });
 }
}
@Controller('api/team')
@UseGuards(TeamGuard)
class TeamController {
 constructor(@Inject(TeamService)private service:TeamService){}
 @Get('activity') history(@Req()r:ActorRequest,@Query('cursor')cursor?:string,@Query('projectId')pid?:string){return this.service.history(r.account,cursor,pid);}
 @Get('dashboard') dashboard(@Req()r:ActorRequest){return this.service.dashboard(r.account);}
 @Post('members') @UseGuards(AdminGuard) create(@Req()r:ActorRequest,@Body()b:unknown){return this.service.createMember(r.account,b);}
 @Patch('members/:id') @UseGuards(AdminGuard) active(@Req()r:ActorRequest,@Param('id')id:string,@Body()b:unknown){return this.service.memberStatus(r.account,id,b);}
 @Post('projects') @UseGuards(AdminGuard) assign(@Req()r:ActorRequest,@Body()b:unknown){return this.service.assignRequest(r.account,b);}
 @Get('projects/:id') detail(@Req()r:ActorRequest,@Param('id')id:string){return this.service.detail(r.account,id);}
 @Patch('projects/:id/assignment') @UseGuards(AdminGuard) reassign(@Req()r:ActorRequest,@Param('id')id:string,@Body()b:unknown){return this.service.assign(r.account,id,b);}
 @Patch('projects/:id/progress') progress(@Req()r:ActorRequest,@Param('id')id:string,@Body()b:unknown){return this.service.progress(r.account,id,b);}
 @Post('projects/:pid/quotes') quote(@Req()r:ActorRequest,@Param('pid')pid:string,@Body()b:unknown){return this.service.quote(r.account,pid,b);}
 @Patch('projects/:pid/quotes/:id') editQuote(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Body()b:unknown){return this.service.quote(r.account,pid,b,id);}
 @Post('projects/:pid/contracts') contract(@Req()r:ActorRequest,@Param('pid')pid:string,@Body()b:unknown){return this.service.contract(r.account,pid,b);}
 @Patch('projects/:pid/contracts/:id') editContract(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Body()b:unknown){return this.service.contract(r.account,pid,b,id);}
 @Post('projects/:pid/quotes/:id/contract') convert(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string){return this.service.convert(r.account,pid,id);}
 @Post('projects/:pid/contracts/:id/status') status(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Body()b:unknown){return this.service.contractStatus(r.account,pid,id,b);}
 @Post('projects/:pid/analyze') analyze(@Req()r:ActorRequest,@Param('pid')pid:string,@Body()b:unknown,@Res({passthrough:true})res:Response){return this.service.analyze(r.account,pid,r,res,b);}
 @Post('projects/:pid/quotes/:id/analyze') analyzeFormal(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Body()b:unknown,@Res({passthrough:true})res:Response){return this.service.analyzeFormal(r.account,pid,id,r,res,b);}
 @Get('projects/:pid/quotes/:id/pdf') quotePdf(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Res()res:Response){return this.service.document(r.account,pid,'quotes',id,res);}
 @Get('projects/:pid/contracts/:id/pdf') contractPdf(@Req()r:ActorRequest,@Param('pid')pid:string,@Param('id')id:string,@Res()res:Response){return this.service.document(r.account,pid,'contracts',id,res);}
}
@Module({imports:[DatabaseModule,AuthModule,BillingModule,DocumentsModule,QuoteAiModule],providers:[TeamService],controllers:[TeamController]})
export class TeamModule {}
