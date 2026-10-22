import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import pg from 'pg';
import { config } from 'dotenv';
const require=createRequire(import.meta.url),postgres=process.argv.includes('--postgres');
if(postgres)config({path:'.env',quiet:true});
const schema='tuknex_qa_'+randomUUID().replaceAll('-',''),temporary=path.resolve('.local-data','reviews-test-'+randomUUID());
let control,app,base,checks=0;
if(postgres){control=new pg.Client({connectionString:process.env.DATABASE_URL});await control.connect();await control.query('CREATE SCHEMA "'+schema+'"');const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=url.href;process.env.BILLING_MODE='production';}
else {process.env.BILLING_MODE='local-demo';process.env.DATA_DIR=temporary;await mkdir(temporary,{recursive:true});}
Object.assign(process.env,{NODE_ENV:'test',SEED_DEMO_DATA:'false',CORS_ORIGINS:'http://127.0.0.1:3000',CONTACT_VERIFICATION_ENABLED:'false'});
const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js'),{provisionAdmin}=require('../dist/auth/private-admin.js');
const password='Synthetic-opinions-QA-2026!',origin='http://127.0.0.1:3000';
function check(value,message){assert.ok(value,message);checks++;}
async function call(route,body,cookie='',expected=body===undefined?200:201,method=body===undefined?'GET':'POST') {
  const response=await fetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,expected,route+' '+(response.status===expected?'':await response.clone().text()));checks++;
  return {data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
async function open(){app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();}
try {
  await open();
  await provisionAdmin(app.get(Database),{name:'QA Moderator',email:'moderator@example.test',password});
  const admin=await call('auth/login',{email:'moderator@example.test',password});
  const register=(name,email,dni)=>({name,email,dni,password,phone:'900000001',privacyConsent:true});
  const a=await call('auth/register',register('QA Client One','one@example.test','00000001'));
  const b=await call('auth/register',register('QA Client Two','two@example.test','00000002'));
  const publicList=()=>call('public/reviews');
  const own=()=>call('account/reviews',undefined,a.cookie);
  const input={subject:'application',rating:4,title:'Helpful website',comment:'A real stored QA opinion about using the application.',displayName:'QA Author',displayConsent:false};
  const moderate=(review,updates={})=>({status:'published',moderationNote:'Private QA note',businessReply:'Thank you for your honest opinion.',revision:review.revision,...updates});
  await call('account/reviews',undefined,'',401);
  await call('account/reviews',input,'',401);
  await call('billing/reviews',undefined,b.cookie,403);
  await call('account/reviews',input,admin.cookie,403);
  await call('account/reviews',{...input,rating:6},a.cookie,400);
  await call('account/reviews',{...input,comment:'too short'},a.cookie,400);
  await call('account/reviews',{...input,userId:b.data.user.id,status:'published'},a.cookie,400);
  let review=(await call('account/reviews',input,a.cookie)).data;
  check(review.status==='pending'&&!review.displayConsent,'unverified clients can submit private feedback');
  check((await publicList()).data.length===0,'private and pending opinions are absent from public data');
  await call('billing/reviews/'+review.id,moderate(review),admin.cookie,400,'PATCH');
  await call('billing/reviews/'+review.id,moderate(review),b.cookie,403,'PATCH');
  check((await call('account/reviews',undefined,b.cookie)).data.length===0,'clients only see their own opinions');
  review=(await call('account/reviews',{...input,displayConsent:true},a.cookie)).data;
  check((await own()).data.length===1&&review.revision===2,'editing a subject updates one stored opinion');
  const inbox=(await call('billing/reviews',undefined,admin.cookie)).data;
  check(inbox[0].accountName==='QA Client One','admin can identify the real submitting account');
  review=(await call('billing/reviews/'+review.id,moderate(review),admin.cookie,200,'PATCH')).data;
  let published=(await publicList()).data;
  check(published.length===1&&published[0].comment===input.comment&&published[0].rating===4,'approved content is published without changing the client opinion');
  check(published[0].businessReply==='Thank you for your honest opinion.','approved public reply is included');
  for(const key of ['userId','email','accountName','moderationNote','displayConsent','revision','usuario_id'])check(!(key in published[0]),'public response excludes '+key);
  const old=review;
  review=(await call('account/reviews',{...input,displayConsent:true,comment:'An edited opinion that must receive a fresh review.'},a.cookie)).data;
  check(review.status==='pending'&&review.businessReply===''&&(await publicList()).data.length===0,'editing published content removes it from public view and requires new moderation');
  await call('billing/reviews/'+review.id,moderate(old),admin.cookie,409,'PATCH');
  const concurrent=await Promise.all([1,2].map(()=>fetch(base+'/api/billing/reviews/'+review.id,{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json',Cookie:admin.cookie},body:JSON.stringify(moderate(review))})));
  check(concurrent.map(r=>r.status).sort().join(',')==='200,409','concurrent moderation does not overwrite a newer revision');
  review=(await own()).data[0];
  review=(await call('account/reviews',{...input,displayConsent:false},a.cookie)).data;
  check((await publicList()).data.length===0,'withdrawing publication consent immediately hides the opinion');
  await call('billing/reviews/'+review.id,moderate(review),admin.cookie,400,'PATCH');
  review=(await call('billing/reviews/'+review.id,moderate(review,{status:'rejected',moderationNote:'Please remove personal contact information.'}),admin.cookie,200,'PATCH')).data;
  check((await own()).data[0].moderationNote===review.moderationNote,'moderation notes are visible to the author');
  check((await call('account/reviews',undefined,b.cookie)).data.length===0,'private moderation note is absent from another account');
  await call('account/reviews',{...input,subject:'service',displayConsent:true},a.cookie);
  check((await own()).data.length===2,'service feedback does not require a completed project');
  await app.close();await open();
  check((await own()).data.length===2,'opinions and author sessions survive a restart');
  check((await publicList()).data.length===0,'rejected and pending opinions remain private after restart');
  console.log(JSON.stringify({result:'PASS',checks,storage:postgres?'PostgreSQL isolated schema':'PGlite temporary database',realEmailsSent:0,realSmsSent:0},null,2));
} finally {
  await app?.close();
  if(control){assert.ok(/^tuknex_qa_[a-f0-9]+$/.test(schema));await control.query('DROP SCHEMA "'+schema+'" CASCADE');await control.end();}
  else {assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.ok(path.basename(temporary).startsWith('reviews-test-'));await rm(temporary,{recursive:true,force:true});}
}
