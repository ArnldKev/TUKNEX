import {randomUUID} from 'node:crypto';
import type {Sql} from '../database/database';
export interface NotificationEvent {key:string;kind:string;entityId:string;projectName:string;route:string;projectId?:string|null;recipientIds?:string[]}
/** Called inside the business transaction; it never performs network I/O. */
export async function enqueueNotification(tx:Sql,event:NotificationEvent){
 const rows=(await tx.query("SELECT id,rol FROM usuarios WHERE activo=true AND (rol='admin' OR (rol='subadmin' AND id=ANY($1::uuid[])))",[event.recipientIds||[]])).rows;
 for(const row of rows)await tx.query('INSERT INTO notificaciones_salida(id,evento_clave,tipo,entidad_id,proyecto_nombre,ruta,equipo_proyecto_id,destinatario_id,destinatario_rol) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(evento_clave,destinatario_id) DO NOTHING',[randomUUID(),event.key,event.kind,event.entityId,event.projectName.slice(0,200),row.rol==='subadmin'&&event.projectId?'/equipo?proyecto='+event.projectId:event.route,event.projectId||null,row.id,row.rol]);
}
