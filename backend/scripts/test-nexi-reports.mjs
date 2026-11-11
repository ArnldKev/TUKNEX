import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url),temporary=await mkdtemp(path.join(tmpdir(),'tuknex-nexi-'));
require('dotenv').config=()=>({parsed:{}});
for(const key of ['DATABASE_URL','RESEND_API_KEY','SMS_API_KEY','VERIFICATION_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD'])delete process.env[key];
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temporary,SEED_DEMO_DATA:'false',CONTACT_VERIFICATION_ENABLED:'false',REQUIRE_EMAIL_VERIFICATION:'false',REQUIRE_PHONE_VERIFICATION:'false',CORS_ORIGINS:'http://127.0.0.1:3000',NEXI_AI_ENABLED:'true',NEXI_AI_PROVIDER:'groq',NEXI_AI_MODEL:'openai/gpt-oss-120b',GROQ_API_KEY:'synthetic-no-real-provider',NEXI_AUDIO_ENABLED:'false',TRUST_PROXY_HOPS:'0'});
const output=process.env.TUKNEX_TEST_DIST||'../dist';
const {createApp}=require(output+'/main.js'),{Database}=require(output+'/database/database.js'),{provisionAdmin}=require(output+'/auth/private-admin.js'),{quoteDefaults}=require(output+'/domain/quote/form.js'),{createQuoteProject}=require(output+'/domain/quote/project.js');
require('@nestjs/common').Logger.overrideLogger(false);
const origin='http://127.0.0.1:3000',password='Synthetic-Nexi-review-2026!',policyVersion='2026-10-25-v1';
const values={...quoteDefaults,offering:'Carta de 25 platos',sector:'food',problem:'No quiero pagos online; quiero pedidos por WhatsApp',otherFunctions:'Atender 3 sedes',privacyAcknowledged:true};
const project=createQuoteProject(values);
const organized={narrative:'Carta de 25 platos para 3 sedes. No quiero pagos online; quiero pedidos por WhatsApp.',requirements:['Mostrar 25 platos y atender 3 sedes'],exclusions:['No quiero pagos online'],questions:['¿Las sedes comparten carta?'],suggestions:[]};
const analysis={summary:'Carta y pedidos por WhatsApp.',scope:['Catálogo de platos'],exclusions:['No quiero pagos online'],questions:['Confirmar material'],risks:['Fotos pendientes'],acceptanceCriteria:['Pedido continúa por WhatsApp'],visualDirection:'Texto claro y fotos de platos',suggestions:[]};
const realFetch=globalThis.fetch;let mode='normal',providerCalls=0,captured=[],app,db,base,checks=0,release,started;
globalThis.fetch=async(input,options)=>{
 const url=String(input);
 if(url==='https://api.groq.com/openai/v1/chat/completions'){
  providerCalls++;const payload=JSON.parse(options.body);captured.push(payload);let report=payload.response_format.json_schema.name==='tuknex_organized_idea'?organized:analysis;
  if(mode==='missing')report={...organized,narrative:'Carta de productos',requirements:[],exclusions:[]};
  if(mode==='hold'){started?.();await new Promise(resolve=>{release=resolve;});}
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(report)}}]}),{headers:{'Content-Type':'application/json'}});
 }
 if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('External request blocked by test');
 return realFetch(input,options);
};
const check=(value,message)=>{assert.ok(value,message);checks++;};
async function call(route,cookie='',body,status=body===undefined?200:201,method=body===undefined?'GET':'POST'){
 const res=await realFetch(base+'/api/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 assert.equal(res.status,status,route+' '+(res.status===status?'':await res.clone().text()));checks++;return {data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
}
const aiBody=revision=>({version:revision,consent:true,policyVersion});
async function quota(){await db.query('DELETE FROM cotizador_ia_cuotas');}
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(Database);
 await call('quote-ai/organize','',{project,consent:false,policyVersion},400);
 const ordered=await call('quote-ai/organize','',{project,consent:true,policyVersion});check(ordered.data.report.narrative===organized.narrative,'real organization path returns validated structure');
 check((await db.query('SELECT count(*)::int AS n FROM nexi_informes')).rows[0].n===0,'public interpretation creates no staff reports before submission');
 check((await db.query('SELECT count(*)::int AS n FROM solicitudes_cotizacion')).rows[0].n===0,'organization alone creates no quote request');
 check(captured[0].messages[0].content.includes('Conserva literalmente todas las cantidades'),'provider instructed to preserve quantities');check(!captured[0].tools,'no executable tools');
 await quota();mode='missing';await call('quote-ai/organize','',{project,consent:true,policyVersion},502);mode='normal';await quota();
 await provisionAdmin(db,{name:'Owner synthetic',email:'owner-nexi@example.test',password});
 const admin=await call('auth/login','',{email:'owner-nexi@example.test',password});
 const client=await call('auth/register','',{name:'Client synthetic',email:'client-nexi@example.test',password,phone:'900000001',dni:'00000001',privacyConsent:true});
 const a=await call('team/members',admin.cookie,{name:'Developer A',email:'dev-nexi-a@example.test',password}),b=await call('team/members',admin.cookie,{name:'Developer B',email:'dev-nexi-b@example.test',password});
 const staffA=await call('auth/login','',{email:'dev-nexi-a@example.test',password}),staffB=await call('auth/login','',{email:'dev-nexi-b@example.test',password});
 const approved={id:ordered.data.id,sourceProjectId:project.id,sourceRevision:project.revision,approvedAt:new Date().toISOString(),original:{offering:values.offering,problem:values.problem,otherFunctions:values.otherFunctions,customers:values.customers},reviewed:{narrative:organized.narrative,requirements:organized.requirements,exclusions:organized.exclusions,questions:organized.questions},protectedDetails:[]};
 const request=(await call('account/quote-requests',client.cookie,{values:{...values,approvedIdea:approved},idempotencyKey:randomUUID()})).data;
 check(request.values.approvedIdea.id===ordered.data.id,'approved organization persists only with explicit request submit');
 const work=(await call('team/projects',admin.cookie,{requestId:request.id,assigneeId:a.data.id})).data;
 const source='nexi-reports/request/'+request.id;
 await call(source,'',undefined,401);await call(source,client.cookie,undefined,403);await call(source,staffB.cookie,undefined,404);
 await call(source+'/generate',staffB.cookie,aiBody(request.revision),404);await call(source+'/generate',admin.cookie,aiBody(999),409);
 const generated=(await call(source+'/generate',staffA.cookie,aiBody(request.revision))).data;
 check(generated.envelope.report.summary===analysis.summary,'assigned subadmin generates stored canonical report');
 check(generated.sourceRevision===request.revision,'report binds exact source revision');
 const review={expectedVersion:0,reviewed:{...analysis,summary:'Resumen humano revisado.'},approved:true,internalNote:'INTERNAL_ONLY_SYNTHETIC_NOTE',idempotencyKey:randomUUID()};
 const revision=(await call(source+'/'+generated.id+'/reviews',staffA.cookie,review)).data;check(revision.version===1,'human approval creates first immutable version');
 check((await call(source+'/'+generated.id+'/reviews',staffA.cookie,review)).data.version===1,'same operation replays idempotently');
 await call(source+'/'+generated.id+'/reviews',staffA.cookie,{...review,internalNote:'changed'},409);
 await call(source+'/'+generated.id+'/reviews',staffA.cookie,{...review,idempotencyKey:randomUUID()},409);
 const reopened=(await call(source,admin.cookie)).data.reports[0];check(reopened.reviews[0].reviewed.summary==='Resumen humano revisado.'&&reopened.envelope.report.summary===analysis.summary,'reopen separates reviewed report from original generation');
 check(reopened.reviews[0].internalNote===review.internalNote,'internal note retained privately');
 check(!JSON.stringify((await call('account/overview',client.cookie)).data).includes('INTERNAL_ONLY_SYNTHETIC_NOTE'),'client overview never exposes internal notes');
 await assert.rejects(()=>db.query('UPDATE nexi_informes SET generado=$2 WHERE id=$1',[generated.id,'{}']),/conservan|historial/i);checks++;
 await assert.rejects(()=>db.query('DELETE FROM nexi_informe_revisiones WHERE informe_id=$1',[generated.id]),/conservan|historial/i);checks++;
 await quota();mode='hold';const pendingStarted=new Promise(resolve=>{started=resolve;});const pending=call(source+'/generate',admin.cookie,aiBody(request.revision),409);await pendingStarted;await db.query('UPDATE solicitudes_cotizacion SET revision=revision+1 WHERE id=$1',[request.id]);release();await pending;mode='normal';
 check((await db.query('SELECT count(*)::int AS n FROM nexi_informes')).rows[0].n===1,'source changed during provider call produces no stale stored report');
 await call(source+'/'+generated.id+'/reviews',admin.cookie,{...review,expectedVersion:1,idempotencyKey:randomUUID()},409);
 const formal=(await call('team/projects/'+work.id+'/quotes',staffA.cookie,{clientId:client.data.user.clientId,projectName:'Synthetic formal',service:'catalog',scope:'Carta de 25 platos',conditions:'No pagos online',observations:'Fotografías por confirmar',delivery:'15 días',baseCents:45000,plan:{mode:'cash',rate:0,count:1,firstDueDate:'2026-11-10'},status:'draft',issuedDate:'2026-11-10',validUntil:'2026-11-24',isDemo:false})).data;
 await quota();const storedFormal=(await call('nexi-reports/formal/'+formal.id+'/generate',staffA.cookie,aiBody(formal.version))).data;
 check(storedFormal.sourceKind==='formal'&&storedFormal.envelope.projectId===formal.id,'formal quote report binds canonical financial source');
 const context=JSON.parse(captured.at(-1).messages[1].content);check(context.formalQuoteTerms.scope==='Carta de 25 platos','formal full terms reach provider');check(!JSON.stringify(context).includes('45000'),'provider does not set or receive prices');
 await call('team/projects/'+work.id+'/assignment',admin.cookie,{assigneeId:b.data.id,revision:work.revision},200,'PATCH');
 await call('nexi-reports/formal/'+formal.id,staffA.cookie,undefined,404);check((await call('nexi-reports/formal/'+formal.id,staffB.cookie)).data.reports.length===1,'current assignment controls historical report visibility');
 console.log(JSON.stringify({result:'PASS',checks,stubProviderCalls:providerCalls,realProviderCalls:0,realEmailCalls:0,realDatabaseCalls:0},null,2));
}finally{globalThis.fetch=realFetch;await app?.close();assert.equal(path.dirname(temporary),tmpdir());assert.ok(path.basename(temporary).startsWith('tuknex-nexi-'));await rm(temporary,{recursive:true,force:true});}
