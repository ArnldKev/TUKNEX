import {BadRequestException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {z} from 'zod';
import type {Sql} from '../database/database';
import type {Account} from '../auth/auth';
import {parse} from '../billing/dto';

export async function assertActiveStaff(tx:Sql,actor:Account){
 const row=(await tx.query('SELECT rol,activo FROM usuarios WHERE id=$1 FOR UPDATE',[actor.id])).rows[0];
 if(!row?.activo||row.rol!==actor.role||!['admin','subadmin'].includes(row.rol))throw new ForbiddenException('La cuenta ya no tiene acceso al equipo.');
}
export async function assertActiveAssignee(tx:Sql,id:string|null){
 if(!id)return;
 const row=(await tx.query('SELECT rol,activo FROM usuarios WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!row?.activo||row.rol!=='subadmin')throw new BadRequestException('Selecciona un subadministrador activo.');
}
export async function lockTeamProject(tx:Sql,actor:Account,id:string){
 parse(z.uuid(),id);
 const row=(await tx.query('SELECT * FROM equipo_proyectos WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!row||(actor.role!=='admin'&&row.responsable_id!==actor.id))throw new NotFoundException('Proyecto no disponible.');
 await assertActiveStaff(tx,actor);
 return row;
}
