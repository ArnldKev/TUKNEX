import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database } from '../database/database';
import { AdminGuard, SessionGuard, type Account } from '../auth/auth';
import { AuthModule } from '../auth/auth.module';
import { parse } from '../billing/dto';

type AccountRequest = Request & { account: Account };
const inputSchema = z.object({
  subject: z.enum(['application','service']),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(80),
  comment: z.string().trim().min(20).max(1200),
  displayName: z.string().trim().min(2).max(50),
  displayConsent: z.boolean(),
}).strict();
const moderationSchema = z.object({
  status: z.enum(['pending','published','rejected']),
  moderationNote: z.string().trim().max(500),
  businessReply: z.string().trim().max(1200),
  revision: z.number().int().positive(),
}).strict();

function publicFields(row: Record<string, any>) {
  return { id: row.id, subject: row.tema, rating: row.calificacion, title: row.titulo,
    comment: row.comentario, displayName: row.nombre_publico, businessReply: row.respuesta,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
function privateFields(row: Record<string, any>) {
  return { ...publicFields(row), status: row.estado, displayConsent: row.consentimiento,
    moderationNote: row.nota_moderacion, revision: row.revision };
}
@Injectable()
export class ReviewsService {
  constructor(@Inject(Database) private db: Database) {}
  async publicList() {
    return (await this.db.query("SELECT id,tema,calificacion,titulo,comentario,nombre_publico,respuesta,created_at,updated_at FROM opiniones WHERE estado='published' AND consentimiento=true ORDER BY updated_at DESC LIMIT 100")).rows.map(publicFields);
  }
  async own(actor: Account) {
    this.client(actor);
    return (await this.db.query('SELECT * FROM opiniones WHERE usuario_id=$1 ORDER BY created_at DESC',[actor.id])).rows.map(privateFields);
  }
  private client(actor: Account) {
    if(actor.role !== 'client') throw new ForbiddenException('Las opiniones se envían desde una cuenta de cliente.');
  }
  async save(actor: Account, body: unknown) {
    this.client(actor);
    const input = parse(inputSchema,body);
    // One opinion per subject and client. Editing always returns it to moderation.
    const row = (await this.db.query(`INSERT INTO opiniones(id,usuario_id,tema,calificacion,titulo,comentario,nombre_publico,consentimiento)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(usuario_id,tema) DO UPDATE SET calificacion=excluded.calificacion,titulo=excluded.titulo,
      comentario=excluded.comentario,nombre_publico=excluded.nombre_publico,consentimiento=excluded.consentimiento,
      estado='pending',nota_moderacion='',respuesta='',moderado_por=NULL,revision=opiniones.revision+1,updated_at=now()
      RETURNING *`,[randomUUID(),actor.id,input.subject,input.rating,input.title,input.comment,input.displayName,input.displayConsent])).rows[0];
    return privateFields(row);
  }
  async inbox() {
    return (await this.db.query('SELECT o.*,u.nombre AS account_name FROM opiniones o JOIN usuarios u ON u.id=o.usuario_id ORDER BY o.updated_at DESC LIMIT 500')).rows.map(row=>({...privateFields(row),accountName:row.account_name}));
  }
  async moderate(actor: Account, id: string, body: unknown) {
    parse(z.uuid(),id);
    const input = parse(moderationSchema,body);
    return this.db.transaction(async tx=>{
      const row=(await tx.query('SELECT * FROM opiniones WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!row)throw new NotFoundException('Opinión no encontrada.');
      if(row.revision!==input.revision)throw new ConflictException('La opinión cambió. Actualiza la lista antes de moderarla.');
      if(input.status==='published'&&!row.consentimiento)throw new BadRequestException('El cliente no autorizó publicar esta opinión.');
      const updated=(await tx.query(`UPDATE opiniones SET estado=$2,nota_moderacion=$3,respuesta=$4,moderado_por=$5,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *`,[id,input.status,input.moderationNote,input.businessReply,actor.id])).rows[0];
      return privateFields(updated);
    });
  }
}
@Controller('api/public/reviews')
class PublicReviewsController {
  constructor(@Inject(ReviewsService) private reviews: ReviewsService) {}
  @Get() list() {return this.reviews.publicList();}
}
@Controller('api/account/reviews')
@UseGuards(SessionGuard)
class ClientReviewsController {
  constructor(@Inject(ReviewsService) private reviews: ReviewsService) {}
  @Get() list(@Req() req: AccountRequest) {return this.reviews.own(req.account);}
  @Post() save(@Req() req: AccountRequest,@Body() body: unknown) {return this.reviews.save(req.account,body);}
}
@Controller('api/billing/reviews')
@UseGuards(AdminGuard)
class AdminReviewsController {
  constructor(@Inject(ReviewsService) private reviews: ReviewsService) {}
  @Get() list() {return this.reviews.inbox();}
  @Patch(':id') moderate(@Req() req: AccountRequest,@Param('id') id: string,@Body() body: unknown) {return this.reviews.moderate(req.account,id,body);}
}
@Module({imports:[AuthModule],providers:[ReviewsService],controllers:[PublicReviewsController,ClientReviewsController,AdminReviewsController]})
export class ReviewsModule {}
