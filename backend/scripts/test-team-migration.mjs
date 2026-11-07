import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('team migration preserves historical owners and refuses ambiguous ownership',async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&n<'009').sort())await db.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  await db.exec("INSERT INTO usuarios(id,nombre,correo,password_hash,rol) VALUES ('00000000-0000-4000-8000-000000000001','Owner A','a@example.test','synthetic','admin'),('00000000-0000-4000-8000-000000000002','Owner B','b@example.test','synthetic','admin')");
  await assert.rejects(db.exec(await readFile(new URL('../migrations/009_team.sql',import.meta.url),'utf8')),/varios administradores/);
  assert.equal((await db.query("SELECT count(*)::int n FROM usuarios WHERE rol='admin'")).rows[0].n,2);
  assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_name='equipo_proyectos'")).rows[0].n,0);
 }finally{await db.close();}
});
