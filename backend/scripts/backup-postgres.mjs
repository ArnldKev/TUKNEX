import {config} from 'dotenv';
import {spawn} from 'node:child_process';
import {mkdir,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
config({path:'.env',quiet:true});
if(!process.env.DATABASE_URL)throw Error('Configura DATABASE_URL.');
const url=new URL(process.env.DATABASE_URL),directory=path.resolve('.local-data/backups');
await mkdir(directory,{recursive:true});
const file=path.join(directory,'tuknex-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8)+'.dump');
let binary=process.env.PG_DUMP_PATH||'pg_dump';
if(!process.env.PG_DUMP_PATH&&process.platform==='win32'){
 const candidate=path.join(process.env.ProgramFiles||'C:/Program Files','PostgreSQL/17/bin/pg_dump.exe');
 try{await access(candidate,constants.F_OK);binary=candidate;}catch{}
}
const result=await new Promise((resolve,reject)=>{
 const child=spawn(binary,['--format=custom','--no-owner','--no-acl','--file',file],{env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),...(url.searchParams.has('sslmode')?{PGSSLMODE:url.searchParams.get('sslmode')}:{})},stdio:['ignore','ignore','pipe'],windowsHide:true});
 // Do not print connection credentials or raw provider output.
 child.on('error',()=>reject(Error('No se pudo ejecutar pg_dump. Configura PG_DUMP_PATH con la herramienta de tu versión de PostgreSQL.')));
 child.stderr.resume();child.on('close',resolve);
});
if(result!==0)throw Error('pg_dump no completó la copia. Comprueba la conexión y los permisos. No se modificó la base.');
console.log('Copia privada creada: '+file);
