import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('staff migration is repeatable and preserves author, recipient and historical PDF',async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  for(const name of(await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&n<'010').sort())await db.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  await db.query("INSERT INTO clientes(id,nombre,correo,datos) VALUES($1,'Client','client@example.test','{}'),($2,'Other','other@example.test','{}')",[id(1),id(2)]);
  await db.query("INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id) VALUES($1,'Client','client@example.test','synthetic','client',$2),($3,'Staff','staff@example.test','synthetic','subadmin',NULL),($4,'Other','other@example.test','synthetic','client',$5)",[id(3),id(1),id(4),id(5),id(2)]);
  await db.query("INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf,created_at) VALUES($1,'TK-HISTORY',$2,$3,$4,'original-hash','{\"original\":true}','{\"min\":200}',decode('255044462d','hex'),'2025-01-01T00:00:00Z')",[id(6),id(3),id(1),id(7)]);
  const before=(await db.query('SELECT * FROM solicitudes_cotizacion WHERE id=$1',[id(6)])).rows[0];
  const migration=await readFile(new URL('../migrations/010_staff_quote_requests.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  const after=(await db.query('SELECT * FROM solicitudes_cotizacion WHERE id=$1',[id(6)])).rows[0];
  for(const key of Object.keys(before))assert.deepEqual(after[key],before[key],key+' unchanged');
  assert.equal(after.creado_por_id,id(3));assert.equal(after.revision,1);assert.equal(after.vinculada_por_id,id(3));
  assert.equal(new Date(after.vinculada_at).toISOString(),new Date(before.created_at).toISOString());
  await db.query("INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf) VALUES($1,'TK-LEGACY',$2,$3,$4,'legacy','{}','{}',decode('255044462d','hex'))",[id(8),id(3),id(1),id(9)]);
  assert.equal((await db.query('SELECT creado_por_id FROM solicitudes_cotizacion WHERE id=$1',[id(8)])).rows[0].creado_por_id,id(3));
  await db.query("INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,creado_por_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf) VALUES($1,'TK-STAFF',NULL,NULL,$2,$3,'staff','{}','{}',decode('255044462d','hex'))",[id(10),id(4),id(7)]);
  await db.query("INSERT INTO equipo_proyectos(id,solicitud_id,cliente_id,titulo,responsable_id) VALUES($1,$2,NULL,'Unlinked',$3)",[id(11),id(10),id(4)]);
  await db.query('UPDATE solicitudes_cotizacion SET usuario_id=$2,cliente_id=$3 WHERE id=$1',[id(10),id(3),id(1)]);
  assert.equal((await db.query('SELECT count(*)::int n FROM solicitudes_cotizacion WHERE clave_idempotencia=$1',[id(7)])).rows[0].n,2);
  await assert.rejects(db.query('UPDATE solicitudes_cotizacion SET creado_por_id=$2 WHERE id=$1',[id(10),id(3)]),/creador.*inmutable/);
  await assert.rejects(db.query('UPDATE solicitudes_cotizacion SET usuario_id=$2,cliente_id=$3 WHERE id=$1',[id(10),id(5),id(2)]),/no se puede transferir/);
  await assert.rejects(db.query('UPDATE solicitudes_cotizacion SET usuario_id=NULL,cliente_id=NULL WHERE id=$1',[id(10)]),/no se puede transferir/);
  await assert.rejects(db.query("INSERT INTO solicitudes_cotizacion(id,numero,usuario_id,cliente_id,creado_por_id,clave_idempotencia,entrada_hash,respuestas,estimacion,pdf) VALUES($1,'TK-DUPLICATE',NULL,NULL,$2,$3,'x','{}','{}',decode('25','hex'))",[id(12),id(4),id(7)]),/duplicate key/);
  await db.exec(migration);
  assert.equal((await db.query('SELECT creado_por_id FROM solicitudes_cotizacion WHERE id=$1',[id(10)])).rows[0].creado_por_id,id(4));
 }finally{await db.close();}
});
