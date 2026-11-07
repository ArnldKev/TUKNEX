import { Body, BadRequestException, ConflictException, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Sql } from '../database/database';
import { SessionGuard, AdminGuard, TeamGuard, type Account } from '../auth/auth';
import { activityContext } from '../auth/activity-context';
import { VerificationService } from '../auth/verification';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { BillingService } from '../billing/billing.service';
import { parse } from '../billing/dto';
import { DocumentsModule } from '../documents/documents.module';
import { PdfService } from '../documents/pdf.service';
import { quoteFormSchema } from '../domain/quote/form';
import { estimateQuote, PROJECT_TYPES } from '../domain/pricing';
import { assertActiveStaff, lockTeamProject } from '../team/access';

type AccountRequest = Request & { account: Account };
const uuid = z.uuid();
const requestSchema = z.object({ values: quoteFormSchema, idempotencyKey: uuid }).strict();
const statusSchema = z.object({ status: z.enum(['pending','reviewing','quoted','closed']) }).strict();
const pdfQuerySchema=z.object({preview:z.literal('current').optional()}).strict();
const clientLinkSchema = z.object({clientUserId:uuid,revision:z.number().int().positive()}).strict();
export const quoteRequestSelect = `SELECT s.id,s.numero,s.usuario_id,s.cliente_id,s.creado_por_id,s.revision,s.vinculada_at,s.vinculada_por_id,
 s.clave_idempotencia,s.entrada_hash,s.respuestas,s.estimacion,s.estado,s.created_at,s.updated_at,
 author.nombre AS autor_nombre,author.rol AS autor_rol,recipient.nombre AS cliente_nombre,recipient.correo AS cliente_correo,
 p.id AS equipo_id,p.responsable_id,responsible.nombre AS responsable_nombre
 FROM solicitudes_cotizacion s LEFT JOIN usuarios author ON author.id=s.creado_por_id
 LEFT JOIN usuarios recipient ON recipient.id=s.usuario_id
 LEFT JOIN equipo_proyectos p ON p.solicitud_id=s.id LEFT JOIN usuarios responsible ON responsible.id=p.responsable_id`;
export function exposeQuoteRequest(row: Record<string, any>) {
  return { id: row.id, number: row.numero, userId: row.usuario_id, clientId: row.cliente_id,
    values: row.respuestas, result: row.estimacion, status: row.estado,
    createdById:row.creado_por_id,createdByName:row.autor_nombre||null,createdByRole:row.autor_rol||null,
    clientName:row.cliente_nombre||null,clientEmail:row.cliente_correo||null,clientLinked:!!(row.usuario_id&&row.cliente_id),
    teamProjectId:row.equipo_id||null,assigneeId:row.responsable_id||null,assigneeName:row.responsable_nombre||null,
    revision:row.revision,linkedAt:row.vinculada_at?new Date(row.vinculada_at).toISOString():null,linkedById:row.vinculada_por_id||null,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
@Injectable()
export class QuoteRequestsService {
  constructor(@Inject(Database) private db: Database, @Inject(BillingService) private billing: BillingService, @Inject(PdfService) private pdf: PdfService, @Inject(VerificationService) private verification:VerificationService) {}
  private async row(tx:Sql,id:string){
    const row=(await tx.query(quoteRequestSelect+' WHERE s.id=$1',[id])).rows[0];
    if(!row)throw new NotFoundException('Solicitud no encontrada.');return row;
  }
  private async staffRow(tx:Sql,actor:Account,id:string){
    parse(uuid,id);
    const projectId=(await tx.query('SELECT id FROM equipo_proyectos WHERE solicitud_id=$1',[id])).rows[0]?.id;
    const project=projectId?await lockTeamProject(tx,actor,projectId):null;
    if(!project){
      if(actor.role!=='admin')throw new NotFoundException('Solicitud no disponible.');
      await assertActiveStaff(tx,actor);
    }
    const locked=(await tx.query('SELECT id FROM solicitudes_cotizacion WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!locked)throw new NotFoundException('Solicitud no disponible.');
    return {request:await this.row(tx,id),project};
  }
  async list(actor: Account) {
    const result=actor.role==='admin'
      ?await this.db.query(quoteRequestSelect+' ORDER BY s.created_at DESC')
      :await this.db.query(quoteRequestSelect+' WHERE s.usuario_id=$1 AND s.cliente_id=$2 ORDER BY s.created_at DESC',[actor.id,actor.clientId]);
    return result.rows.map(exposeQuoteRequest);
  }
  async listStaff(actor:Account){
    return (await this.db.query(quoteRequestSelect+(actor.role==='admin'?'':' WHERE p.responsable_id=$1')+' ORDER BY s.created_at DESC',actor.role==='admin'?[]:[actor.id])).rows.map(exposeQuoteRequest);
  }
  async detailStaff(actor:Account,id:string){
    return this.db.transaction(async tx=>exposeQuoteRequest((await this.staffRow(tx,actor,id)).request));
  }
  async clientAccounts(actor:Account,query:unknown){
    const input=parse(z.object({search:z.string().trim().max(254).optional(),email:z.string().trim().toLowerCase().pipe(z.email().max(254)).optional()}).strict().refine(value=>!(value.search!==undefined&&value.email!==undefined),'Usa una sola búsqueda.'),query);
    const term=(input.search||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
    // A bounded directory for the assignment selector: only active registered client accounts.
    return this.db.transaction(async tx=>{
      await assertActiveStaff(tx,actor);
      const document="COALESCE(NULLIF(u.dni,''),NULLIF(c.documento,''),NULLIF(c.datos->>'taxId',''))";
      const searchable="translate(lower(concat_ws(' ',u.nombre,c.nombre,u.correo,"+document+")),'áéíóúüñ','aeiouun')";
      const filter=input.email!==undefined?'lower(u.correo)=$1':term?'position($1 in '+searchable+')>0':'true';
      const rows=(await tx.query("SELECT u.id,u.cliente_id,u.nombre,u.correo,"+document+" AS dni FROM usuarios u JOIN clientes c ON c.id=u.cliente_id WHERE u.rol='client' AND u.activo=true AND "+filter+" ORDER BY lower(u.nombre),u.id LIMIT 50",input.email!==undefined?[input.email]:term?[term]:[])).rows;
      return rows.map(row=>({userId:row.id,clientId:row.cliente_id,name:row.nombre,email:row.correo,...(input.email===undefined?{dni:row.dni||null}:{})}));
    });
  }
  async create(actor: Account, body: unknown) {
    if(actor.role!=='client'||!actor.clientId)throw new ForbiddenException('Usa una cuenta de cliente para guardar tu cotización.');
    return this.save(actor,body,false);
  }
  async createStaff(actor:Account,body:unknown){
    if(!['admin','subadmin'].includes(actor.role))throw new ForbiddenException('Usa una cuenta del equipo.');
    return this.save(actor,body,true);
  }
  private async save(actor:Account,body:unknown,staff:boolean){
    const input=parse(requestSchema,body);
    // A staff member is the author, never the prospect's identity or consent authority.
    const values=staff?input.values:{...input.values,name:input.values.name||actor.name,email:input.values.email||actor.email};
    const hash=createHash('sha256').update(JSON.stringify(values)).digest('hex');
    const existing=(await this.db.query(quoteRequestSelect+' WHERE s.creado_por_id=$1 AND s.clave_idempotencia=$2',[actor.id,input.idempotencyKey])).rows[0];
    if(existing){
      if(existing.entrada_hash!==hash)throw new ConflictException('Esta solicitud ya se guardó con otras respuestas. Prepara una nueva cotización.');
      return staff?this.detailStaff(actor,existing.id):exposeQuoteRequest(existing);
    }
    if(!staff)await this.verification.assertReady(actor.id);
    const settings=await this.billing.settings(),estimate=estimateQuote(values,settings.prices||{});
    const result={...estimate,category:values.projectType,label:PROJECT_TYPES.find(p=>p.id===values.projectType)?.name||'Proyecto web',currency:'PEN',version:'3.0',validUntil:new Date(Date.now()+estimate.validityDays*86400000).toISOString()};
    return this.db.transaction(async tx=>{
      if(staff)await assertActiveStaff(tx,actor);
      else{
        const current=(await tx.query('SELECT rol,activo,cliente_id FROM usuarios WHERE id=$1 FOR UPDATE',[actor.id])).rows[0];
        if(!current?.activo||current.rol!=='client'||current.cliente_id!==actor.clientId)throw new ForbiddenException('La cuenta ya no puede guardar esta solicitud.');
      }
      const repeated=(await tx.query(quoteRequestSelect+' WHERE s.creado_por_id=$1 AND s.clave_idempotencia=$2',[actor.id,input.idempotencyKey])).rows[0];
      if(repeated){
        if(repeated.entrada_hash!==hash)throw new ConflictException('La clave de esta solicitud corresponde a otras respuestas.');
        // Actor is already locked: use a committed scope snapshot, never reverse project -> actor lock order.
        if(staff&&actor.role!=='admin'&&repeated.responsable_id!==actor.id)throw new NotFoundException('Solicitud no disponible.');
        return exposeQuoteRequest(repeated);
      }
      const number=await this.billing.number(tx,'TK-S');
      const document=await this.pdf.preliminary({values,mode:'cash',count:1,expectedMinCents:Math.round(estimate.min*100)},number,settings);
      const inserted=await tx.query(`INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,creado_por_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(creado_por_id,clave_idempotencia) DO NOTHING RETURNING id`,
        [randomUUID(),number,staff?null:actor.id,staff?null:actor.clientId,actor.id,input.idempotencyKey,hash,JSON.stringify(values),JSON.stringify(result),document.bytes]);
      const saved=inserted.rows[0]?(await this.row(tx,inserted.rows[0].id)):(await tx.query(quoteRequestSelect+' WHERE s.creado_por_id=$1 AND s.clave_idempotencia=$2',[actor.id,input.idempotencyKey])).rows[0];
      if(!saved||saved.entrada_hash!==hash)throw new ConflictException('La clave de esta solicitud corresponde a otras respuestas.');
      if(!inserted.rows.length){
        if(staff&&actor.role!=='admin'&&saved.responsable_id!==actor.id)throw new NotFoundException('Solicitud no disponible.');
        return exposeQuoteRequest(saved);
      }
      let projectId:string|undefined;
      if(staff){
        projectId=randomUUID();
        await tx.query('INSERT INTO equipo_proyectos(id,solicitud_id,cliente_id,titulo,responsable_id) VALUES($1,$2,NULL,$3,$4)',[projectId,saved.id,values.businessName||values.offering||'Nuevo proyecto',actor.role==='subadmin'?actor.id:null]);
      }
      await activityContext.run({actor,projectId},()=>this.billing.audit(tx,staff?'solicitud_equipo_creada':'solicitud_cotizacion_guardada',saved.id,{userId:staff?null:actor.id,clientId:staff?null:actor.clientId,createdById:actor.id,assigneeId:staff&&actor.role==='subadmin'?actor.id:null}));
      return exposeQuoteRequest(await this.row(tx,saved.id));
    });
  }
  async update(actor:Account,id:string,body:unknown){
    parse(uuid,id);const {status}=parse(statusSchema,body);
    return this.db.transaction(async tx=>{
      const {request,project}=await this.staffRow(tx,actor,id);
      if(request.estado===status)return exposeQuoteRequest(request);
      await tx.query('UPDATE solicitudes_cotizacion SET estado=$2,revision=revision+1,updated_at=now() WHERE id=$1',[id,status]);
      await activityContext.run({actor,projectId:project?.id},()=>this.billing.audit(tx,'seguimiento_solicitud',id,{status,before:request.estado,after:status}));
      return exposeQuoteRequest(await this.row(tx,id));
    });
  }
  async linkClient(actor:Account,id:string,body:unknown){
    parse(uuid,id);const input=parse(clientLinkSchema,body);
    return this.db.transaction(async tx=>{
      const {request,project}=await this.staffRow(tx,actor,id);
      if(request.usuario_id){
        if(request.usuario_id===input.clientUserId)return exposeQuoteRequest(request);
        throw new ConflictException('Esta solicitud ya está vinculada a una cuenta. No se transfiere a otro cliente.');
      }
      if(request.revision!==input.revision)throw new ConflictException('La solicitud cambió. Actualiza antes de vincular al cliente.');
      if(!project||project.cliente_id)throw new ConflictException('El proyecto no está disponible para esta vinculación.');
      const target=(await tx.query("SELECT u.id,u.cliente_id,u.nombre,u.correo FROM usuarios u JOIN clientes c ON c.id=u.cliente_id WHERE u.id=$1 AND u.rol='client' AND u.activo=true FOR UPDATE OF u,c",[input.clientUserId])).rows[0];
      if(!target)throw new BadRequestException('Selecciona una cuenta de cliente registrada y activa.');
      const documents=await tx.query('SELECT id FROM cotizaciones WHERE equipo_proyecto_id=$1 UNION ALL SELECT id FROM contratos WHERE equipo_proyecto_id=$1 LIMIT 1',[project.id]);
      if(documents.rows.length)throw new ConflictException('El proyecto ya tiene documentos. No se cambia su titularidad.');
      await tx.query('UPDATE solicitudes_cotizacion SET usuario_id=$2,cliente_id=$3,vinculada_at=now(),vinculada_por_id=$4,revision=revision+1,updated_at=now() WHERE id=$1',[id,target.id,target.cliente_id,actor.id]);
      await tx.query('UPDATE equipo_proyectos SET cliente_id=$2,revision=revision+1,updated_at=now() WHERE id=$1',[project.id,target.cliente_id]);
      await activityContext.run({actor,projectId:project.id},()=>this.billing.audit(tx,'solicitud_cliente_vinculado',id,{createdById:request.creado_por_id,before:{userId:null,clientId:null},after:{userId:target.id,clientId:target.cliente_id},revision:request.revision+1}));
      return exposeQuoteRequest(await this.row(tx,id));
    });
  }
  private async sendPdf(res:Response,row:Record<string,any>,current=false){
    const document=current?await this.pdf.savedPreliminary(row.respuestas,row.estimacion,row.numero,row.created_at):{bytes:Buffer.from(row.pdf),filename:row.numero+'.pdf'};
    const filename=current?row.numero+'-boceto.pdf':document.filename;
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'no-store'}).send(document.bytes);
  }
  async download(actor:Account,id:string,res:Response,query:unknown={}){
    parse(uuid,id);const {preview}=parse(pdfQuerySchema,query);
    const found=actor.role==='admin'
      ?await this.db.query('SELECT numero,pdf,respuestas,estimacion,created_at FROM solicitudes_cotizacion WHERE id=$1',[id])
      :await this.db.query('SELECT numero,pdf,respuestas,estimacion,created_at FROM solicitudes_cotizacion WHERE id=$1 AND usuario_id=$2 AND cliente_id=$3',[id,actor.id,actor.clientId]);
    if(!found.rows[0])throw new NotFoundException('Solicitud no encontrada.');return this.sendPdf(res,found.rows[0],preview==='current');
  }
  async downloadStaff(actor:Account,id:string,res:Response,query:unknown={}){
    const {preview}=parse(pdfQuerySchema,query);
    const document=await this.db.transaction(async tx=>{
      await this.staffRow(tx,actor,id);return(await tx.query('SELECT numero,pdf,respuestas,estimacion,created_at FROM solicitudes_cotizacion WHERE id=$1',[id])).rows[0];
    });return this.sendPdf(res,document,preview==='current');
  }
}
@Controller('api/account/quote-requests')
@UseGuards(SessionGuard)
class ClientQuoteRequestsController {
  constructor(@Inject(QuoteRequestsService) private requests:QuoteRequestsService){}
  @Get() list(@Req() req:AccountRequest){return this.requests.list(req.account);}
  @Post() create(@Req() req:AccountRequest,@Body() body:unknown){return this.requests.create(req.account,body);}
  @Get(':id/pdf') pdf(@Req() req:AccountRequest,@Param('id') id:string,@Res() res:Response,@Query() query:unknown){return this.requests.download(req.account,id,res,query);}
}
@Controller('api/billing/quote-requests')
@UseGuards(AdminGuard)
class AdminQuoteRequestsController {
  constructor(@Inject(QuoteRequestsService) private requests:QuoteRequestsService){}
  @Get() list(@Req() req:AccountRequest){return this.requests.list(req.account);}
  @Patch(':id') update(@Req() req:AccountRequest,@Param('id') id:string,@Body() body:unknown){return this.requests.update(req.account,id,body);}
  @Get(':id/pdf') pdf(@Req() req:AccountRequest,@Param('id') id:string,@Res() res:Response,@Query() query:unknown){return this.requests.download(req.account,id,res,query);}
}
@Controller('api/team')
@UseGuards(TeamGuard)
class StaffQuoteRequestsController {
  constructor(@Inject(QuoteRequestsService) private requests:QuoteRequestsService){}
  @Get('client-accounts') clients(@Req() req:AccountRequest,@Query() query:unknown){return this.requests.clientAccounts(req.account,query);}
  @Get('quote-requests') list(@Req() req:AccountRequest){return this.requests.listStaff(req.account);}
  @Post('quote-requests') create(@Req() req:AccountRequest,@Body() body:unknown){return this.requests.createStaff(req.account,body);}
  @Get('quote-requests/:id') detail(@Req() req:AccountRequest,@Param('id') id:string){return this.requests.detailStaff(req.account,id);}
  @Patch('quote-requests/:id') update(@Req() req:AccountRequest,@Param('id') id:string,@Body() body:unknown){return this.requests.update(req.account,id,body);}
  @Patch('quote-requests/:id/client') link(@Req() req:AccountRequest,@Param('id') id:string,@Body() body:unknown){return this.requests.linkClient(req.account,id,body);}
  @Get('quote-requests/:id/pdf') pdf(@Req() req:AccountRequest,@Param('id') id:string,@Res() res:Response,@Query() query:unknown){return this.requests.downloadStaff(req.account,id,res,query);}
}
@Module({imports:[AuthModule,BillingModule,DocumentsModule],providers:[QuoteRequestsService],controllers:[ClientQuoteRequestsController,AdminQuoteRequestsController,StaffQuoteRequestsController],exports:[QuoteRequestsService]})
export class QuoteRequestsModule{}
