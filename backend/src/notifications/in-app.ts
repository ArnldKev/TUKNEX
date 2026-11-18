import { ConflictException, Controller, Get, Inject, Injectable, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { SessionGuard, type Account } from '../auth/auth';
import { Database, type Sql } from '../database/database';
import { parse } from '../billing/dto';
import { visibleClientContract } from '../billing/contract-visibility';

interface ContractEvent {
 id: string;
 projectName: string;
 version: number;
 teamProjectId?: string | null;
}

const insertNotice = `
 INSERT INTO notificaciones_salida
 (id,evento_clave,tipo,entidad_id,proyecto_nombre,ruta,equipo_proyecto_id,destinatario_id,destinatario_rol,canal)
`;

export async function notifyContractSent(tx: Sql, event: ContractEvent & { clientId:string; recipientId:string }) {
 const key = `contract-sent:${event.id}:${event.version}`;
 const saved = await tx.query(`${insertNotice}
  SELECT $1,$2,'contract_sent',$3,$4,$5,$6,u.id,u.rol,'cuenta'
  FROM usuarios u
  WHERE u.id=$7 AND u.activo AND u.rol='client'
    AND (u.cliente_id=$8 OR EXISTS (SELECT 1 FROM cliente_cuenta_asociaciones x
      WHERE x.cliente_id=$8 AND x.usuario_id=u.id AND x.activo))
  ON CONFLICT(evento_clave,destinatario_id) DO NOTHING RETURNING id
 `, [randomUUID(), key, event.id, event.projectName.slice(0, 200),
  '/mi-cuenta/proyectos?contrato=' + event.id, event.teamProjectId || null, event.recipientId, event.clientId]);
 if (saved.rows.length) return;
 const existing = await tx.query('SELECT id FROM notificaciones_salida WHERE evento_clave=$1 AND destinatario_id=$2', [key,event.recipientId]);
 if (!existing.rows.length) throw new ConflictException('La cuenta destinataria cambió. Vuelve a revisar el envío.');
}

export async function notifyContractAccepted(tx: Sql, event: ContractEvent) {
 await tx.query(`${insertNotice}
  SELECT gen_random_uuid(),$1,'contract_accepted',$2,$3,
   CASE WHEN u.rol='subadmin' THEN $4 ELSE $5 END,$6,u.id,u.rol,'cuenta'
  FROM usuarios u
  WHERE u.activo AND (u.rol='admin' OR (u.rol='subadmin' AND EXISTS(
   SELECT 1 FROM equipo_proyectos p WHERE p.id=$6 AND p.responsable_id=u.id
  )))
  ON CONFLICT(evento_clave,destinatario_id) DO NOTHING
 `, [`contract-accepted:${event.id}:${event.version}`, event.id, event.projectName.slice(0, 200),
  '/equipo?proyecto=' + event.teamProjectId + '&contrato=' + event.id, '/admin/contratos?contrato=' + event.id,
  event.teamProjectId || null]);
}

const inboxScope = `
 n.destinatario_id=$1 AND EXISTS (
  SELECT 1 FROM usuarios u
  WHERE u.id=n.destinatario_id AND u.activo AND u.rol=n.destinatario_rol AND (
   u.rol='admin'
   OR (u.rol='subadmin' AND EXISTS (
    SELECT 1 FROM equipo_proyectos p WHERE p.id=n.equipo_proyecto_id AND p.responsable_id=u.id
   ))
   OR (u.rol='client' AND n.tipo='contract_sent' AND EXISTS (
    SELECT 1 FROM contratos c WHERE c.id=n.entidad_id AND ${visibleClientContract} AND (
     c.cliente_id=u.cliente_id OR EXISTS (
      SELECT 1 FROM cliente_cuenta_asociaciones x WHERE x.cliente_id=c.cliente_id AND x.usuario_id=u.id AND x.activo
     )
    )
   ))
  )
 )
`;

@Injectable()
export class InAppNotifications {
 constructor(@Inject(Database) private db: Database) {}

 async list(account: Account) {
  const result = await this.db.query(`
   WITH bandeja AS (
    SELECT n.id,n.tipo AS kind,n.proyecto_nombre AS "projectName",n.ruta AS route,
      n.created_at AS "createdAt",n.leido_at AS "readAt"
    FROM notificaciones_salida n WHERE ${inboxScope}
   )
   SELECT COALESCE(json_agg(p ORDER BY (p."readAt" IS NULL) DESC,p."createdAt" DESC,p.id DESC),'[]'::json) AS items,
    (SELECT count(*)::int FROM bandeja WHERE "readAt" IS NULL) AS unread
   FROM (SELECT * FROM bandeja ORDER BY ("readAt" IS NULL) DESC,"createdAt" DESC,id DESC LIMIT 50) p
  `, [account.id]);
  return result.rows[0];
 }

 async markRead(account: Account, id: string) {
  parse(z.uuid(), id);
  const result = await this.db.query(`
   UPDATE notificaciones_salida n SET leido_at=COALESCE(leido_at,now())
   WHERE ${inboxScope} AND n.id=$2 RETURNING leido_at AS "readAt"
  `, [account.id,id]);
  if (!result.rows.length) throw new NotFoundException('Aviso no disponible.');
  return result.rows[0];
 }

 async markAllRead(account: Account) {
  await this.db.query(`UPDATE notificaciones_salida n SET leido_at=now() WHERE ${inboxScope} AND leido_at IS NULL`, [account.id]);
  return { ok: true };
 }
}

type ActorRequest = Request & { account: Account };

@Controller('api/account/notifications')
@UseGuards(SessionGuard)
export class InAppNotificationsController {
 constructor(@Inject(InAppNotifications) private inbox: InAppNotifications) {}

 @Get() list(@Req() req: ActorRequest) { return this.inbox.list(req.account); }
 @Post('read-all') markAllRead(@Req() req: ActorRequest) { return this.inbox.markAllRead(req.account); }
 @Post(':id/read') markRead(@Req() req: ActorRequest, @Param('id') id: string) { return this.inbox.markRead(req.account,id); }
}
