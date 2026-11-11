import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{Client}=require('pg');
const cfg={host:'127.0.0.1',port:55452,user:'tuknex_qa',database:'postgres',connectionTimeoutMillis:5000};
const prefix='tuknex_qa_'+Date.now(),source=prefix+'_source',restored=prefix+'_restored',out=resolve('../.qa-integral');
const tools='C:/Program Files/PostgreSQL/17/bin';
const admin=new Client(cfg);await admin.connect();
let db;
try{
 for(const name of [source,restored])await admin.query('CREATE DATABASE '+name);
 db=new Client({...cfg,database:source});await db.connect();
 await db.query('CREATE TABLE schema_migrations(id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir('migrations')).filter(n=>/^0(0[1-9]|1[01])_.*\.sql$/.test(n)).sort()){
  await db.query(await readFile(resolve('migrations',name),'utf8'));await db.query('INSERT INTO schema_migrations(id) VALUES($1)',[name]);
 }
 const clientId=randomUUID(),userId=randomUUID(),projectId=randomUUID(),contractId=randomUUID(),documentId=randomUUID(),receiptId=randomUUID(),acceptanceId=randomUUID();
 const pdf=Buffer.from('%PDF-QA synthetic immutable restore evidence'),hash=createHash('sha256').update(pdf).digest('hex');
 await db.query('INSERT INTO clientes(id,nombre,documento,datos) VALUES($1,$2,$3,$4)',[clientId,'Restauración QA','00000001',JSON.stringify({id:clientId,name:'Restauración QA',taxId:'00000001',email:'restore@example.test'})]);
 await db.query("INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id) VALUES($1,'Restauración QA','restore@example.test','synthetic-not-login','client',$2)",[userId,clientId]);
 await db.query("INSERT INTO proyectos(id,cliente_id,nombre) VALUES($1,$2,'Proyecto sintético restauración')",[projectId,clientId]);
 await db.query("INSERT INTO contratos(id,numero_contrato,cliente_id,proyecto_id,fecha_emision,fecha_inicio,fecha_entrega,servicio,alcance,monto_base,tipo_pago,porcentaje_financiamiento,monto_financiado,monto_total,estado,datos) VALUES($1,'TK-C-QA-RESTORE',$2,$3,'2026-11-09','2026-11-10','2026-11-30','catalog','Alcance de prueba',10000,'cash',0,0,10000,'firmado_cliente',$4)",[contractId,clientId,projectId,JSON.stringify({id:contractId,scope:'No mutar evidencia',version:1})]);
 await db.query("INSERT INTO documentos(id,tipo,entidad_id,version,contenido,sha256) VALUES($1,'contract',$2,1,$3,$4)",[documentId,contractId,pdf,hash]);
 await db.query('INSERT INTO contrato_revisiones(documento_id,contrato_id,version,datos,sha256) VALUES($1,$2,1,$3,$4)',[documentId,contractId,JSON.stringify({scope:'No mutar evidencia'}),hash]);
 await db.query("INSERT INTO contrato_aceptaciones(id,contrato_id,documento_id,usuario_id,version,nombre,sha256,consentimiento) VALUES($1,$2,$3,$4,1,'Restauración QA',$5,'Consentimiento sintético de prueba')",[acceptanceId,contractId,documentId,userId,hash]);
 await db.query("INSERT INTO comprobantes(id,nombre,mime,contenido,sha256) VALUES($1,'comprobante-qa.pdf','application/pdf',$2,$3)",[receiptId,pdf,hash]);
 const snapshot=async c=>{
  const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;const result={};
  for(const {tablename}of tables){const rows=(await c.query('SELECT row_to_json(t)::text AS j FROM public."'+tablename.replaceAll('"','""')+'" t ORDER BY row_to_json(t)::text')).rows.map(r=>r.j);result[tablename]={rows:rows.length,sha256:createHash('sha256').update(rows.join('\n')).digest('hex')};}
  return result;
 };
 const before=await snapshot(db);await mkdir(out,{recursive:true});const backup=resolve(out,'qa-restore-'+prefix+'.dump');
 const common=['-h',cfg.host,'-p',String(cfg.port),'-U',cfg.user];
 execFileSync(resolve(tools,'pg_dump.exe'),[...common,'-Fc','--no-owner','--no-acl','-f',backup,source],{stdio:'pipe'});
 execFileSync(resolve(tools,'pg_restore.exe'),[...common,'--no-owner','--no-acl','--exit-on-error','-d',restored,backup],{stdio:'pipe'});
 const copy=new Client({...cfg,database:restored});await copy.connect();
 try{
  assert.deepEqual(await snapshot(copy),before);
  await assert.rejects(()=>copy.query('UPDATE documentos SET sha256=$2 WHERE id=$1',[documentId,'0'.repeat(64)]));
  await assert.rejects(()=>copy.query('DELETE FROM contrato_aceptaciones WHERE id=$1',[acceptanceId]));
  await writeFile(resolve(out,'backup-restore.json'),JSON.stringify({status:'passed',source,restored,backup,localOnly:true,server:'PostgreSQL 17 loopback:55452',tables:before,fixture:{clientId,userId,contractId,documentId,acceptanceId,receiptId},tests:['custom-format pg_dump','pg_restore into separate QA database','all public table row hashes identical','reviewed PDF and acceptance immutability preserved'],productionBackup:false},null,2));
  console.log('PASS: backup y restauración local; '+Object.keys(before).length+' tablas idénticas, evidencia inmutable. No se accedió a Neon.');
 }finally{await copy.end();}
}finally{await db?.end();await admin.end();}
