import assert from 'node:assert/strict';
import test from 'node:test';
import {createQuoteProject} from './project';
import {quoteDefaults} from './form';
test('AI transport refuses unrelated revisions and sends consent without contact',async()=>{
 const api=await import('./ai-api').catch(()=>null);assert.ok(api,'Falta transporte IA con control de revisión');
 const p=createQuoteProject(quoteDefaults),original=globalThis.fetch;
 const report={summary:'Propuesta',scope:[],exclusions:[],questions:[],risks:[],acceptanceCriteria:[],visualDirection:'Por definir',suggestions:[]};
 let captured='',revision=1;
 globalThis.fetch=async(_url,options)=>{captured=String(options?.body);return new Response(JSON.stringify({id:crypto.randomUUID(),projectId:p.id,baseRevision:revision,provider:'groq',model:'openai/gpt-oss-120b',generatedAt:new Date().toISOString(),report}));};
 try{
  await assert.rejects(()=>api.analyzeAiProject(p,new AbortController().signal),/versión/);
  revision=0;await api.analyzeAiProject(p,new AbortController().signal);
  assert.equal(JSON.parse(captured).consent,true);assert.equal(JSON.parse(captured).project.answers.email,undefined);
  await api.analyzeAiProject(p,new AbortController().signal,{id:p.id,version:3});
  assert.deepEqual(Object.keys(JSON.parse(captured)).sort(),['consent','policyVersion','version']);
 }finally{globalThis.fetch=original;}
});


 test('formal quote analysis sends only source ID, expected version and separate consent to scoped routes',async()=>{
 const {analyzeAiProject}=await import('./ai-api'),p=createQuoteProject({...quoteDefaults,offering:'Carta de platos',problem:'Ordenar pedidos'}),original=globalThis.fetch;
 let url='',body='';globalThis.fetch=async(input,options)=>{url=String(input);body=String(options?.body);return new Response(JSON.stringify({id:crypto.randomUUID(),projectId:p.id,baseRevision:0,provider:'groq',model:'test-model',generatedAt:new Date().toISOString(),report:{summary:'Carta',scope:[],exclusions:[],questions:[],risks:[],acceptanceCriteria:[],visualDirection:'Claro',suggestions:[]}}));};
 try{await analyzeAiProject(p,new AbortController().signal,{id:p.id,version:4,source:'formal'});assert.ok(url.endsWith('/api/billing/quote-ai/quotes/'+p.id+'/analyze'));assert.equal(JSON.parse(body).version,4);assert.equal(JSON.parse(body).project,undefined);const teamId=crypto.randomUUID();await analyzeAiProject(p,new AbortController().signal,{id:p.id,version:4,source:'team-formal',teamProjectId:teamId});assert.ok(url.endsWith('/api/team/projects/'+teamId+'/quotes/'+p.id+'/analyze'));assert.deepEqual(Object.keys(JSON.parse(body)).sort(),['consent','policyVersion','version']);}finally{globalThis.fetch=original;}
 });
