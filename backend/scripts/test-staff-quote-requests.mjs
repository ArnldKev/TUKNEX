import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=await mkdtemp(path.join(tmpdir(),'tuknex-staff-requests-'));
for(const key of ['DATABASE_URL','GROQ_API_KEY','RESEND_API_KEY','VERIFICATION_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'])delete process.env[key];
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temp,SEED_DEMO_DATA:'false',NEXI_AI_ENABLED:'false',NEXI_AUDIO_ENABLED:'false',QUOTE_DRAFTS_ENABLED:'false',CONTACT_VERIFICATION_ENABLED:'false',REQUIRE_EMAIL_VERIFICATION:'false',REQUIRE_PHONE_VERIFICATION:'false',CORS_ORIGINS:'http://127.0.0.1:3000'});
require('dotenv').config=()=>({parsed:{}});
const originalFetch=globalThis.fetch;globalThis.fetch=(url,options)=>{const host=new URL(String(url)).hostname;if(!['127.0.0.1','localhost'].includes(host))throw Error('External network disabled in staff request tests');return originalFetch(url,options);};
const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js'),{provisionAdmin}=require('../dist/auth/private-admin.js'),{quoteDefaults}=require('../dist/domain/quote/form.js');
const {PDFDocument,PDFArray,PDFRawStream,decodePDFRawStream}=require('pdf-lib');
const {amount}=require('../dist/domain/billing/finance.js');
async function pdfText(bytes){
 const pdf=await PDFDocument.load(bytes),result=[];
 for(const page of pdf.getPages()){
  const content=page.node.Contents(),references=content instanceof PDFArray?content.asArray():[content];
  for(const reference of references){const stream=pdf.context.lookup(reference);if(!(stream instanceof PDFRawStream))continue;const text=Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');for(const match of text.matchAll(/<([0-9a-f]+)>\s*Tj/gi))result.push(Buffer.from(match[1],'hex').toString('latin1'));}
 }
 return result.join(' ').replace(/\s+/g,' ');
}
let app,base,checks=0;const password='Synthetic-staff-request-2026!',origin='http://127.0.0.1:3000';
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
async function call(route,cookie='',body,expected=body===undefined?200:201,method=body===undefined?'GET':'POST'){
 const r=await fetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 equal(r.status,expected,route+' '+(r.status===expected?'':await r.clone().text()));return{res:r,cookie:r.headers.get('set-cookie')?.split(';')[0]||'',data:()=>r.json()};
}
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();const db=app.get(Database);
 const ownerAccount=await provisionAdmin(db,{name:'Owner QA',email:'owner-staff-request@example.test',password});
 const owner=await call('auth/login','',{email:'owner-staff-request@example.test',password});
 const ownerUser=(await owner.data()).user;
 const staffA=await(await call('team/members',owner.cookie,{name:'Staff A',email:'staff-a-request@example.test',password})).data();
 const staffB=await(await call('team/members',owner.cookie,{name:'Staff B',email:'staff-b-request@example.test',password})).data();
 const a=await call('auth/login','',{email:staffA.email,password}),b=await call('auth/login','',{email:staffB.email,password});
 async function client(n){const response=await call('auth/register','',{name:'Client '+n,email:'staff-request-client-'+n+'@example.test',password,phone:'90000000'+n,dni:'0000000'+n,privacyConsent:true});return{cookie:response.cookie,user:(await response.data()).user};}
 const c=await client(1),d=await client(2),e=await client(3);
 await db.query('UPDATE usuarios SET activo=false WHERE id=$1',[d.user.id]);
 const values={...quoteDefaults,businessName:'Restaurante QA Origen',offering:'Restaurante de prueba',sector:'food',colorsLiked:'azul',stylePreference:'elegant',firstImpression:'Sabores para compartir.',problem:'Quiero organizar pedidos del restaurante',privacyAcknowledged:true,timeline:'flexible',launchDate:'2099-01-15',hardDeadline:true};
 const key=randomUUID(),body={values,idempotencyKey:key};
 // Scheduling validation must apply to both client and staff creation without writing records.
 const beforeScheduleCount=(await db.query('SELECT count(*)::int AS n FROM solicitudes_cotizacion')).rows[0].n;
 for(const launchDate of ['', '2020-01-01','2099-02-30','not-a-date']){
  const invalid={values:{...values,launchDate,hardDeadline:true},idempotencyKey:randomUUID()};
  for(const [route,cookie] of [['account/quote-requests',c.cookie],['team/quote-requests',a.cookie]])await call(route,cookie,invalid,400);
 }
 equal((await db.query('SELECT count(*)::int AS n FROM solicitudes_cotizacion')).rows[0].n,beforeScheduleCount,'invalid scheduling writes no request');
 await call('team/quote-requests','',undefined,401);await call('team/quote-requests',c.cookie,undefined,403);
 await call('team/quote-requests',c.cookie,body,403);await call('account/quote-requests',a.cookie,body,403);
 await call('team/quote-requests',a.cookie,{...body,userId:c.user.id},400);
 const draft=await(await call('team/quote-requests',a.cookie,body)).data();
 equal([draft.userId,draft.clientId,draft.clientName,draft.clientEmail,draft.linkedAt],[null,null,null,null,null]);
 equal([draft.values.launchDate,draft.values.hardDeadline,draft.values.timeline],['2099-01-15',true,'flexible'],'future deadline is stored without forcing urgency');
 equal(draft.result.urgencyAmount,0,'a fixed date does not add an urgent surcharge');
 equal([draft.createdById,draft.createdByName,draft.createdByRole,draft.assigneeId,draft.revision],[staffA.id,'Staff A','subadmin',staffA.id,1]);
 equal([draft.values.name,draft.values.email],['',''],'staff identity must not fill customer intake');check(draft.teamProjectId,'auto project');equal(draft.clientLinked,false);
 const detail=await(await call('team/projects/'+draft.teamProjectId,a.cookie)).data();equal(detail.project.clientId,null);equal(detail.project.clientLinked,false);equal(detail.request.createdById,staffA.id);equal(detail.data.clients,[]);
 equal((await(await call('account/quote-requests',c.cookie)).data()).length,0);
 equal((await(await call('team/quote-requests',b.cookie)).data()).length,0);
 check((await(await call('billing/quote-requests',owner.cookie)).data()).some(r=>r.id===draft.id),'owner supervises unlinked request');
 for(const route of ['team/quote-requests/'+draft.id,'team/quote-requests/'+draft.id+'/pdf'])await call(route,b.cookie,undefined,404);
 await call('team/quote-requests/'+draft.id,b.cookie,{status:'reviewing'},404,'PATCH');
 await call('team/quote-requests/'+draft.id+'/client',b.cookie,{clientUserId:c.user.id,revision:1},404,'PATCH');
 const pdf=Buffer.from(await(await call('team/quote-requests/'+draft.id+'/pdf',a.cookie)).res.arrayBuffer());check(pdf.subarray(0,5).toString()==='%PDF-','preliminary PDF');
 const checksum=data=>createHash('sha256').update(data).digest('hex');
 const originalSettings=(await db.query("SELECT datos FROM configuracion WHERE id='billing'")).rows[0].datos;
 try{
  await db.query("UPDATE configuracion SET datos=$1 WHERE id='billing'",[JSON.stringify({...originalSettings,prices:{...originalSettings.prices,landing:9700}})]);
  const personalized=Buffer.from(await(await call('team/quote-requests/'+draft.id+'/pdf?preview=current',a.cookie)).res.arrayBuffer());
  const rendered=await pdfText(personalized);
  check(rendered.includes('TU BOCETO'),'current PDF draws the configured model instead of the generic service image');
  check(rendered.includes('Restaurante QA Origen')&&rendered.includes('Sabores para compartir.')&&rendered.includes('Azul'),'PDF preserves business, headline and selected palette');
  check(rendered.includes(amount(Math.round(draft.result.min*100)).replace(/\s+/g,' ')),'current preview keeps the saved estimate after tariffs change');
  equal(checksum((await db.query('SELECT pdf FROM solicitudes_cotizacion WHERE id=$1',[draft.id])).rows[0].pdf),checksum(pdf),'viewing current preview never rewrites historical PDF');
  await call('team/quote-requests/'+draft.id+'/pdf?preview=current',b.cookie,undefined,404);
  await call('account/quote-requests/'+draft.id+'/pdf?preview=current',c.cookie,undefined,404);
  await call('team/quote-requests/'+draft.id+'/pdf?preview=original',a.cookie,undefined,400);
  await call('team/quote-requests/'+draft.id+'/pdf?preview=current&extra=1',a.cookie,undefined,400);
  const ownerPreview=Buffer.from(await(await call('billing/quote-requests/'+draft.id+'/pdf?preview=current',owner.cookie)).res.arrayBuffer());
  check((await pdfText(ownerPreview)).includes('TU BOCETO'),'principal administrator has the same personalized view');
 }finally{await db.query("UPDATE configuracion SET datos=$1 WHERE id='billing'",[JSON.stringify(originalSettings)]);}

 const duplicate=await(await call('team/quote-requests',a.cookie,body)).data();equal(duplicate.id,draft.id);
 await call('team/quote-requests',a.cookie,{...body,values:{...values,offering:'Other answer'}},409);
 const parallelKey=randomUUID(),parallelBody={values:{...values,businessName:'Parallel'},idempotencyKey:parallelKey};
 const parallel=await Promise.all([call('team/quote-requests',a.cookie,parallelBody),call('team/quote-requests',a.cookie,parallelBody)]);
 const parallelRows=await Promise.all(parallel.map(r=>r.data()));equal(parallelRows[0].id,parallelRows[1].id);
 equal((await db.query('SELECT count(*)::int n FROM equipo_proyectos WHERE solicitud_id=$1',[parallelRows[0].id])).rows[0].n,1);
 equal((await db.query("SELECT count(*)::int n FROM auditoria WHERE accion='solicitud_equipo_creada' AND entidad_id=$1",[draft.id])).rows[0].n,1);
 const ownerDraft=await(await call('team/quote-requests',owner.cookie,body)).data();check(ownerDraft.id!==draft.id,'same key independent authors');equal(ownerDraft.assigneeId,null);equal(ownerDraft.createdById,ownerUser.id);
 await call('team/quote-requests/'+ownerDraft.id,a.cookie,undefined,404);
 const assigned=await(await call('team/projects/'+ownerDraft.teamProjectId+'/assignment',owner.cookie,{assigneeId:staffB.id,revision:1},200,'PATCH')).data();equal(assigned.clientLinked,false);
 equal((await(await call('team/quote-requests/'+ownerDraft.id,b.cookie)).data()).createdById,ownerUser.id);
 await call('team/client-accounts?email='+encodeURIComponent(c.user.email),'',undefined,401);
 await call('team/client-accounts?email='+encodeURIComponent(c.user.email),c.cookie,undefined,403);
 await call('team/client-accounts?email=abc',a.cookie,undefined,400);
 const found=await(await call('team/client-accounts?email='+encodeURIComponent(' '+c.user.email.toUpperCase()+' '),a.cookie)).data();
 equal(found,[{userId:c.user.id,clientId:c.user.clientId,name:c.user.name,email:c.user.email}]);
 for(const email of [staffA.email,d.user.email,'missing@example.test'])equal(await(await call('team/client-accounts?email='+encodeURIComponent(email),a.cookie)).data(),[]);
 // Assignment selector lists and searches only active registered customer accounts.
 await call('team/client-accounts','',undefined,401);await call('team/client-accounts',c.cookie,undefined,403);
 const directory=await(await call('team/client-accounts',owner.cookie)).data();
 equal(directory.length,2,'inactive accounts and team members are not listed');
 equal(directory.map(row=>row.userId).sort(),[c.user.id,e.user.id].sort());
 const expectedClient={userId:c.user.id,clientId:c.user.clientId,name:c.user.name,email:c.user.email,dni:'00000001'};
 for(const query of ['client 1','CLIENT 1','staff-request-client-1','00000001']){
  equal(await(await call('team/client-accounts?search='+encodeURIComponent(query),a.cookie)).data(),[expectedClient],'name, email and DNI search: '+query);
 }
 equal(await(await call('team/client-accounts?search=',a.cookie)).data(),directory,'staff and owner see the same bounded assignment options');
 for(const query of ['missing','%','_',"x' OR true --",d.user.email,staffA.email,ownerUser.email])equal(await(await call('team/client-accounts?search='+encodeURIComponent(query),a.cookie)).data(),[],'literal search and no inactive/team accounts: '+query);
 await call('team/client-accounts?search='+encodeURIComponent('x'.repeat(255)),a.cookie,undefined,400);
 await call('team/client-accounts?search=client&email='+encodeURIComponent(c.user.email),a.cookie,undefined,400);
 await call('team/client-accounts?extra=1',a.cookie,undefined,400);
 await db.query("UPDATE usuarios SET dni='' WHERE id=$1",[e.user.id]);
 const legacyDocument=await(await call('team/client-accounts?search=00000003',a.cookie)).data();
 equal(legacyDocument[0]?.dni,'00000003','registered customer document is a fallback for legacy accounts');
 await db.query("UPDATE usuarios SET dni='00000003' WHERE id=$1",[e.user.id]);
 async function directoryClient(name,email,dni){
  const clientId=randomUUID(),userId=randomUUID();
  await db.query("INSERT INTO clientes(id,nombre,correo,documento,datos) VALUES($1,$2,$3,$4,$5)",[clientId,name,email,dni,JSON.stringify({id:clientId,name,email,taxId:dni})]);
  await db.query("INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id,dni) VALUES($1,$2,$3,'synthetic-unused','client',$4,$5)",[userId,name,email,clientId,dni]);
  return{userId,clientId,name,email,dni};
 }
 const accented=await directoryClient('Ángela López','accent-directory@example.test','99999991');
 equal(await(await call('team/client-accounts?search=angela%20lopez',owner.cookie)).data(),[accented],'accent-insensitive name search');
 const limitClients=[];for(let n=0;n<55;n++)limitClients.push(await directoryClient('Limit QA '+String(n).padStart(2,'0'),'limit-directory-'+n+'@example.test','80000'+String(n).padStart(3,'0')));
 const limited=await(await call('team/client-accounts?search=Limit%20QA',owner.cookie)).data();
 equal(limited,limitClients.slice(0,50),'bounded and stable directory ordering');
 equal((await(await call('team/client-accounts',owner.cookie)).data()).length,50,'initial selector list is also bounded');
 check(limited.every(row=>Object.keys(row).sort().join(',')==='clientId,dni,email,name,userId'),'only selector fields are exposed');
 for(const target of [ownerUser.id,staffB.id,d.user.id,randomUUID()])await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:target,revision:1},400,'PATCH');
 await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:c.user.id,revision:99},409,'PATCH');
 const quote={clientId:c.user.clientId,projectName:'Restaurant QA',service:'catalog',scope:'Menú y pedidos',observations:'',conditions:'Sin pagos online.',delivery:'15 días',baseCents:45000,plan:{mode:'cash',rate:0,count:1,firstDueDate:'2026-10-29'},status:'sent',issuedDate:'2026-10-29',validUntil:'2026-11-10',isDemo:false};
 await call('team/projects/'+draft.teamProjectId+'/quotes',a.cookie,quote,400);
 const customerBefore=(await db.query('SELECT nombre,correo,password_hash,cliente_id FROM usuarios WHERE id=$1',[c.user.id])).rows[0];
 const linked=await(await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:c.user.id,revision:1},200,'PATCH')).data();
 equal([linked.userId,linked.clientId,linked.clientName,linked.clientEmail,linked.clientLinked,linked.createdById,linked.assigneeId,linked.revision],[c.user.id,c.user.clientId,c.user.name,c.user.email,true,staffA.id,staffA.id,2]);
 equal(linked.values,draft.values);equal(linked.result,draft.result);check(linked.linkedAt&&linked.linkedById===staffA.id,'link attribution');
 equal((await db.query('SELECT nombre,correo,password_hash,cliente_id FROM usuarios WHERE id=$1',[c.user.id])).rows[0],customerBefore,'link must never retitle or modify an account');
 const linkedProject=await(await call('team/projects/'+draft.teamProjectId,a.cookie)).data();equal([linkedProject.project.clientId,linkedProject.project.revision,linkedProject.project.clientLinked],[c.user.clientId,2,true]);
 check((await(await call('account/quote-requests',c.cookie)).data()).some(r=>r.id===draft.id),'linked customer sees request');
 equal((await(await call('account/quote-requests',e.cookie)).data()).length,0);
 await call('account/quote-requests/'+draft.id+'/pdf',e.cookie,undefined,404);
 const clientPdf=Buffer.from(await(await call('account/quote-requests/'+draft.id+'/pdf',c.cookie)).res.arrayBuffer());equal(checksum(clientPdf),checksum(pdf),'link preserves original PDF');
 const customerPreview=Buffer.from(await(await call('account/quote-requests/'+draft.id+'/pdf?preview=current',c.cookie)).res.arrayBuffer());
 check((await pdfText(customerPreview)).includes('Restaurante QA Origen'),'linked customer sees the same saved configured project');
 await call('account/quote-requests/'+draft.id+'/pdf?preview=current',e.cookie,undefined,404);

 const replay=await(await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:c.user.id,revision:1},200,'PATCH')).data();equal(replay.revision,2);
 await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:e.user.id,revision:2},409,'PATCH');
 equal((await(await call('team/quote-requests',a.cookie,body)).data()).id,draft.id,'author idempotency survives binding');
 const ownRequest=await(await call('account/quote-requests',c.cookie,body)).data();check(ownRequest.id!==draft.id,'linked customer may independently use same key');equal(ownRequest.createdById,c.user.id);
 const customerRequests=await(await call('account/quote-requests',c.cookie)).data();equal(customerRequests.length,2);
 const reassigned=await(await call('team/projects/'+draft.teamProjectId+'/assignment',owner.cookie,{assigneeId:staffB.id,revision:2},200,'PATCH')).data();equal(reassigned.revision,3);
 for(const route of ['team/quote-requests/'+draft.id,'team/quote-requests/'+draft.id+'/pdf','team/projects/'+draft.teamProjectId])await call(route,a.cookie,undefined,404);
 await call('team/quote-requests',a.cookie,body,404);
 await call('team/quote-requests/'+draft.id+'/client',a.cookie,{clientUserId:c.user.id,revision:2},404,'PATCH');
 const next=await(await call('team/quote-requests/'+draft.id,b.cookie,{status:'reviewing'},200,'PATCH')).data();equal(next.createdById,staffA.id);equal(next.assigneeId,staffB.id);equal(next.revision,3);
 check(!(await(await call('team/quote-requests',a.cookie)).data()).some(r=>r.id===draft.id),'old assignee loses list access');
 const q=await(await call('team/projects/'+draft.teamProjectId+'/quotes',b.cookie,quote)).data();
 const accepted=await(await call('team/projects/'+draft.teamProjectId+'/quotes/'+q.id,b.cookie,{...quote,status:'accepted',expectedVersion:q.version},200,'PATCH')).data();
 const contract=await(await call('team/projects/'+draft.teamProjectId+'/quotes/'+accepted.id+'/contract',b.cookie,{})).data();equal(contract.clientId,c.user.clientId);
 const signed={...contract,status:'firmado_cliente',clientSignedAt:new Date().toISOString()};
 await db.query("UPDATE contratos SET estado='firmado_cliente',datos=$2 WHERE id=$1",[contract.id,JSON.stringify(signed)]);
 const paymentId=randomUUID();await db.query("INSERT INTO pagos(id,contrato_id,monto,fecha_pago,metodo_pago,idempotency_key) VALUES($1,$2,100,'2026-10-29','bank',$3)",[paymentId,contract.id,randomUUID()]);
 const documentsBefore=(await db.query('SELECT cliente_id,datos FROM contratos WHERE id=$1',[contract.id])).rows[0];
 await call('team/quote-requests/'+draft.id+'/client',owner.cookie,{clientUserId:e.user.id,revision:3},409,'PATCH');
 equal((await db.query('SELECT cliente_id,datos FROM contratos WHERE id=$1',[contract.id])).rows[0],documentsBefore,'signed contract remains with original customer');
 equal((await db.query('SELECT contrato_id FROM pagos WHERE id=$1',[paymentId])).rows[0].contrato_id,contract.id);
 const race=await(await call('team/quote-requests',b.cookie,{values,idempotencyKey:randomUUID()})).data();
 const raceResponses=await Promise.all([c.user.id,e.user.id].map(clientUserId=>fetch(base+'/api/team/quote-requests/'+race.id+'/client',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json',Cookie:b.cookie},body:JSON.stringify({clientUserId,revision:1}),signal:AbortSignal.timeout(45000)})));
 equal(raceResponses.map(r=>r.status).sort(),[200,409]);
 const raceSaved=await(await call('team/quote-requests/'+race.id,b.cookie)).data();check([c.user.id,e.user.id].includes(raceSaved.userId));equal(raceSaved.revision,2);
 const raceSameBody={values,idempotencyKey:randomUUID()};
 const raceSame=await(await call('team/quote-requests',b.cookie,raceSameBody)).data();
 const same=await Promise.all([call('team/quote-requests/'+raceSame.id+'/client',b.cookie,{clientUserId:c.user.id,revision:1},200,'PATCH'),call('team/quote-requests/'+raceSame.id+'/client',b.cookie,{clientUserId:c.user.id,revision:1},200,'PATCH')]);
 equal((await same[0].data()).revision,(await same[1].data()).revision);
 equal((await db.query("SELECT count(*)::int n FROM auditoria WHERE accion='solicitud_cliente_vinculado' AND entidad_id=$1",[raceSame.id])).rows[0].n,1);
 const history=await(await call('team/activity?projectId='+draft.teamProjectId,owner.cookie)).data();
 check(history.some(v=>v.action==='solicitud_equipo_creada'&&v.actorId===staffA.id),'creator activity retained');
 check(history.some(v=>v.action==='solicitud_cliente_vinculado'&&v.actorId===staffA.id&&v.data.after.userId===c.user.id),'link attribution retained');
 check(history.some(v=>v.action==='responsable_asignado'&&v.actorId===ownerUser.id),'supervision activity retained');
 check(history.some(v=>v.action==='seguimiento_solicitud'&&v.actorId===staffB.id),'new assignee activity retained');
 // An in-flight idempotent replay may finish before reassignment, never retain access after it.
 const raceReplay=await Promise.all([
  fetch(base+'/api/team/projects/'+parallelRows[0].teamProjectId+'/assignment',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json',Cookie:owner.cookie},body:JSON.stringify({assigneeId:staffB.id,revision:1}),signal:AbortSignal.timeout(45000)}),
  fetch(base+'/api/team/quote-requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:a.cookie},body:JSON.stringify(parallelBody),signal:AbortSignal.timeout(45000)})
 ]);
 equal(raceReplay[0].status,200);check([200,404].includes(raceReplay[1].status),'replay is linearized before or after reassignment');
 await call('team/quote-requests',a.cookie,parallelBody,404);
 equal((await db.query('SELECT count(*)::int n FROM solicitudes_cotizacion WHERE creado_por_id=$1 AND clave_idempotencia=$2',[staffA.id,parallelKey])).rows[0].n,1);
 const inactiveReplay=await Promise.all([
  fetch(base+'/api/team/members/'+staffB.id,{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json',Cookie:owner.cookie},body:JSON.stringify({active:false}),signal:AbortSignal.timeout(45000)}),
  fetch(base+'/api/team/quote-requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:b.cookie},body:JSON.stringify(raceSameBody),signal:AbortSignal.timeout(45000)})
 ]);
 equal(inactiveReplay[0].status,200);check([200,401,403].includes(inactiveReplay[1].status),'replay cannot bypass deactivation');
 await call('team/quote-requests',b.cookie,undefined,401);
 console.log(JSON.stringify({result:'PASS',checks,realEmails:0,realProviderCalls:0,realDatabaseConnections:0}));
}finally{
 if(app)await app.close();globalThis.fetch=originalFetch;
 const resolved=path.resolve(temp),allowed=path.resolve(tmpdir())+path.sep+'tuknex-staff-requests-';
 if(!resolved.startsWith(allowed))throw Error('Unexpected test temporary directory');
 await rm(resolved,{recursive:true,force:true});
}
