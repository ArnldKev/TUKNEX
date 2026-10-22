import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import pg from 'pg';
import {config} from 'dotenv';
const require=createRequire(import.meta.url),postgres=process.argv.includes('--postgres');
if(postgres)config({path:'.env',quiet:true});
const schema='tuknex_qa_'+randomUUID().replaceAll('-',''),temporary=path.resolve('.local-data','production-test-'+randomUUID());
let control,app,base,checks=0;
if(postgres){control=new pg.Client({connectionString:process.env.DATABASE_URL});await control.connect();await control.query('CREATE SCHEMA "'+schema+'"');const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=url.href;process.env.BILLING_MODE='production';}
else{process.env.BILLING_MODE='local-demo';process.env.DATA_DIR=temporary;await mkdir(temporary,{recursive:true});}
Object.assign(process.env,{NODE_ENV:'test',SEED_DEMO_DATA:'false',CORS_ORIGINS:'http://127.0.0.1:3000',CONTACT_VERIFICATION_ENABLED:'true',REQUIRE_EMAIL_VERIFICATION:'true',REQUIRE_PHONE_VERIFICATION:'true'});
for(const name of ['RESEND_API_KEY','EMAIL_FROM','VERIFICATION_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'])delete process.env[name];
const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js'),{quoteDefaults}=require('../dist/domain/quote/form.js'),{assertProductionConfig}=require('../dist/config/production.js');
const {provisionAdmin}=require('../dist/auth/private-admin.js');
const {PdfService}=require('../dist/documents/pdf.service.js'),{BillingService}=require('../dist/billing/billing.service.js');
const origin='http://127.0.0.1:3000',secret='Synthetic-test-password-2026!',nativeFetch=global.fetch;
const emails=[],sms=[];let emailFailure=false,phoneApproved=false;
global.fetch=async(url,options)=>{
  if(String(url)==='https://api.resend.com/emails'){
    if(emailFailure)return Response.json({error:'synthetic outage'},{status:503});
    const body=JSON.parse(options.body);emails.push({to:body.to[0],code:body.text.match(/\b\d{6}\b/)[0]});return Response.json({id:randomUUID()});
  }
  if(String(url).startsWith('https://verify.twilio.com/')){
    if(String(url).endsWith('/Verifications')){const sid='VE'+randomUUID().replaceAll('-','');sms.push({sid,to:options.body.get('To')});return Response.json({sid,status:'pending'});}
    return Response.json({sid:options.body.get('VerificationSid'),status:phoneApproved&&options.body.get('Code')==='123456'?'approved':'pending'});
  }
  return nativeFetch(url,options);
};
function check(value,message){assert.ok(value,message);checks++;}
async function call(route,body,cookie='',expected=body===undefined?200:201,method=body===undefined?'GET':'POST'){
  const res=await nativeFetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
  assert.equal(res.status,expected,route+' '+(res.status===expected?'':await res.clone().text()));checks++;
  return {res,cookie:res.headers.get('set-cookie')?.split(';')[0]||'',json:()=>res.json()};
}
async function open(){app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();}
try{
  await open();const db=()=>app.get(Database);
  await provisionAdmin(db(),{name:'QA Owner',email:'owner@example.test',password:secret});
  const admin=await call('auth/login',{email:'owner@example.test',password:secret});
  const registration={name:'QA Guest',email:'guest@example.test',password:secret,phone:'900000001',dni:'00000001',privacyConsent:true};
  await call('auth/register',{name:'No details',email:'empty@example.test',password:secret},'',400);
  await call('auth/register',{...registration,dni:'1234'},'',400);
  await call('auth/register',{...registration,phone:'123'},'',400);
  await call('auth/register',{...registration,privacyConsent:false},'',400);
  const a=await call('auth/register',registration),user=(await a.json()).user;
  const b=await call('auth/register',{...registration,name:'QA Other',email:'other@example.test',phone:'+51900000002',dni:'00000002'});
  check(user.phone==='+51900000001'&&!user.emailVerified&&!user.phoneVerified&&user.profileComplete,'registration normalizes mobile and does not claim verification');
  check(!('dni' in user)&&!('password_hash'in user),'session response excludes DNI and password hash');
  const client=(await db().query('SELECT datos,telefono,documento FROM clientes WHERE id=$1',[user.clientId])).rows[0];
  check(client.telefono===user.phone&&client.documento===registration.dni&&client.datos.taxId===registration.dni,'registered contact data reaches the real client record');
  const proposal={values:{...quoteDefaults,offering:'Synthetic proposal for production flow',sector:'commerce',problem:'Improve the product catalogue.',privacyAcknowledged:true},idempotencyKey:randomUUID()};
  process.env.CONTACT_VERIFICATION_ENABLED='false';
  const noVerification=await(await call('auth/verification',undefined,a.cookie)).json();
  check(!noVerification.verificationEnabled&&!noVerification.emailRequired&&!noVerification.phoneRequired&&!noVerification.emailVerified&&!noVerification.phoneVerified,'disabled verification accepts contact details without falsely confirming them, even with legacy required flags');
  const preferred=await(await call('account/quote-requests',{...proposal,values:{...proposal.values,paymentPreference:'daily'},idempotencyKey:randomUUID()},a.cookie)).json();
  check(preferred.values.paymentPreference==='daily','unverified client can save a payment frequency preference without providers');
  const myRequests=await(await call('account/quote-requests',undefined,a.cookie)).json();
  const ownerRequests=await(await call('billing/quote-requests',undefined,admin.cookie)).json();
  check(myRequests.some(q=>q.id===preferred.id)&&ownerRequests.some(q=>q.id===preferred.id&&q.values.paymentPreference==='daily'),'both portals see the persisted preference');
  await call('auth/verification/send',{channel:'email'},a.cookie,503);
  check(emails.length===0&&sms.length===0,'disabled contact verification sends no provider requests');
  const options=await(await call('public/payment-options')).json();
  check(!('rates'in options)&&!!options.prices,'public pricing does not expose administrator financing rates');
  const settings=await app.get(BillingService).settings();
  const oldRates={...settings.rates};delete oldRates.daily;
  await db().query("UPDATE configuracion SET datos=$1 WHERE id='billing'",[JSON.stringify({...settings,rates:oldRates})]);
  check((await app.get(BillingService).settings()).rates.daily===0,'existing settings receive a safe daily default without changing stored agreements');
  const pdf=app.get(PdfService),originalRender=pdf.quotePdf;
  let rendered;
  pdf.quotePdf=function(...args){rendered=args;return originalRender.apply(this,args);};
  let preview;
  try {preview=await pdf.preliminary({values:{...proposal.values,paymentPreference:'daily'},mode:'monthly',count:12,expectedMinCents:preferred.result.min*100});}
  finally {pdf.quotePdf=originalRender;}
  check(rendered[0].feeCents===0&&rendered[0].totalCents===rendered[0].baseCents&&rendered[3]==='Diario','preliminary PDF never adds financing even for legacy payment-mode input');
  check(Buffer.from(preview.bytes).subarray(0,5).toString()==='%PDF-','preliminary preference PDF is generated');
  const previewArg=process.argv.indexOf('--preview-pdf');if(previewArg>=0)await writeFile(path.resolve(process.argv[previewArg+1]),preview.bytes);
  const daily=await(await call('billing/quotes',{clientId:user.clientId,projectName:'QA Daily agreement',service:'landing',scope:'Scope for the agreed daily plan.',observations:'',conditions:'Agreed with client.',delivery:'15 días',baseCents:10000,plan:{mode:'daily',rate:3,count:3,firstDueDate:'2026-12-30'},status:'draft',issuedDate:'2026-12-01',validUntil:'2027-01-31',isDemo:false},admin.cookie)).json();
  check(daily.feeCents===300&&daily.totalCents===10300&&daily.schedule.map(q=>q.date).join(',')==='2026-12-30,2026-12-31,2027-01-01','administrator alone sets the daily agreement and surcharge');
  process.env.CONTACT_VERIFICATION_ENABLED='true';
  await call('account/quote-requests',proposal,a.cookie,403);
  await call('auth/verification/send',{channel:'email'},a.cookie,503);
  await call('auth/verification/send',{channel:'phone'},a.cookie,503);
  check((await(await call('auth/verification',undefined,a.cookie)).json()).identityVerified===false,'DNI is explicitly declared, never falsely verified');
  Object.assign(process.env,{RESEND_API_KEY:'synthetic-not-a-real-key',EMAIL_FROM:'TUKNEX QA <qa@example.test>',VERIFICATION_SECRET:'synthetic-verification-secret-not-for-use-2026',TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'synthetic-token',TWILIO_VERIFY_SERVICE_SID:'VA'+'2'.repeat(32)});
  emailFailure=true;await call('auth/verification/send',{channel:'email'},a.cookie,503);emailFailure=false;
  check((await db().query('SELECT id FROM verificaciones')).rows.length===0,'failed provider acceptance creates no usable challenge');
  const sent=await(await call('auth/verification/send',{channel:'email'},a.cookie)).json();
  check(sent.accepted===true&&!('code'in sent),'send endpoint never returns a verification code');
  const challenge=(await db().query("SELECT * FROM verificaciones WHERE usuario_id=$1 AND proposito='email'",[user.id])).rows[0];
  check(challenge.codigo_hash.length===64&&!JSON.stringify(challenge).includes(emails.at(-1).code),'verification stores a keyed hash, no plaintext code');
  await call('auth/verification/send',{channel:'email'},a.cookie,409);
  await call('auth/verification/confirm',{channel:'email',code:emails.at(-1).code},b.cookie,400);
  for(let i=0;i<5;i++)await call('auth/verification/confirm',{channel:'email',code:'000000'},a.cookie,400);
  check((await db().query('SELECT intentos FROM verificaciones WHERE id=$1',[challenge.id])).rows[0].intentos===5,'failed attempts commit and enforce a maximum of five');
  await call('auth/verification/confirm',{channel:'email',code:emails.at(-1).code},a.cookie,400);
  await db().query('UPDATE verificaciones SET created_at=$1 WHERE usuario_id=$2',[new Date(Date.now()-61000).toISOString(),user.id]);
  await call('auth/verification/send',{channel:'email'},a.cookie);
  const expiredCode=emails.at(-1).code;
  await db().query("UPDATE verificaciones SET expires_at=$1 WHERE usuario_id=$2 AND proposito='email'",['2000-01-01',user.id]);
  await call('auth/verification/confirm',{channel:'email',code:expiredCode},a.cookie,400);
  await db().query('UPDATE verificaciones SET created_at=$1 WHERE usuario_id=$2',[new Date(Date.now()-61000).toISOString(),user.id]);
  await call('auth/verification/send',{channel:'email'},a.cookie);
  const emailCode=emails.at(-1).code;
  check((await(await call('auth/verification/confirm',{channel:'email',code:emailCode},a.cookie)).json()).emailVerified,'valid email code confirms the contact');
  await call('auth/verification/confirm',{channel:'email',code:emailCode},a.cookie,400);
  await call('account/quote-requests',proposal,a.cookie,403);
  await call('auth/verification/send',{channel:'phone'},a.cookie);
  check(sms.at(-1).to===user.phone,'SMS destination is the signed-in account phone');
  await call('auth/verification/confirm',{channel:'phone',code:'123456'},a.cookie,400);
  phoneApproved=true;
  check((await(await call('auth/verification/confirm',{channel:'phone',code:'123456'},a.cookie)).json()).phoneVerified,'SMS is verified only after provider approval');
  await call('account/quote-requests',proposal,a.cookie);
  await call('account/profile',{name:'QA Guest',phone:'+51911111111',address:'QA only'},a.cookie,200,'PATCH');
  check(!(await(await call('auth/verification',undefined,a.cookie)).json()).phoneVerified,'editing a mobile revokes its previous verification');
  await call('account/quote-requests',proposal,a.cookie);
  await call('account/quote-requests',{...proposal,idempotencyKey:randomUUID()},a.cookie,403);
  await call('auth/verification/confirm',{channel:'phone',code:'123456'},a.cookie,400);
  await call('auth/verification/profile',{phone:'+51911111111',dni:'00000003'},a.cookie,200,'PATCH');
  await Promise.all([
    call('account/profile',{name:'QA Guest',phone:'+51911111111',address:'Concurrent QA edit'},a.cookie,200,'PATCH'),
    call('auth/verification/profile',{phone:'+51911111111',dni:'00000003'},a.cookie,200,'PATCH')
  ]);
  const concurrent=await Promise.all([1,2].map(()=>nativeFetch(base+'/api/auth/verification/send',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:b.cookie},body:JSON.stringify({channel:'email'})})));
  check(concurrent.map(r=>r.status).sort().join(',')==='201,409','concurrent resends are serialized and only one is accepted');
  const other=(await(await call('auth/me',undefined,b.cookie)).json());
  for(let i=0;i<9;i++)await db().query("INSERT INTO verificaciones(id,usuario_id,proposito,destino,codigo_hash,expires_at) VALUES($1,$2,'email',$3,$4,$5)",[randomUUID(),other.id,other.email,'0'.repeat(64),new Date(Date.now()+600000).toISOString()]);
  await call('auth/verification/send',{channel:'email'},b.cookie,409);
  await app.close();await open();
  const restarted=await(await call('auth/verification',undefined,a.cookie)).json();
  check(restarted.emailVerified&&!restarted.phoneVerified&&restarted.dniMasked==='••••0003','verification state survives a restart without leaking the full DNI');
  const missing=await(await call('auth/recovery/request',{email:'missing@example.test'})).json();
  const requested=await(await call('auth/recovery/request',{email:registration.email})).json();
  check(JSON.stringify(missing)===JSON.stringify(requested),'recovery request does not reveal whether an email exists');
  const recoveryCode=emails.at(-1).code;
  await call('auth/recovery/confirm',{email:registration.email,code:'000000',password:secret+'new'},'',400);
  await call('auth/recovery/confirm',{email:registration.email,code:recoveryCode,password:secret+'new'});
  await call('auth/me',undefined,a.cookie,401);
  await call('auth/me',undefined,b.cookie);
  await call('auth/login',{email:registration.email,password:secret},'',401);
  await call('auth/login',{email:registration.email,password:secret+'new'});
  await call('auth/recovery/confirm',{email:registration.email,code:recoveryCode,password:secret+'again'},'',400);
  await call('public/contact',{name:'QA Contact',email:'contact@example.test',message:'This is a synthetic contact message.',consent:false},'',400);
  await call('public/contact',{name:'QA Contact',email:'contact@example.test',message:'This is a synthetic contact message.',consent:true});
  await call('public/contact',{name:'QA Bot',email:'bot@example.test',message:'This is a synthetic bot submission.',consent:true,website:'spam'});
  await call('billing/contact-messages',undefined,b.cookie,403);
  const inbox=await(await call('billing/contact-messages',undefined,admin.cookie)).json();
  check(inbox.length===1&&inbox[0].name==='QA Contact','contact messages persist and honeypot submissions are excluded');
  await call('billing/contact-messages/'+inbox[0].id,{status:'reviewed'},admin.cookie,200,'PATCH');
  check((await(await call('billing/contact-messages',undefined,admin.cookie)).json())[0].status==='reviewed','admin can track a real contact message');
  process.env.NODE_ENV='production';const oldOrigins=process.env.CORS_ORIGINS;process.env.CORS_ORIGINS='https://tuknex.example';
  const oldMode=process.env.BILLING_MODE;process.env.BILLING_MODE='production';if(!process.env.DATABASE_URL)process.env.DATABASE_URL='postgresql://synthetic@localhost/test';
  assert.doesNotThrow(assertProductionConfig);checks++;
  process.env.CORS_ORIGINS='http://localhost:3000';assert.throws(assertProductionConfig,/HTTPS/);checks++;
  process.env.CORS_ORIGINS='https://tuknex.example';delete process.env.RESEND_API_KEY;assert.throws(assertProductionConfig,/RESEND_API_KEY/);checks++;
  process.env.CONTACT_VERIFICATION_ENABLED='false';
  for(const key of ['RESEND_API_KEY','EMAIL_FROM','VERIFICATION_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'])delete process.env[key];
  assert.doesNotThrow(assertProductionConfig);checks++;
  process.env.CONTACT_VERIFICATION_ENABLED='true';assert.throws(assertProductionConfig,/VERIFICATION_SECRET/);checks++;
  process.env.NODE_ENV='test';process.env.CORS_ORIGINS=oldOrigins;process.env.BILLING_MODE=oldMode;
  console.log(JSON.stringify({result:'PASS',checks,storage:postgres?'PostgreSQL isolated schema':'PGlite temporary database',realEmailsSent:0,realSmsSent:0,tests:['optional verification and provider-free production','stored payment preference','administrator daily plan','preliminary PDFs without financing','extended registration','server verification gate','provider failures','keyed OTP hashes','cooldown','attempt limit','replay prevention','SMS approval','phone change revocation','persistent verification','password recovery and session revocation','contact inbox','production configuration guards']},null,2));
}finally{
  global.fetch=nativeFetch;await app?.close();
  if(control){assert.ok(/^tuknex_qa_[a-f0-9]+$/.test(schema));await control.query('DROP SCHEMA "'+schema+'" CASCADE');await control.end();}
  else{assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.ok(path.basename(temporary).startsWith('production-test-'));await rm(temporary,{recursive:true,force:true});}
}
