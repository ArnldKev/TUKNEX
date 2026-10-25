import { Body, Controller, ForbiddenException, Get, Inject, Injectable, Logger, Module, NotFoundException, OnModuleDestroy, OnModuleInit, Param, Patch, Post, Query, Req, Res, ServiceUnavailableException, ConflictException, BadRequestException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Sql } from '../database/database';
import { AuthModule } from '../auth/auth.module';
import { AuthService, AdminGuard, requestToken, type Account } from '../auth/auth';
import { parse } from '../billing/dto';
import { DRAFT_POLICY_VERSION, DRAFT_MAX_BYTES, DRAFT_HISTORY_LIMIT, draftCreateSchema, draftSaveSchema, draftVersionSchema, draftContentKey, draftProgress } from '../domain/quote/drafts';
import { quoteProjectSchema } from '../domain/quote/project';

const COOKIE = 'tuknex_draft_device';
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const iso = (value: string | Date) => new Date(value).toISOString();
const deviceToken = (req: Request) => (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
function assertDraftOrigin(req: Request) {
  const allowed = (process.env.CORS_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s => s.trim());
  if (!req.headers.origin || !allowed.includes(req.headers.origin)) throw new ForbiddenException('Origen no autorizado.');
}
export function quoteDraftConfig() {
  const raw = process.env.QUOTE_DRAFTS_RETENTION_DAYS || '';
  const days = /^\d+$/.test(raw) ? Number(raw) : 0;
  return { enabled: process.env.QUOTE_DRAFTS_ENABLED === 'true' && days >= 7 && days <= 90,
    retentionDays: days >= 7 && days <= 90 ? days : null, policyVersion: DRAFT_POLICY_VERSION };
}
function summary(row: Record<string, any>) {
  const project = quoteProjectSchema.parse(row.proyecto);
  return { id: row.id, version: row.version, title: project.answers.businessName || project.answers.offering.slice(0,100) || 'Idea por definir',
    step: row.paso, progress: draftProgress(project), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    expiresAt: iso(row.expires_at), policyVersion: row.politica,
    owner: row.usuario_id ? { id: row.usuario_id, name: row.nombre, email: row.correo } : null };
}
const select = `SELECT b.*,u.nombre,u.correo,to_char(b.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at FROM cotizador_borradores b LEFT JOIN usuarios u ON u.id=b.usuario_id`;
@Injectable()
export class QuoteDraftsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: ReturnType<typeof setInterval>;
  constructor(@Inject(Database) private db: Database, @Inject(AuthService) private auth: AuthService) {}
  async cleanup() {
    await this.db.query('DELETE FROM cotizador_borradores WHERE expires_at<=now()');
    // Guest drafts expire first; delete orphan guest records before their expired device.
    await this.db.query('DELETE FROM cotizador_borradores b USING cotizador_dispositivos d WHERE b.dispositivo_id=d.id AND b.usuario_id IS NULL AND d.expires_at<=now()');
    await this.db.query('DELETE FROM cotizador_dispositivos WHERE expires_at<=now()');
  }
  async onModuleInit() {
    await this.cleanup();
    this.cleanupTimer = setInterval(() => { void this.cleanup().catch(() => Logger.warn('No se pudo ejecutar la limpieza de borradores.', 'QuoteDrafts')); }, 3600000);
    this.cleanupTimer.unref();
  }
  onModuleDestroy() { if (this.cleanupTimer) clearInterval(this.cleanupTimer); }
  private enabled() { const config=quoteDraftConfig(); if (!config.enabled) throw new ServiceUnavailableException('El guardado de borradores está pausado. Tus respuestas siguen en pantalla.'); return config.retentionDays!; }
  private validateSize(value: unknown) { if (Buffer.byteLength(JSON.stringify(value),'utf8') > DRAFT_MAX_BYTES) throw new BadRequestException('El borrador supera el tamaño permitido.'); }
  private async actor(req: Request) { return this.auth.validate(requestToken(req)); }
  private async device(req: Request, sql: Sql = this.db) {
    const token=deviceToken(req); if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return (await sql.query('SELECT id FROM cotizador_dispositivos WHERE token_hash=$1 AND expires_at>now()', [digest(token)])).rows[0]?.id || null;
  }
  private async owner(req: Request) { const [user,device]=await Promise.all([this.actor(req),this.device(req)]); return {user,device}; }
  private async owned(sql: Sql, id: string, owner: Awaited<ReturnType<QuoteDraftsService['owner']>>, lock=false) {
    parse(z.uuid(),id);
    const row=(await sql.query(select+' WHERE b.id=$1 AND b.expires_at>now()'+(lock?' FOR UPDATE OF b':''),[id])).rows[0];
    if (!row || (row.usuario_id ? row.usuario_id!==owner.user?.id : !owner.device || row.dispositivo_id!==owner.device)) throw new NotFoundException('Borrador no disponible para esta sesión.');
    return row;
  }
  private mutable(user: Account | null) { if (user?.role==='admin') throw new ForbiddenException('La administración consulta borradores; no modifica la idea original del cliente.'); }
  async list(req: Request) {
    const owner=await this.owner(req);
    if (!owner.user && !owner.device) return [];
    const rows=await this.db.query(select+' WHERE b.expires_at>now() AND (b.usuario_id=$1 OR (b.usuario_id IS NULL AND b.dispositivo_id=$2)) ORDER BY b.updated_at DESC LIMIT 15',[owner.user?.id || null,owner.device]);
    return rows.rows.map(summary);
  }
  async get(req: Request,id: string) { const row=await this.owned(this.db,id,await this.owner(req)); return {...summary(row),project:quoteProjectSchema.parse(row.proyecto)}; }
  async session(req: Request,res: Response,body: unknown) {
    assertDraftOrigin(req); this.enabled();
    parse(z.object({consent:z.literal(true),policyVersion:z.literal(DRAFT_POLICY_VERSION)}).strict(),body);
    let token=deviceToken(req),device=await this.device(req);
    if(!device) {token=randomBytes(32).toString('base64url');device=randomUUID();
      await this.db.query('INSERT INTO cotizador_dispositivos(id,token_hash,expires_at) VALUES($1,$2,$3)',[device,digest(token),new Date(Date.now()+90*86400000).toISOString()]);}
    res.cookie(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api',maxAge:90*86400000});
    return {ready:true};
  }
  async create(req: Request,res: Response,body: unknown) {
    assertDraftOrigin(req); const days=this.enabled(); this.validateSize(body); const input=parse(draftCreateSchema,body);
    const owner=await this.owner(req); this.mutable(owner.user);
    if(input.accountId!==(owner.user?.id || null)) throw new ConflictException('Tu sesión cambió. Actualiza el acceso antes de compartir.');
    if(!owner.device && !owner.user) throw new ForbiddenException('Autoriza primero este navegador para poder recuperar tu borrador.');
    let deviceId=owner.device, token=deviceToken(req);
    if (!deviceId) {
      token=randomBytes(32).toString('base64url'); deviceId=randomUUID();
      await this.db.query('INSERT INTO cotizador_dispositivos(id,token_hash,expires_at) VALUES($1,$2,$3)',[deviceId,digest(token),new Date(Date.now()+90*86400000).toISOString()]);
    }
    const result=await this.db.transaction(async tx => {
      // Serialize quota checks for the same device and the same authenticated account.
      await tx.query('SELECT id FROM cotizador_dispositivos WHERE id=$1 FOR UPDATE',[deviceId]);
      if(owner.user) await tx.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[owner.user.id]);
      const existing=(await tx.query('SELECT id FROM cotizador_borradores WHERE id=$1',[input.project.id])).rows[0];
      if(existing) {
        const row=await this.owned(tx,existing.id,{...owner,device:deviceId});
        if(row.contenido_hash!==digest(draftContentKey(input.project,input.step))) throw new ConflictException('Este borrador ya tiene otra versión. Recupéralo antes de guardar.');
        return row;
      }
      const counts=await tx.query('SELECT count(*)::integer AS count FROM cotizador_borradores WHERE expires_at>now() AND (dispositivo_id=$1 OR usuario_id=$2)',[deviceId,owner.user?.id || null]);
      if(counts.rows[0].count >= (owner.user ? 10 : 3)) throw new ConflictException('Llegaste al límite de borradores activos. Recupera o retira uno de los anteriores.');
      await tx.query('INSERT INTO cotizador_borradores(id,dispositivo_id,usuario_id,version,proyecto,paso,contenido_hash,politica,expires_at) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8)',
        [input.project.id,deviceId,owner.user?.id || null,JSON.stringify(input.project),input.step,digest(draftContentKey(input.project,input.step)),input.policyVersion,new Date(Date.now()+days*86400000).toISOString()]);
      await tx.query('INSERT INTO cotizador_revisiones(borrador_id,version,proyecto,paso) VALUES($1,1,$2,$3)',[input.project.id,JSON.stringify(input.project),input.step]);
      return (await tx.query(select+' WHERE b.id=$1',[input.project.id])).rows[0];
    });
    await this.db.query('UPDATE cotizador_dispositivos SET expires_at=$2 WHERE id=$1',[deviceId,new Date(Date.now()+90*86400000).toISOString()]);
    res.cookie(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api',maxAge:90*86400000});
    return {...summary(result),project:quoteProjectSchema.parse(result.proyecto)};
  }
  async save(req: Request,id: string,body: unknown) {
    assertDraftOrigin(req); this.enabled(); this.validateSize(body); const input=parse(draftSaveSchema,body);
    const owner=await this.owner(req); this.mutable(owner.user);
    return this.db.transaction(async tx => {
      const row=await this.owned(tx,id,owner,true);
      if(input.project.id!==row.id) throw new BadRequestException('El proyecto no corresponde a este borrador.');
      const hash=digest(draftContentKey(input.project,input.step));
      // Retrying an acknowledged write is safe even if its response was lost.
      if(row.contenido_hash===hash) return {...summary(row),project:quoteProjectSchema.parse(row.proyecto)};
      if(row.version!==input.expectedVersion) throw new ConflictException('Otra pestaña actualizó el borrador. Recupera la versión guardada antes de continuar.');
      await tx.query('UPDATE cotizador_borradores SET version=version+1,proyecto=$2,paso=$3,contenido_hash=$4,updated_at=now() WHERE id=$1',[id,JSON.stringify(input.project),input.step,hash]);
      await tx.query('INSERT INTO cotizador_revisiones(borrador_id,version,proyecto,paso) VALUES($1,$2,$3,$4)',[id,row.version+1,JSON.stringify(input.project),input.step]);
      await tx.query('DELETE FROM cotizador_revisiones WHERE borrador_id=$1 AND version<=$2',[id,row.version+1-DRAFT_HISTORY_LIMIT]);
      const saved=(await tx.query(select+' WHERE b.id=$1',[id])).rows[0];
      return {...summary(saved),project:quoteProjectSchema.parse(saved.proyecto)};
    });
  }
  async claim(req: Request,id: string,body: unknown) {
    assertDraftOrigin(req); this.enabled(); const {expectedVersion,expectedUserId}=parse(draftVersionSchema.extend({expectedUserId:z.uuid()}).strict(),body); const owner=await this.owner(req);
    if(owner.user?.id!==expectedUserId) throw new ConflictException('Tu sesión cambió. Actualiza el acceso antes de vincular.');
    if(owner.user?.role!=='client') throw new ForbiddenException('Inicia sesión con tu cuenta de cliente para vincular el borrador.');
    return this.db.transaction(async tx => {
      const row=await this.owned(tx,id,owner,true);
      if(row.usuario_id===owner.user!.id) return {...summary(row),project:quoteProjectSchema.parse(row.proyecto)};
      if(row.version!==expectedVersion) throw new ConflictException('El borrador cambió. Recupéralo antes de vincularlo.');
      await tx.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[owner.user!.id]);
      const count=(await tx.query('SELECT count(*)::integer AS count FROM cotizador_borradores WHERE usuario_id=$1 AND expires_at>now()',[owner.user!.id])).rows[0].count;
      if(count>=10) throw new ConflictException('Llegaste al límite de borradores de tu cuenta.');
      await tx.query('UPDATE cotizador_borradores SET usuario_id=$2,version=version+1,updated_at=now() WHERE id=$1',[id,owner.user!.id]);
      await tx.query('INSERT INTO cotizador_revisiones(borrador_id,version,proyecto,paso) VALUES($1,$2,$3,$4)',[id,row.version+1,JSON.stringify(row.proyecto),row.paso]);
      await tx.query('DELETE FROM cotizador_revisiones WHERE borrador_id=$1 AND version<=$2',[id,row.version+1-DRAFT_HISTORY_LIMIT]);
      const claimed=(await tx.query(select+' WHERE b.id=$1',[id])).rows[0];
      return {...summary(claimed),project:quoteProjectSchema.parse(claimed.proyecto)};
    });
  }
  async withdraw(req: Request,id: string,body: unknown) {
    assertDraftOrigin(req); const {expectedVersion}=parse(draftVersionSchema,body); const owner=await this.owner(req); this.mutable(owner.user);
    await this.db.transaction(async tx => { const row=await this.owned(tx,id,owner,true);
      if(row.version!==expectedVersion) throw new ConflictException('El borrador cambió. Recupéralo antes de retirarlo.');
      await tx.query('DELETE FROM cotizador_borradores WHERE id=$1',[id]);
    });
    return {withdrawn:true};
  }
  async adminList(cursor?: string) {
    let before: {at:string;id:string}|null=null;
    if(cursor) { try { before=z.object({at:z.iso.datetime(),id:z.uuid()}).strict().parse(JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'))); } catch {throw new BadRequestException('Página no válida.');} }
    const rows=(await this.db.query(select+' WHERE b.expires_at>now() AND ($1::timestamptz IS NULL OR (b.updated_at,b.id)<($1::timestamptz,$2::uuid)) ORDER BY b.updated_at DESC,b.id DESC LIMIT 26',[before?.at || null,before?.id || null])).rows;
    const items=rows.slice(0,25).map(summary),last=rows[24];
    return {items,nextCursor:rows.length>25&&last?Buffer.from(JSON.stringify({at:last.cursor_at,id:last.id})).toString('base64url'):null};
  }
  async adminGet(id: string) {
    parse(z.uuid(),id); const row=(await this.db.query(select+' WHERE b.id=$1 AND b.expires_at>now()',[id])).rows[0];
    if(!row) throw new NotFoundException('Borrador no disponible.');
    const revisions=(await this.db.query('SELECT version,paso,created_at FROM cotizador_revisiones WHERE borrador_id=$1 ORDER BY version DESC LIMIT 30',[id])).rows.map(r=>({version:r.version,step:r.paso,createdAt:iso(r.created_at)}));
    return {...summary(row),project:quoteProjectSchema.parse(row.proyecto),revisions};
  }
  async adminRevision(id: string,version: string) {
    parse(z.uuid(),id); const n=parse(z.coerce.number().int().min(1).max(2147483647),version);
    const row=(await this.db.query('SELECT r.* FROM cotizador_revisiones r JOIN cotizador_borradores b ON b.id=r.borrador_id WHERE b.id=$1 AND b.expires_at>now() AND r.version=$2',[id,n])).rows[0];
    if(!row) throw new NotFoundException('Revisión no disponible.');
    return {project:quoteProjectSchema.parse(row.proyecto),version:row.version,step:row.paso,createdAt:iso(row.created_at)};
  }
}
@Controller('api/quote-drafts')
class QuoteDraftsController {
  constructor(@Inject(QuoteDraftsService) private drafts: QuoteDraftsService) {}
  @Get('config') config(){return quoteDraftConfig();}
  @Get() list(@Req() req:Request){return this.drafts.list(req);}
  @Post('session') session(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.drafts.session(req,res,body);}
  @Post() create(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.drafts.create(req,res,body);}
  @Get(':id') get(@Req() req:Request,@Param('id') id:string){return this.drafts.get(req,id);}
  @Patch(':id') save(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.drafts.save(req,id,body);}
  @Post(':id/claim') claim(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.drafts.claim(req,id,body);}
  @Post(':id/withdraw') withdraw(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.drafts.withdraw(req,id,body);}
}
@Controller('api/billing/quote-drafts')
@UseGuards(AdminGuard)
class AdminDraftsController {
  constructor(@Inject(QuoteDraftsService) private drafts: QuoteDraftsService) {}
  @Get() list(@Query('cursor') cursor?:string){if(cursor&&cursor.length>200)throw new BadRequestException('Página no válida.');return this.drafts.adminList(cursor);}
  @Get(':id') get(@Param('id') id:string){return this.drafts.adminGet(id);}
  @Get(':id/versions/:version') revision(@Param('id') id:string,@Param('version') version:string){return this.drafts.adminRevision(id,version);}
}
@Module({imports:[AuthModule],providers:[QuoteDraftsService],controllers:[QuoteDraftsController,AdminDraftsController]})
export class QuoteDraftsModule {}
