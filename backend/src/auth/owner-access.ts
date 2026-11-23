import { ForbiddenException } from '@nestjs/common';
import type { Sql } from '../database/database';
import type { Account } from './auth';

/** Recheck the persistent owner identity. Never trust a submitted role or owner flag. */
export async function assertActiveOwner(tx: Sql, actor: Account, lock = true) {
  const row = (await tx.query('SELECT rol,activo,is_owner FROM usuarios WHERE id=$1' + (lock ? ' FOR UPDATE' : ''), [actor.id])).rows[0];
  if (!row?.activo || row.rol !== 'admin' || !row.is_owner || actor.role !== 'admin') {
    throw new ForbiddenException('Solo el administrador principal gestiona las cuentas.');
  }
}
