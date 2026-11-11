import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=await mkdtemp(join(tmpdir(),'tuknex-communications-http-'));
for(const key of ['DATABASE_URL','GROQ_API_KEY','RESEND_API_KEY','VERIFICATION_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'])delete process.env[key];
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temp,SEED_DEMO_DATA:'false',NOTIFICATIONS_ENABLED:'false',NEXI_AI_ENABLED:'false',NEXI_AUDIO_ENABLED:'false',QUOTE_DRAFTS_ENABLED:'false',CONTACT_VERIFICATION_ENABLED:'false',REQUIRE_EMAIL_VERIFICATION:'false',REQUIRE_PHONE_VERIFICATION:'false',CORS_ORIGINS:'http://127.0.0.1:3000'});
require('dotenv').config=()=>({parsed:{}});
const originalFetch=globalThis.fetch;globalThis.fetch=(url,options)=>{if(!['localhost','127.0.0.1'].includes(new URL(String(url)).hostname))throw Error('Real network prohibited in communications HTTP tests');return originalFetch(url,options);};
require('@nestjs/common').Logger.overrideLogger(false);
const dist=process.env.QA_COMM_DIST||'dist',get=name=>require(resolve(dist,name+'.js')),{createApp}=get('main'),{Database}=get('database/database'),{provisionAdmin}=get('auth/private-admin'),{quoteDefaults}=get('domain/quote/form');
let app,base,checks=0;const password='Synthetic-communications-2026!',origin='http://127.0.0.1:3000';
async function call(route,cookie='',body,status=body===undefined?200:201,method=body===undefined?'GET':'POST'){
 const r=await fetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,status,route+' '+(r.status===status?'':await r.clone().text()));checks++;return {response:r,cookie:r.headers.get('set-cookie')?.split(';')[0]||'',json:()=>r.json()};
}
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();const db=app.get(Database);
 await provisionAdmin(db,{name:'Titular HTTP QA',email:'comm-owner@example.test',password});const owner=await call('auth/login','',{email:'comm-owner@example.test',password});
 const one=await call('auth/register','',{name:'Cliente Uno QA',email:'comm-one@example.test',password,phone:'900000001',dni:'00000001',privacyConsent:true}),two=await call('auth/register','',{name:'Cliente Dos QA',email:'comm-two@example.test',password,phone:'900000002',dni:'00000002',privacyConsent:true}),customer=(await one.json()).user;
 const staff=await (await call('team/members',owner.cookie,{name:'Equipo HTTP QA',email:'comm-team@example.test',password})).json(),team=await call('auth/login','',{email:staff.email,password});
 await call('billing/notifications','',undefined,401);await call('billing/notifications',one.cookie,undefined,403);await call('billing/notifications',team.cookie,undefined,403);const inbox=await (await call('billing/notifications',owner.cookie)).json();assert.equal(inbox.enabled,false);checks++;
 const quoteInput={clientId:customer.clientId,projectName:'Propuesta HTTP QA',service:'catalog',scope:'Catalogo con busqueda y contacto',conditions:'No incluye licencias externas',observations:'Azul acordado',delivery:'15 dias',baseCents:45000,plan:{mode:'half',rate:0,count:2,firstDueDate:'2026-11-10'},status:'sent',issuedDate:'2026-11-09',validUntil:'2099-12-31',isDemo:false};
 const q=await (await call('billing/quotes',owner.cookie,quoteInput)).json(),path='account/quotes/'+q.id;
 await call(path+'/responses','',undefined,401);await call(path+'/responses',two.cookie,undefined,404);await call('billing/quote-responses/'+q.id,one.cookie,undefined,403);await call('billing/quote-responses/'+q.id,team.cookie,undefined,403);
 await call(path+'/responses',one.cookie);await call('billing/quote-responses/'+q.id,owner.cookie);await call(path+'/versions/1/pdf',two.cookie,undefined,404);const pdf=await call(path+'/versions/1/pdf',one.cookie);assert.ok(pdf.response.headers.get('content-type').includes('application/pdf'));checks++;
 const answer={version:q.version,decision:'confirm_proposal',comment:'Conforme con esta propuesta',idempotencyKey:randomUUID()};await call(path+'/responses',two.cookie,answer,404);const confirmed=await (await call(path+'/responses',one.cookie,answer)).json();assert.equal(confirmed.quote.status,'accepted');checks++;await call(path+'/responses',one.cookie,answer);await call(path+'/responses',one.cookie,{...answer,idempotencyKey:randomUUID()},409);await call(path+'/responses',one.cookie,{...answer,baseCents:1},400);
 const history=await (await call(path+'/responses',one.cookie)).json();assert.equal(history.responses[0].authorName,'Cliente Uno QA');assert.equal(history.responses[0].version,q.version);checks+=2;
 const values={...quoteDefaults,businessName:'Negocio HTTP QA',offering:'Productos',sector:'commerce',problem:'Necesito organizar las consultas',privacyAcknowledged:true};await call('account/quote-requests',one.cookie,{values,idempotencyKey:randomUUID()});const pending=await (await call('billing/notifications',owner.cookie)).json();assert.ok(pending.items.some(n=>n.kind==='quote_request'&&n.status==='pending'));checks++;
 const notice=pending.items.find(n=>n.status==='pending');await call('billing/notifications/'+notice.id+'/retry',one.cookie,{},403);await call('billing/notifications/'+notice.id+'/retry',owner.cookie,{});await call('billing/notifications/'+notice.id+'/retry',owner.cookie,{secret:'unexpected'},400);
 const state=await (await call('billing/state',owner.cookie)).json();assert.equal(state.contracts.length,0);assert.equal(state.payments.length,0);checks+=2;
 console.log('Communications HTTP: '+checks+' checks passed; authenticated local requests, temporary database, no real providers.');
}finally{await app?.close();globalThis.fetch=originalFetch;const target=resolve(temp);if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('tuknex-communications-http-'))throw Error('Unexpected cleanup target');await rm(target,{recursive:true,force:true});}
