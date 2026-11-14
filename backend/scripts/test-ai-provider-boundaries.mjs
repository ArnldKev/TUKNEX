import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {requestGroqReport,AiProviderError}=require('../dist/ai/groq.js');
const {transcribeAudio}=require('../dist/ai/groq-audio.js');
const {createQuoteProject}=require('../dist/domain/quote/project.js');
const {quoteDefaults}=require('../dist/domain/quote/form.js');
process.env.GROQ_API_KEY='synthetic-provider-boundary-key';process.env.NEXI_AI_MODEL='openai/gpt-oss-120b';
const project=createQuoteProject({...quoteDefaults,offering:'Carta de restaurante',problem:'Quiero pedidos por WhatsApp',sector:'food'});
function file(){const buffer=Buffer.alloc(44);buffer.write('RIFF',0);buffer.write('WAVE',8);return{buffer,size:buffer.length,mimetype:'audio/wav'};}
const providers=[{name:'text',limit:32768,run:()=>requestGroqReport(project)},{name:'audio',limit:16384,run:()=>transcribeAudio(file(),new AbortController().signal)}];
for(const provider of providers){
 for(const [label,status,contentLength,expected] of [['quota',429,null,429],['unavailable',503,null,503],['declared oversize',200,provider.limit+1,502]]){
  test(`${provider.name}: closes rejected ${label} response without exposing its body`,async()=>{
   let cancelled=0;const original=globalThis.fetch;
   const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('private upstream detail'));},cancel(){cancelled++;}});
   globalThis.fetch=async()=>new Response(stream,{status,headers:contentLength?{'content-length':String(contentLength)}:{}});
   try{await assert.rejects(provider.run(),error=>error instanceof AiProviderError&&error.status===expected&&!error.message.includes('private'));assert.equal(cancelled,1,'rejected upstream response must be cancelled');}
   finally{globalThis.fetch=original;}
  });
 }
 test(`${provider.name}: preserves bounded-response error when stream cancellation fails`,async()=>{
  const original=globalThis.fetch;let cancelled=0;
  globalThis.fetch=async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(provider.limit+1));},cancel(){cancelled++;throw Error('private cancellation failure');}}));
  try{await assert.rejects(provider.run(),error=>error instanceof AiProviderError&&error.status===502&&!error.message.includes('private'));assert.equal(cancelled,1);}
  finally{globalThis.fetch=original;}
 });
}
test('audio: malformed provider segments produce a sanitized upstream error',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({text:'Una respuesta sintética.',duration:5,segments:[null]});
 try{await assert.rejects(transcribeAudio(file(),new AbortController().signal),error=>error instanceof AiProviderError&&error.status===502);}
 finally{globalThis.fetch=original;}
});
test('audio: valid transcript and absent segment metadata remain supported',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({text:'No quiero pagos online.',duration:5});
 try{assert.deepEqual(await transcribeAudio(file(),new AbortController().signal),{text:'No quiero pagos online.',duration:5});}
 finally{globalThis.fetch=original;}
});


// Text-provider regressions use synthetic responses only. Each test restores fetch
// and the static logger; these top-level tests deliberately run sequentially.
const {Logger}=require('@nestjs/common');
const {FEATURES}=require('../dist/domain/pricing.js');
const privateMarker='private-provider-payload-never-expose';
const validReport={summary:'Carta para organizar pedidos por WhatsApp.',scope:['Carta de platos'],exclusions:['Confirmar medios de pago'],questions:['¿Cuántos platos se mostrarán?'],risks:['Confirmar fotografías'],acceptanceCriteria:['El contacto permite continuar por WhatsApp'],visualDirection:'Texto claro con fotografías del menú',suggestions:[]};
const suggestion={title:'Mostrar el catálogo',reason:'El cliente desea organizar los pedidos',evidenceFields:['problem'],target:'addFeature',value:'catalog'};
const textEnvelope=(report=validReport,choice={})=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(report)},...choice}]});
async function withTextResponse(response,check){
 const originalFetch=globalThis.fetch,originalWarn=Logger.warn,captured=[],warnings=[];
 globalThis.fetch=async(url,options)=>{captured.push({url:String(url),body:JSON.parse(options.body)});return response();};
 Logger.warn=(...args)=>{warnings.push(args.map(value=>typeof value==='string'?value:JSON.stringify(value)).join(' '));};
 try{return await check(captured,warnings);}finally{globalThis.fetch=originalFetch;Logger.warn=originalWarn;}
}
async function rejectedText(response,diagnosticCode){
 await withTextResponse(response,async(captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>{
   assert.ok(error instanceof AiProviderError);assert.equal(error.status,502);assert.equal(error.diagnosticCode,diagnosticCode);
   assert.ok(!String(error.message).includes(privateMarker));assert.ok(!JSON.stringify(error).includes(privateMarker));return true;
  });
  assert.equal(captured.length,1,'a rejected analysis must not silently retry or consume another request');
  assert.ok(warnings.some(message=>message.includes(diagnosticCode)),'a rejected analysis must record its safe categorical diagnostic');
  assert.ok(warnings.every(message=>!message.includes(privateMarker)),'provider diagnostics must never expose model output');
 });
}
for(const [label,response] of [
 ['even when content is valid JSON',()=>Response.json(textEnvelope(validReport,{finish_reason:'length'}))],
 ['when content is also incomplete',()=>Response.json(textEnvelope(validReport,{finish_reason:'length',message:{content:'{"summary":"'+privateMarker}}))],
])test('text: categorizes truncated generation '+label,{concurrency:false},()=>rejectedText(response,'NEXI_AI_TRUNCATED'));

for(const [label,response] of [
 ['malformed HTTP envelope',()=>new Response('{'+privateMarker)],
 ['missing choices',()=>Response.json({detail:privateMarker})],
 ['empty choices',()=>Response.json({choices:[],detail:privateMarker})],
 ['missing content',()=>Response.json({choices:[{finish_reason:'stop',message:{detail:privateMarker}}]})],
 ['nontext content',()=>Response.json({choices:[{finish_reason:'stop',message:{content:{detail:privateMarker}}}]})],
 ['malformed content JSON',()=>Response.json(textEnvelope(validReport,{message:{content:'{"summary":"'+privateMarker}}))],
])test('text: categorizes '+label,{concurrency:false},()=>rejectedText(response,'NEXI_AI_FORMAT'));

const {scope:_scope,...missingScope}=validReport;
for(const [label,report] of [
 ['missing required report field',missingScope],
 ['unknown extra report field',{...validReport,providerPrivateDetail:privateMarker}],
 ['unsupported suggestion target',{...validReport,suggestions:[{...suggestion,target:'execute',value:privateMarker}]}],
 ['unsupported feature',{...validReport,suggestions:[{...suggestion,value:privateMarker}]}],
 ['unsupported palette',{...validReport,suggestions:[{...suggestion,target:'palette',value:'#123456'}]}],
 ['unsupported font',{...validReport,suggestions:[{...suggestion,target:'font',value:'Comic Sans'}]}],
 ['empty evidence field',{...validReport,suggestions:[{...suggestion,evidenceFields:['otherFunctions']}]}],
])test('text: rejects '+label+' even if provider ignores the supplied schema',{concurrency:false},()=>rejectedText(()=>Response.json(textEnvelope(report)),'NEXI_AI_VALIDATION'));

for(const [label,choice] of [
 ['explicit refusal',{finish_reason:'stop',message:{refusal:privateMarker,content:JSON.stringify(validReport)}}],
 ['content filter',{finish_reason:'content_filter',message:{content:JSON.stringify(validReport),detail:privateMarker}}],
])test('text: categorizes '+label,{concurrency:false},()=>rejectedText(()=>Response.json(textEnvelope(validReport,choice)),'NEXI_AI_REFUSED'));

test('text: a valid stopped report passes unchanged without an implicit retry',{concurrency:false},async()=>{
 const report={...validReport,suggestions:[suggestion,{...suggestion,target:'palette',value:'turquesa'},{...suggestion,target:'font',value:'sans'}]};
 await withTextResponse(()=>Response.json(textEnvelope(report)),async(captured)=>{
  assert.deepEqual(await requestGroqReport(project),report);assert.equal(captured.length,1);
  assert.equal(captured[0].url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(captured[0].body.max_completion_tokens,4096);assert.equal(captured[0].body.include_reasoning,false);
 });
});

test('text: generation schema constrains every suggestion value and excludes unavailable evidence',{concurrency:false},async()=>{
 await withTextResponse(()=>Response.json(textEnvelope()),async(captured)=>{
  await requestGroqReport(project);assert.equal(captured.length,1);
  const format=captured[0].body.response_format;assert.equal(format.type,'json_schema');assert.equal(format.json_schema.strict,true);
  const schema=format.json_schema.schema;assert.equal(schema.additionalProperties,false);
  const variants=schema.properties.suggestions.items.anyOf;assert.ok(Array.isArray(variants),'suggestions must carry complete target-specific schema alternatives');
  const resolve=fragment=>{if(!fragment.$ref)return fragment;assert.ok(fragment.$ref.startsWith('#/$defs/'));const definition=schema.$defs?.[fragment.$ref.slice('#/$defs/'.length)];assert.ok(definition,'every shared schema reference must resolve');return definition;};
  const byTarget=new Map();
  for(const variant of variants){
   assert.equal(variant.type,'object');assert.equal(variant.additionalProperties,false);
   assert.deepEqual([...variant.required].sort(),['evidenceFields','reason','target','title','value']);
   const target=variant.properties.target.const??variant.properties.target.enum?.[0];assert.ok(target);assert.ok(!byTarget.has(target));byTarget.set(target,variant);
   const evidence=resolve(resolve(variant.properties.evidenceFields).items).enum;assert.ok(Array.isArray(evidence));
   assert.ok(evidence.includes('problem'));assert.ok(evidence.includes('offering'));assert.ok(!evidence.includes('otherFunctions'),'empty fields must not be offered as evidence');
   assert.ok(!evidence.includes('email'));assert.ok(!evidence.includes('businessName'));
   assert.ok(Array.isArray(variant.properties.value.enum),'a suggestion must expose allowed values to the provider');
  }
  assert.equal(byTarget.size,10);
  assert.deepEqual([...byTarget.get('font').properties.value.enum].sort(),['editorial','rounded','sans']);
  assert.deepEqual([...byTarget.get('palette').properties.value.enum].sort(),['azul','dorado','morado','naranja','rojo','rosa','turquesa','verde']);
  const features=FEATURES.map(feature=>feature.id).sort();
  assert.deepEqual([...byTarget.get('addFeature').properties.value.enum].sort(),features);
  assert.deepEqual([...byTarget.get('removeFeature').properties.value.enum].sort(),features);
 });
});


for(const [providerStatus,status,code,retryAfterHeader,retryAfter] of [
 [400,502,'REQUEST'],[401,503,'AUTH'],[403,503,'PERMISSION'],[404,503,'MODEL'],
 [413,413,'TOO_LARGE'],[422,502,'UNPROCESSABLE'],
 [429,429,'RATE_LIMIT','45',45],[429,429,'RATE_LIMIT','9999999',3600],
 [429,429,'RATE_LIMIT',privateMarker,60],
 [500,503,'UNAVAILABLE'],[503,503,'UNAVAILABLE','75',75],[504,503,'UNAVAILABLE'],
 [409,503,'HTTP'],
]){
 test(`text: safely classifies upstream HTTP ${providerStatus} with Retry-After ${Boolean(retryAfterHeader)}`,async()=>{
  let cancelled=0;
  const response={status:providerStatus,ok:false,headers:new Headers(retryAfterHeader?{'Retry-After':retryAfterHeader}:{}),
   body:{async cancel(){cancelled++;},getReader(){assert.fail('an upstream error body must never be read');}}};
  await withTextResponse(()=>response,async(captured,warnings)=>{
   let reference;
   await assert.rejects(requestGroqReport(project),error=>{
    assert.ok(error instanceof AiProviderError);
    assert.equal(error.status,status);
    assert.equal(error.diagnosticCode,'NEXI_AI_PROVIDER_'+code);
    assert.equal(error.retryAfter,retryAfter);
    assert.match(error.reference,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    reference=error.reference;
    assert.ok(!error.message.includes(privateMarker));
    return true;
   });
   assert.equal(cancelled,1);
   assert.equal(captured.length,1,'the adapter must never automatically retry');
   assert.deepEqual(warnings,[JSON.stringify({code:'NEXI_AI_PROVIDER_'+code,providerStatus,reference})+' NexiAI']);
  });
 });
}

test('text: accepts an HTTP-date from Retry-After',async()=>{
 const retryAt=new Date(Date.now()+30000).toUTCString();
 await withTextResponse(()=>new Response(privateMarker,{status:503,headers:{'Retry-After':retryAt}}),async()=>{
  await assert.rejects(requestGroqReport(project),error=>error.status===503&&error.retryAfter>=28&&error.retryAfter<=30);
 });
});

test('text: logs only a reference and a fixed code for transport failures',async()=>{
 await withTextResponse(()=>{throw Error(privateMarker);},async(captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>{
   assert.equal(error.diagnosticCode,'NEXI_AI_NETWORK');
   assert.deepEqual(warnings,[JSON.stringify({code:'NEXI_AI_NETWORK',providerStatus:null,reference:error.reference})+' NexiAI']);
   return !error.message.includes(privateMarker);
  });
  assert.equal(captured.length,1);
 });
});

test('text: a cancelled request does not start a provider call',async()=>{
 await withTextResponse(()=>assert.fail('cancelled before fetch'),async(captured)=>{
  await assert.rejects(requestGroqReport(project,AbortSignal.abort(privateMarker)),error=>
   error.diagnosticCode==='NEXI_AI_CANCELLED'&&!error.message.includes(privateMarker));
  assert.equal(captured.length,0);
 });
});
