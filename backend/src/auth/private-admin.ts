import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { Database } from '../database/database';
import { parse } from '../billing/dto';
import { credentials } from './account-fields';
import { hashPassword } from './passwords';

/** Backend operator command only. Never register this operation as an HTTP route. */
export async function provisionAdmin(db: Pick<Database, 'transaction'>, value: unknown) {
  const input = parse(credentials, value);
  const id = randomUUID(), createdAt = new Date().toISOString();
  const hash = await hashPassword(input.password);
  try {
    await db.transaction(async tx => {
      await tx.query(
        "INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id) VALUES($1,$2,$3,$4,'admin',NULL)",
        [id, input.name, input.email, hash],
      );
    });
  } catch (error: any) {
    if (error.code === '23505') throw new ConflictException('Ese correo ya tiene una cuenta. No se ha cambiado su rol ni su contraseña.');
    throw error;
  }
  return { id, name: input.name, email: input.email, role: 'admin' as const, clientId: null, isDemo: false as const, createdAt };
}
