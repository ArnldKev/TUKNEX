import {ForbiddenException} from '@nestjs/common';
import type {Sql} from '../database/database';
import type {Account} from './auth';
/** Revalidates active identity and explicit client access; never matches names or emails. */
export async function allowedClientIds(db:Sql,actor:Account):Promise<string[]>{
 if(actor.role!=='client'||!actor.clientId)throw new ForbiddenException('Esta operación requiere una cuenta de cliente.');
 const user=(await db.query("SELECT cliente_id FROM usuarios WHERE id=$1 AND rol='client' AND activo=true",[actor.id])).rows[0];
 if(!user||user.cliente_id!==actor.clientId)throw new ForbiddenException('Esta cuenta ya no tiene acceso.');
 const linked=await db.query('SELECT cliente_id FROM cliente_cuenta_asociaciones WHERE usuario_id=$1 AND activo=true',[actor.id]);
 return [...new Set([actor.clientId,...linked.rows.map(row=>String(row.cliente_id))])];
}
export async function hasClientAccess(db:Sql,actor:Account,clientId:string){return (await allowedClientIds(db,actor)).includes(clientId);}
