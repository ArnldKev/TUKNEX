import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {parse} from 'dotenv';
import pg from 'pg';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
export const setupRoute=process.env.TUKNEX_SETUP_PATH || '/configurar/'+randomBytes(24).toString('hex');
if(!/^\/configurar\/[a-f0-9]{48}$/.test(setupRoute)) throw new Error('Ruta local de configuración no válida.');
const route=setupRoute,port=Number(process.env.TUKNEX_SETUP_PORT || 4010),base='http://127.0.0.1:'+port;
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('Puerto local no válido.');
const csrfToken=randomBytes(32).toString('hex');
const statusFile=resolve(root,'.local-data/setup-status.json');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const document=(message='',success=false)=>`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurar TUKNEX</title><style>body{background:#071323;color:#eaf4ff;font:16px system-ui;margin:0;padding:30px}main{max-width:600px;margin:auto}h1{font-size:32px}p,small{color:#b3c8dc;line-height:1.6}form{display:grid;gap:16px}fieldset{border:1px solid #25405a;border-radius:12px;padding:20px;display:grid;gap:14px}label{display:grid;gap:6px}input{font:inherit;background:#102237;color:white;border:1px solid #3b556c;border-radius:8px;padding:12px;min-width:0}button,a{color:#061421;background:#58e4d2;border:0;border-radius:8px;padding:14px;font:inherit;font-weight:700}a{display:inline-block;text-decoration:none}.notice{border:1px solid #58e4d2;padding:16px;border-radius:8px}</style><main><h1>TUKNEX · Configuración local</h1><p>Crea la base <b>tuknex</b> en tu PostgreSQL y tu primera cuenta administradora. Las contraseñas se envían únicamente a este asistente en tu equipo.</p>${message?`<p class="notice" role="status">${escape(message)}</p>`:''}${success?'<a href="http://127.0.0.1:3000/acceder">Abrir TUKNEX e iniciar sesión</a><p>Reinicia el backend y el frontend si ya estaban abiertos. En pgAdmin, actualiza Databases para ver tuknex.</p>':`<form method="post" action="${route}"><input type="hidden" name="_csrf" value="${csrfToken}"><fieldset><legend>Conexión a PostgreSQL</legend><label>Servidor<input name="host" value="127.0.0.1" required></label><label>Puerto<input name="port" type="number" value="5432" required min="1" max="65535"></label><label>Usuario que puede crear bases<input name="user" value="postgres" required></label><label>Contraseña de PostgreSQL<input name="databasePassword" type="password" required autocomplete="off"></label><small>Esta contraseña no se guardará. TUKNEX usará su propio usuario de base de datos.</small></fieldset><fieldset><legend>Tu cuenta administradora de TUKNEX</legend><label>Nombre completo<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>Correo electrónico<input name="email" type="email" required autocomplete="username"></label><label>Tu nueva contraseña de TUKNEX<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Confirma tu contraseña<input name="confirm" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><small>La contraseña de tu cuenta se guarda con un hash; no se almacena en texto.</small></fieldset><button>Crear base y cuenta administradora</button></form>`}</main></html>`;
async function configure(input) {
  const {z}=require('zod');
  const values=z.object({host:z.enum(['127.0.0.1','localhost']),port:z.coerce.number().int().min(1).max(65535),user:z.string().min(1).max(100),databasePassword:z.string().min(1).max(500),name:z.string().trim().min(2).max(100),email:z.email().trim().toLowerCase(),password:z.string().min(12).max(128),confirm:z.string()}).parse(input);
  if(values.password!==values.confirm) throw new Error('Las contraseñas de TUKNEX no coinciden.');
  const admin=new pg.Client({host:values.host,port:values.port,user:values.user,password:values.databasePassword,database:'postgres',connectionTimeoutMillis:10000});
  let env={},pending=false;
  try {env=parse(await readFile(resolve(root,'.env')));pending=JSON.parse(await readFile(statusFile,'utf8')).pending===true;}catch{}
  if(!pending) {
    await admin.connect();
    try {
      if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',['tuknex'])).rowCount) throw new Error('Ya existe una base llamada tuknex. No se ha modificado. Configura su conexión manualmente o revisa esa base antes de continuar.');
      const role='tuknex_app_'+randomBytes(4).toString('hex'),secret=randomBytes(32).toString('hex');
      await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${secret}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
      await admin.query(`CREATE DATABASE tuknex OWNER "${role}"`);
      const url=new URL('postgresql://127.0.0.1/tuknex');url.hostname=values.host;url.port=String(values.port);url.username=role;url.password=secret;
      env={NODE_ENV:'development',PORT:'4000',SERVER_HOST:'127.0.0.1',BILLING_MODE:'production',DATABASE_URL:url.href,CORS_ORIGINS:'http://127.0.0.1:3000,http://localhost:3000',ADMIN_SETUP_TOKEN:randomBytes(32).toString('hex'),SESSION_SAMESITE:'lax',ISSUER_NAME:'',ISSUER_TAX_ID:'',ISSUER_ADDRESS:'',ISSUER_EMAIL:'',ISSUER_PHONE:'+51 934 631 664'};
      await writeFile(resolve(root,'.env'),Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
      await mkdir(resolve(root,'.local-data'),{recursive:true});await writeFile(statusFile,JSON.stringify({pending:true,database:'tuknex'}));
    } finally {await admin.end();}
  }
  Object.assign(process.env,env);
  const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
  const {createApp}=require('../dist/main.js'),{AuthService}=require('../dist/auth/auth.js');
  let app;
  try {
    app=await createApp();
    const auth=app.get(AuthService);
    const session=await auth.setupAdmin({name:values.name,email:values.email,password:values.password,setupToken:env.ADMIN_SETUP_TOKEN});
    await auth.logout(session.token);
    delete env.ADMIN_SETUP_TOKEN;
    await writeFile(resolve(root,'.env'),Object.entries(env).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
    await writeFile(statusFile,JSON.stringify({pending:false,result:'PASS',database:'tuknex',administratorCreated:true,completedAt:new Date().toISOString()}));
  } finally {await app?.close();}
}
export function createSetupHandler(configureDatabase=configure) {
 let busy=false,completed=false,notice='';
 const redirect=res=>{res.writeHead(303,{'Location':route,'Cache-Control':'no-store'});res.end();};
 return async(req,res)=>{
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
  if(req.url!==route || req.headers.host!=='127.0.0.1:'+port) {res.writeHead(404);res.end();return;}
  if(req.method==='GET'){res.writeHead(200,headers);res.end(document(notice || (completed?'Configuración completada. Ya puedes usar tu cuenta administradora.':''),completed));return;}
  if(req.method!=='POST' || req.headers.origin!==base || !req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')){res.writeHead(403,headers);res.end(document('Envío no autorizado. Vuelve a abrir el enlace local del asistente.'));return;}
  if(busy || completed){notice='El asistente ya está procesando o ha terminado la configuración.';redirect(res);return;}
  busy=true;
  try {
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16384)throw new Error('Formulario demasiado grande.');}
    const input=Object.fromEntries(new URLSearchParams(text));
    if(!/^[a-f0-9]{64}$/.test(input._csrf || '') || !timingSafeEqual(Buffer.from(input._csrf),Buffer.from(csrfToken))){res.writeHead(403,headers);res.end(document('El formulario caducó. Vuelve a abrir el asistente e inténtalo de nuevo.'));return;}
    delete input._csrf;
    await configureDatabase(input);completed=true;
    notice='Base tuknex y cuenta administradora creadas correctamente.';
    redirect(res);
    console.log('Configuración completada: PostgreSQL conectado y administrador creado. Puedes cerrar el asistente con Ctrl+C.');
  }catch(error){
    const message=error.code==='28P01'?'La contraseña de PostgreSQL no es correcta. Inténtalo otra vez.':error.code==='ECONNREFUSED'?'No se pudo conectar con PostgreSQL. Revisa host y puerto.':error.name==='ZodError'?'Revisa los campos y usa una contraseña de TUKNEX de al menos 12 caracteres.':error.message?.startsWith('Ya existe')||error.message?.startsWith('Las contraseñas')?error.message:'No se completó la configuración. Comprueba los permisos de PostgreSQL. Tu base anterior permanece intacta.';
    notice=message;redirect(res);console.log('Configuración pendiente. Revisa el mensaje en el asistente.');
  }finally{busy=false;}
 };
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=http.createServer(createSetupHandler());
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'El asistente ya está abierto en el puerto '+port+'.':'No se pudo iniciar el asistente local.');process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log('Abre este asistente únicamente en tu equipo:\n'+base+route));
}
