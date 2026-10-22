import { Body, ConflictException, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database } from '../database/database';
import { SessionGuard, AdminGuard, type Account } from '../auth/auth';
import { VerificationService } from '../auth/verification';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { BillingService } from '../billing/billing.service';
import { parse } from '../billing/dto';
import { DocumentsModule } from '../documents/documents.module';
import { PdfService } from '../documents/pdf.service';
import { quoteFormSchema } from '../domain/quote/form';
import { estimateQuote, PROJECT_TYPES } from '../domain/pricing';

type AccountRequest = Request & { account: Account };
const uuid = z.uuid();
const requestSchema = z.object({ values: quoteFormSchema, idempotencyKey: uuid }).strict();
const statusSchema = z.object({ status: z.enum(['pending','reviewing','quoted','closed']) }).strict();
function expose(row: Record<string, any>) {
  return { id: row.id, number: row.numero, userId: row.usuario_id, clientId: row.cliente_id,
    values: row.respuestas, result: row.estimacion, status: row.estado,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
@Injectable()
export class QuoteRequestsService {
  constructor(@Inject(Database) private db: Database, @Inject(BillingService) private billing: BillingService, @Inject(PdfService) private pdf: PdfService, @Inject(VerificationService) private verification:VerificationService) {}
  async list(actor: Account) {
    const result = actor.role === 'admin'
      ? await this.db.query('SELECT id,numero,usuario_id,cliente_id,respuestas,estimacion,estado,created_at,updated_at FROM solicitudes_cotizacion ORDER BY created_at DESC')
      : await this.db.query('SELECT id,numero,usuario_id,cliente_id,respuestas,estimacion,estado,created_at,updated_at FROM solicitudes_cotizacion WHERE usuario_id=$1 AND cliente_id=$2 ORDER BY created_at DESC',[actor.id,actor.clientId]);
    return result.rows.map(expose);
  }
  async create(actor: Account, body: unknown) {
    if(actor.role !== 'client' || !actor.clientId) throw new ForbiddenException('Usa una cuenta de cliente para guardar tu cotización.');
    const input = parse(requestSchema,body);
    const values = {...input.values, name: input.values.name || actor.name, email: input.values.email || actor.email};
    const hash = createHash('sha256').update(JSON.stringify(values)).digest('hex');
    const existing = (await this.db.query('SELECT * FROM solicitudes_cotizacion WHERE usuario_id=$1 AND clave_idempotencia=$2',[actor.id,input.idempotencyKey])).rows[0];
    if(existing) {
      if(existing.entrada_hash !== hash) throw new ConflictException('Esta solicitud ya se guardó con otras respuestas. Prepara una nueva cotización.');
      return expose(existing);
    }
    await this.verification.assertReady(actor.id);
    const settings=await this.billing.settings();
    const estimate=estimateQuote(values,settings.prices || {});
    const result={...estimate, category:values.projectType, label:PROJECT_TYPES.find(p=>p.id===values.projectType)?.name || 'Proyecto web',currency:'PEN',version:'3.0',validUntil:new Date(Date.now()+estimate.validityDays*86400000).toISOString()};
    return this.db.transaction(async tx=>{
      const number=await this.billing.number(tx,'TK-S');
      const document=await this.pdf.preliminary({values,mode:'cash',count:1,expectedMinCents:Math.round(estimate.min*100)},number,settings);
      const inserted=await tx.query(`INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(usuario_id,clave_idempotencia) DO NOTHING RETURNING *`,
        [randomUUID(),number,actor.id,actor.clientId,input.idempotencyKey,hash,JSON.stringify(values),JSON.stringify(result),document.bytes]);
      const saved=inserted.rows[0] || (await tx.query('SELECT * FROM solicitudes_cotizacion WHERE usuario_id=$1 AND clave_idempotencia=$2',[actor.id,input.idempotencyKey])).rows[0];
      if(saved.entrada_hash !== hash) throw new ConflictException('La clave de esta solicitud corresponde a otras respuestas.');
      if(inserted.rows.length) await this.billing.audit(tx,'solicitud_cotizacion_guardada',saved.id,{userId:actor.id,clientId:actor.clientId});
      return expose(saved);
    });
  }
  async update(id: string, body: unknown) {
    parse(uuid,id);const {status}=parse(statusSchema,body);
    const result=await this.db.query('UPDATE solicitudes_cotizacion SET estado=$2,updated_at=now() WHERE id=$1 RETURNING id,numero,usuario_id,cliente_id,respuestas,estimacion,estado,created_at,updated_at',[id,status]);
    if(!result.rows[0])throw new NotFoundException('Solicitud no encontrada.');
    return expose(result.rows[0]);
  }
  async download(actor: Account, id: string, res: Response) {
    parse(uuid,id);
    const found = actor.role==='admin'
      ? await this.db.query('SELECT numero,pdf FROM solicitudes_cotizacion WHERE id=$1',[id])
      : await this.db.query('SELECT numero,pdf FROM solicitudes_cotizacion WHERE id=$1 AND usuario_id=$2 AND cliente_id=$3',[id,actor.id,actor.clientId]);
    if(!found.rows[0])throw new NotFoundException('Solicitud no encontrada.');
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+found.rows[0].numero+'.pdf"','Cache-Control':'no-store'}).send(Buffer.from(found.rows[0].pdf));
  }
}
@Controller('api/account/quote-requests')
@UseGuards(SessionGuard)
class ClientQuoteRequestsController {
  constructor(@Inject(QuoteRequestsService) private requests: QuoteRequestsService) {}
  @Get() list(@Req() req:AccountRequest){return this.requests.list(req.account);}
  @Post() create(@Req() req:AccountRequest,@Body() body:unknown){return this.requests.create(req.account,body);}
  @Get(':id/pdf') pdf(@Req() req:AccountRequest,@Param('id') id:string,@Res() res:Response){return this.requests.download(req.account,id,res);}
}
@Controller('api/billing/quote-requests')
@UseGuards(AdminGuard)
class AdminQuoteRequestsController {
  constructor(@Inject(QuoteRequestsService) private requests: QuoteRequestsService) {}
  @Get() list(@Req() req:AccountRequest){return this.requests.list(req.account);}
  @Patch(':id') update(@Param('id') id:string,@Body() body:unknown){return this.requests.update(id,body);}
  @Get(':id/pdf') pdf(@Req() req:AccountRequest,@Param('id') id:string,@Res() res:Response){return this.requests.download(req.account,id,res);}
}
@Module({imports:[AuthModule,BillingModule,DocumentsModule],providers:[QuoteRequestsService],controllers:[ClientQuoteRequestsController,AdminQuoteRequestsController],exports:[QuoteRequestsService]})
export class QuoteRequestsModule {}
