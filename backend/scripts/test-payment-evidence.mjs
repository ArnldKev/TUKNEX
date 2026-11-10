import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// This regression always runs in a fresh embedded database. Never load the deployment .env.
require('dotenv').config=()=>({parsed:{}});
for(const key of ['DATABASE_URL','RESEND_API_KEY','GROQ_API_KEY','ADMIN_EMAIL','ADMIN_PASSWORD','EMAIL_FROM','VERIFICATION_SECRET'])delete process.env[key];
const temporary=path.resolve('.local-data','payment-evidence-test-'+randomUUID());
process.env.BILLING_MODE='local-demo';process.env.DATA_DIR=temporary;process.env.SEED_DEMO_DATA='false';process.env.NODE_ENV='test';
process.env.REQUIRE_EMAIL_VERIFICATION='false';process.env.REQUIRE_PHONE_VERIFICATION='false';process.env.CORS_ORIGINS='http://127.0.0.1:3000';process.env.QUOTE_AI_ENABLED='false';
await mkdir(temporary,{recursive:true});
const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js'),{provisionAdmin}=require('../dist/auth/private-admin.js');
let app,base,checks=0;
const origin='http://127.0.0.1:3000',password='Synthetic-payment-QA-2026!';
function check(value,message){assert.ok(value,message);checks++;}
async function call(route,body,cookie='',status=body===undefined?200:201,method=body===undefined?'GET':'POST'){
 const res=await fetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 assert.equal(res.status,status,route+': '+(res.status===status?'':await res.clone().text()));checks++;
 return{res,cookie:res.headers.get('set-cookie')?.split(';')[0]||'',json:()=>res.json()};
}
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();
 assert.equal(app.get(Database).mode,'local-demo');checks++;
 await provisionAdmin(app.get(Database),{name:'QA Receipt Owner',email:'owner@evidence.example.test',password});
 const owner=await call('auth/login',{email:'owner@evidence.example.test',password});
 const a=await call('auth/register',{name:'QA Receipt A',email:'a@evidence.example.test',password,phone:'+51900000021',dni:'00000021',privacyConsent:true});
 const b=await call('auth/register',{name:'QA Receipt B',email:'b@evidence.example.test',password,phone:'+51900000022',dni:'00000022',privacyConsent:true});
 const userA=(await a.json()).user;
 const state=await(await call('billing/state',undefined,owner.cookie)).json();
 await call('billing/settings',{issuer:{name:'QA Issuer',taxId:'00000000',address:'QA Address',email:'',phone:''},rates:state.rates},owner.cookie,200,'PATCH');
 await call('billing/clients/'+userA.clientId,{name:'QA Receipt A',taxId:'00000021',address:'QA Address',email:'a@evidence.example.test',phone:'+51900000021',isDemo:false},owner.cookie,200,'PATCH');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
 const contract=await(await call('billing/contracts',{clientId:userA.clientId,projectName:'QA Evidence',service:'landing',scope:'Synthetic scope for private receipt tests.',conditions:'QA only.',observations:'',issuedDate:today,startDate:today,deliveryDate:'2099-12-31',baseCents:10000,plan:{mode:'half',rate:0,count:2,firstDueDate:today},isDemo:false},owner.cookie)).json();
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==','base64');
 const form=new FormData();form.append('file',new Blob([image],{type:'image/png'}),'synthetic-yape.png');
 const uploaded=await fetch(base+'/api/billing/receipts',{method:'POST',headers:{Cookie:owner.cookie,Origin:origin},body:form,signal:AbortSignal.timeout(30000)});
 assert.equal(uploaded.status,201,await uploaded.clone().text());checks++;
 const receipt=await uploaded.json();
 await call('account/receipts/'+receipt.id,undefined,a.cookie,404);
 const payment=await(await call('billing/contracts/'+contract.id+'/payments',{amountCents:7500,date:today,method:'yape',reference:'QA-YAPE-OP',observation:'Synthetic partial distributed payment',receiptId:receipt.id,idempotencyKey:randomUUID()},owner.cookie)).json();
 let adminState=await(await call('billing/state',undefined,owner.cookie)).json();
 const paid=adminState.payments.find(value=>value.id===payment.id);
 check(paid.installmentId===undefined&&paid.allocations.length===2,'distributed payment exposes actual applications without a direct installment');
 check(paid.allocations.map(value=>value.amountCents).sort((a,b)=>a-b).join(',')==='2500,5000','allocation cents are preserved');
 check(adminState.installments.filter(value=>value.contractId===contract.id).every(value=>value.paidDate===today),'paid dates are stable ISO calendar dates');
 check((await(await call('account/overview',undefined,a.cookie)).json()).payments.length===0,'draft payment details remain private');
 await call('account/receipts/'+receipt.id,undefined,a.cookie,404);
 await call('billing/contracts/'+contract.id+'/status',{status:'enviado',version:contract.version},owner.cookie);
 const overview=await(await call('account/overview',undefined,a.cookie)).json();
 check(overview.payments.length===1&&overview.payments[0].receiptId===receipt.id,'owner sees proof metadata only after contract publication');
 check(overview.payments[0].allocations.length===2&&overview.payments[0].allocations.reduce((sum,value)=>sum+value.amountCents,0)===7500,'client receives exact distributed allocations');
 check(overview.installments.some(value=>value.status==='pagada')&&overview.installments.every(value=>value.paidDate===today),'client receives the server installment status and date');
 check(overview.payments[0].date===today&&overview.payments[0].reference==='QA-YAPE-OP','client receives usable date and operation reference');
 check((await(await call('account/overview',undefined,b.cookie)).json()).payments.length===0,'another client receives none of the payment records');
 const file=await call('account/receipts/'+receipt.id,undefined,a.cookie);
 check(Buffer.from(await file.res.arrayBuffer()).equals(image),'authorized client gets the original proof bytes');
 check(file.res.headers.get('content-type').startsWith('image/png')&&file.res.headers.get('cache-control')==='no-store'&&file.res.headers.get('x-content-type-options')==='nosniff','proof is private and content typed');
 await call('account/receipts/'+receipt.id,undefined,b.cookie,404);
 await call('account/receipts/'+receipt.id,undefined,'',401);
 await call('account/receipts/not-a-uuid',undefined,a.cookie,400);
 await call('billing/payments/'+payment.id+'/void',{reason:'QA corrected proof record'},owner.cookie);
 const history=await(await call('account/overview',undefined,a.cookie)).json();
 check(history.payments[0].voided&&history.payments[0].allocations.length===2,'voided history retains its original allocation evidence');
 check(history.installments.every(value=>value.paidCents===0),'voided amounts no longer count as paid');
 await call('account/receipts/'+receipt.id,undefined,a.cookie);
 console.log(JSON.stringify({result:'PASS',checks,storage:'PGlite temporary database',tests:['distributed applications','private image receipt','draft visibility','cross-client IDOR rejection','stable dates','voided history']},null,2));
}finally{
 await app?.close();assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.match(path.basename(temporary),/^payment-evidence-test-[a-f0-9-]+$/);await rm(temporary,{recursive:true,force:true});
}
