import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url), temporary=path.resolve('.local-data','ai-test-'+randomUUID());
const origin='http://127.0.0.1:3302';
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temporary,SEED_DEMO_DATA:'false',CONTACT_VERIFICATION_ENABLED:'false',CORS_ORIGINS:origin,NEXI_AI_ENABLED:'false',NEXI_AI_PROVIDER:'groq',NEXI_AI_MODEL:'openai/gpt-oss-120b',GROQ_API_KEY:'synthetic-test-key-not-real',QUOTE_DRAFTS_ENABLED:'true',QUOTE_DRAFTS_RETENTION_DAYS:'30',TRUST_PROXY_HOPS:'1'});
await mkdir(temporary,{recursive:true});
require('@nestjs/common').Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js');
const {AuthService}=require('../dist/auth/auth.js'),{provisionAdmin}=require('../dist/auth/private-admin.js');
const {createQuoteProject}=require('../dist/domain/quote/project.js'),{quoteDefaults}=require('../dist/domain/quote/form.js');
const project=createQuoteProject({...quoteDefaults,businessName:'Nombre privado',offering:'Carta de pollos. a@example.test +51 934631664',sector:'food',problem:'No quiero pagos online; quiero pedidos por WhatsApp'});
const policyVersion='2026-10-25-v1', body={project,consent:true,policyVersion};
const report={summary:'Carta para organizar pedidos por WhatsApp.',scope:['Carta y contacto por WhatsApp'],exclusions:['No incluye pagos online'],questions:['¿Cuántos platos mostrarás?'],risks:['Confirmar fotos y contenido'],acceptanceCriteria:['El pedido puede continuar por WhatsApp'],visualDirection:'Fotografías grandes y texto claro',suggestions:[{title:'Mostrar la carta',reason:'El cliente quiere organizar los pedidos',evidenceFields:['problem'],target:'addFeature',value:'catalog'}]};
let app,db,base,checks=0,captured=[],mode='ok',sequence=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)==='https://api.groq.com/openai/v1/chat/completions'){
  captured.push(JSON.parse(options.body));
  if(mode==='rate')return new Response('private provider error',{status:429});
  if(mode==='outage')throw Error('private key must never appear');
  if(mode==='slow')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
  if(mode==='large')return new Response('x'.repeat(40000));
  const data=mode==='invalid'?{...report,price:1}:mode==='evidence'?{...report,suggestions:[{...report.suggestions[0],evidenceFields:['otherFunctions']}]}:report;
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(data)}}],usage:{prompt_tokens:500,completion_tokens:500,total_tokens:1000}}),{headers:{'content-type':'application/json'}});
 }
 return originalFetch(url,options);
};
function check(value,message){assert.ok(value,message);checks++;}
async function call(route,{value,method=value===undefined?'GET':'POST',status=value===undefined?200:201,cookie='',requestOrigin=origin,ip='198.51.100.'+(++sequence%200+1)}={}){
 const r=await originalFetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Origin:requestOrigin,'X-Forwarded-For':ip,...(cookie?{Cookie:cookie}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,status,route+': '+(r.status===status?'':await r.clone().text()));checks++;
 return {data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function reset(){await db.query('DELETE FROM cotizador_ia_cuotas');}
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(Database);
 check((await call('quote-ai/config')).data.enabled===false,'disabled by default');
 await call('quote-ai/analyze',{value:body,status:503});
 check(captured.length===0,'disabled service never reaches provider');
 process.env.NEXI_AI_ENABLED='true';
 const config=(await call('quote-ai/config')).data;
 check(config.enabled&&config.dailyLimit===40&&!JSON.stringify(config).includes(process.env.GROQ_API_KEY),'public config reveals availability, not credentials');
 await call('quote-ai/analyze',{value:body,status:403,requestOrigin:'https://evil.example'});
 await call('quote-ai/analyze',{value:body,status:403,requestOrigin:''});
 await call('quote-ai/analyze',{value:{...body,consent:false},status:400});
 await call('quote-ai/analyze',{value:{...body,policyVersion:'wrong'},status:400});
 await call('quote-ai/analyze',{value:{...body,price:1},status:400});
 await call('quote-ai/analyze',{value:{...body,project:{...project,answers:{...project.answers,email:'p@example.test'}}},status:400});
 const first=(await call('quote-ai/analyze',{value:body})).data;
 check(first.projectId===project.id&&first.baseRevision===project.revision&&first.report.summary===report.summary,'response bound to exact project and revision');
 const sent=JSON.stringify(captured[0]);
 for(const secret of ['Nombre privado','a@example.test','934631664',project.id])check(!sent.includes(secret),'outgoing context excludes '+secret);
 check(sent.includes('No quiero pagos online'),'negation reaches provider unchanged');
 check(captured[0].response_format.json_schema.strict===true&&captured[0].max_completion_tokens===1600,'bounded structured completion');
 check(!Object.hasOwn(captured[0],'tools'),'model cannot execute tools');
 const metadata=JSON.stringify((await db.query('SELECT * FROM cotizador_ia_cuotas')).rows);
 check(!metadata.includes('198.51.100')&&!metadata.includes(project.answers.problem),'quota stores neither raw IP nor project text');
 await reset();mode='invalid';const bad=await call('quote-ai/analyze',{value:body,status:502});check(!JSON.stringify(bad).includes('private'),'invalid provider output is rejected without leaking details');
 await reset();mode='evidence';await call('quote-ai/analyze',{value:body,status:502});
 await reset();mode='rate';await call('quote-ai/analyze',{value:body,status:429});
 await reset();mode='outage';await call('quote-ai/analyze',{value:body,status:503});
 await reset();mode='large';await call('quote-ai/analyze',{value:body,status:502});
 await reset();mode='ok';
 const concurrent=await Promise.all([1,2,3].map(()=>originalFetch(base+'/api/quote-ai/analyze',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Forwarded-For':'198.51.100.210'},body:JSON.stringify(body)})));
 check(concurrent.filter(r=>r.status===201).length===1&&concurrent.filter(r=>r.status===429).length===2,'concurrent requests share persistent visitor limits');
 await reset();
 for(let i=0;i<5;i++){await db.query("DELETE FROM cotizador_ia_cuotas WHERE scope LIKE '%minute%'");await call('quote-ai/analyze',{value:body,ip:'198.51.100.211'});}
 await db.query("DELETE FROM cotizador_ia_cuotas WHERE scope LIKE '%minute%'");await call('quote-ai/analyze',{value:body,ip:'198.51.100.211',status:429});
 await reset();await db.query("INSERT INTO cotizador_ia_cuotas(scope,window_start,hits) VALUES('global-day',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',40)");
 await call('quote-ai/analyze',{value:body,status:429});
 await reset();
 await call('billing/quote-ai/'+project.id+'/analyze',{value:{version:1,consent:true,policyVersion},status:401});
 const password='Synthetic-AI-preview-2026!';
 await provisionAdmin(db,{name:'Equipo de prueba',email:'admin@example.test',password});
 await app.get(AuthService).register({name:'Cliente de prueba',email:'client@example.test',password,phone:'900000001',dni:'00000001',privacyConsent:true});
 const admin=await call('auth/login',{value:{email:'admin@example.test',password}}),client=await call('auth/login',{value:{email:'client@example.test',password}});
 await call('billing/quote-ai/'+project.id+'/analyze',{value:{version:1,consent:true,policyVersion},cookie:client.cookie,status:403});
 const device=await call('quote-drafts/session',{value:{consent:true,policyVersion}});
 await call('quote-drafts',{value:{project,step:1,consent:true,policyVersion,accountId:null},cookie:device.cookie});
 await call('billing/quote-ai/'+project.id+'/analyze',{value:{version:99,consent:true,policyVersion},cookie:admin.cookie,status:404});
 const adminReport=(await call('billing/quote-ai/'+project.id+'/analyze',{value:{version:1,consent:true,policyVersion},cookie:admin.cookie})).data;
 check(adminReport.projectId===project.id&&adminReport.baseRevision===0,'admin analyzes server snapshot, not supplied text');
 await call('billing/quote-ai/'+project.id+'/analyze',{value:{version:1,consent:true,policyVersion,project},cookie:admin.cookie,status:400});
 check((await db.query('SELECT version FROM cotizador_borradores WHERE id=$1',[project.id])).rows[0].version===1,'analysis never mutates client draft');
 check((await db.query('SELECT count(*)::int AS n FROM solicitudes_cotizacion')).rows[0].n===0,'analysis creates no quotes or contracts');
 await reset();
 await call('billing/quote-ai/requests/'+randomUUID()+'/analyze',{value:{version:1,consent:true,policyVersion},status:401});
 const submitted=(await call('account/quote-requests',{value:{values:{...quoteDefaults,...project.answers,privacyAcknowledged:true},idempotencyKey:randomUUID()},cookie:client.cookie})).data;
 const formal=(await call('billing/quote-ai/requests/'+submitted.id+'/analyze',{value:{version:1,consent:true,policyVersion},cookie:admin.cookie})).data;
 check(formal.projectId===submitted.id&&formal.baseRevision===0,'admin can analyze an immutable formal request without sending contacts');
 await call('billing/quote-ai/requests/'+submitted.id+'/analyze',{value:{version:1,consent:true,policyVersion},cookie:client.cookie,status:403});
 await reset();
 const {EventEmitter}=await import('node:events'),{QuoteAiService}=require('../dist/ai/quote-ai.js');
 let releaseSql;const barrier=new Promise(resolve=>{releaseSql=resolve;});
 const slowDb={query:async(sql,params)=>{await barrier;return db.query(sql,params);},transaction:fn=>db.transaction(fn)};
 const disconnected=new EventEmitter();disconnected.destroyed=false;disconnected.writableEnded=false;
 const beforeCalls=captured.length,pending=new QuoteAiService(slowDb).analyze({ip:'198.51.100.240'},project,disconnected);
 disconnected.destroyed=true;disconnected.emit('close');releaseSql();
 await assert.rejects(pending,/cancel/i,'cancelled before quota reservation must not reach Groq');checks++;
 check(captured.length===beforeCalls,'disconnect before SQL completes prevents an external call');
 console.log(JSON.stringify({result:'PASS',checks,realProviderCalls:0,realEmails:0},null,2));
}finally{globalThis.fetch=originalFetch;await app?.close();assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.ok(path.basename(temporary).startsWith('ai-test-'));await rm(temporary,{recursive:true,force:true});}

