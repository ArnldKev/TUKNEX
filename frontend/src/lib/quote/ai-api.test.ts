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

