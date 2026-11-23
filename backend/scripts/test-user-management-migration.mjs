import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('user-management migration preserves the existing principal and sessions while allowing delegated administrators', async () => {
  const db = new PGlite();
  await db.waitReady;
  const migrations = new URL('../migrations/', import.meta.url);
  try {
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql') && name < '021').sort()) {
      await db.exec(await readFile(new URL(name, migrations), 'utf8'));
    }
    await db.exec(`
      INSERT INTO usuarios(id,nombre,correo,password_hash,rol) VALUES
        ('00000000-0000-4000-8000-000000000001','Existing principal','existing-owner@example.test','synthetic-owner-hash','admin'),
        ('00000000-0000-4000-8000-000000000002','Existing subadministrator','existing-staff@example.test','synthetic-staff-hash','subadmin');
      INSERT INTO sesiones(token_hash,usuario_id,expires_at) VALUES
        ('synthetic-session','00000000-0000-4000-8000-000000000001','2099-01-01');
    `);
    await db.exec(await readFile(new URL('021_user_management.sql', migrations), 'utf8'));
    const existing = (await db.query('SELECT id,rol,is_owner,activo,password_hash FROM usuarios ORDER BY id')).rows;
    assert.deepEqual(existing, [
      { id: '00000000-0000-4000-8000-000000000001', rol: 'admin', is_owner: true, activo: true, password_hash: 'synthetic-owner-hash' },
      { id: '00000000-0000-4000-8000-000000000002', rol: 'subadmin', is_owner: false, activo: true, password_hash: 'synthetic-staff-hash' },
    ]);
    assert.equal((await db.query('SELECT token_hash FROM sesiones')).rows[0].token_hash, 'synthetic-session');
    await db.exec("INSERT INTO usuarios(id,nombre,correo,password_hash,rol) VALUES ('00000000-0000-4000-8000-000000000003','Delegated administrator','delegated@example.test','synthetic-admin-hash','admin')");
    assert.equal((await db.query("SELECT is_owner FROM usuarios WHERE correo='delegated@example.test'")).rows[0].is_owner, false);
    await assert.rejects(db.exec("INSERT INTO usuarios(id,nombre,correo,password_hash,rol,is_owner) VALUES ('00000000-0000-4000-8000-000000000004','Second principal','second-owner@example.test','synthetic-owner-hash','admin',true)"), error => error.code === '23505');
    await assert.rejects(db.exec("UPDATE usuarios SET is_owner=true WHERE rol='subadmin'"), error => error.code === '23514');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM usuarios WHERE is_owner')).rows[0].n, 1);
  } finally {
    await db.close();
  }
});
