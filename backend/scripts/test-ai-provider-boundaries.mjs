import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {requestGroqReport,requestGroqOrganizedIdea,AiProviderError}=require('../dist/ai/groq.js');
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

const organized = {
 narrative: 'Un restaurante quiere mostrar su carta y recibir pedidos por WhatsApp.',
 requirements: ['Mostrar la carta'], exclusions: [], questions: [], suggestions: [],
};

for(const [label, run, report, reportKeys] of [
 ['analysis', requestGroqReport, validReport, Object.keys(validReport)],
 ['idea organization', requestGroqOrganizedIdea, organized, Object.keys(organized)],
]) {
 test(`text: ${label} sends a simple strict schema with approved suggestion values and evidence`, async () => {
  await withTextResponse(() => Response.json(textEnvelope(report)), async (captured) => {
   assert.deepEqual(await run(project), report);
   assert.equal(captured.length, 1);
   const format = captured[0].body.response_format;
   assert.equal(format.type, 'json_schema');
   assert.equal(format.json_schema.strict, true);
   const schema = format.json_schema.schema;
   assert.deepEqual(Object.keys(schema.properties).sort(), reportKeys.sort());
   function validateWireSchema(fragment) {
    const allowed = {
     object: ['type', 'properties', 'required', 'additionalProperties'],
     array: ['type', 'items'],
     string: ['type', 'enum'],
    };
    assert.ok(Object.keys(fragment).every(key => allowed[fragment.type]?.includes(key)));
    if(fragment.type === 'array') validateWireSchema(fragment.items);
    if(fragment.type === 'object') {
     assert.equal(fragment.additionalProperties, false);
     assert.deepEqual([...fragment.required].sort(), Object.keys(fragment.properties).sort());
     Object.values(fragment.properties).forEach(validateWireSchema);
    }
   }
   validateWireSchema(schema);
   const suggestion = schema.properties.suggestions.items.properties;
   assert.equal(suggestion.target.enum.length, 10);
   assert.ok(suggestion.evidenceFields.items.enum.includes('offering'));
   assert.ok(suggestion.evidenceFields.items.enum.includes('problem'));
   for(const key of ['otherFunctions','email','businessName']) {
    assert.ok(!suggestion.evidenceFields.items.enum.includes(key), key);
   }
   for(const value of [...FEATURES.map(feature => feature.id), 'turquesa', 'modern', 'sans']) {
    assert.ok(suggestion.value.enum.includes(value), value);
   }
  });
 });
}
test('text: the local validator still rejects cross-target values from the compatible schema', async () => {
 const invalid = {...validReport,suggestions:[{...suggestion,target:'font',value:'turquesa'}]};
 await rejectedText(() => Response.json(textEnvelope(invalid)), 'NEXI_AI_VALIDATION');
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

test('text: classifies known Groq HTTP 400 details without logging the upstream body',async()=>{
 const fixtures=[
  [{code:'invalid_json_schema',param:'response_format.json_schema.schema'},{reason:'invalid_schema',parameter:'response_format.json_schema.schema'}],
  [{code:'json_validate_failed',param:privateMarker},{reason:'invalid_generation'}],
  [{param:'include_reasoning'},{reason:'invalid_parameter',parameter:'include_reasoning'}],
  [{code:'__proto__',param:privateMarker},undefined],
  [{code:'invalid_request_error',message:'Generated JSON does not match the expected schema. '+privateMarker},{reason:'invalid_generation'}],
  [{code:'unknown',message:'Could not compile the JSON schema: '+privateMarker},{reason:'invalid_schema'}],
 ];
 for(const [fields,providerDetail] of fixtures){
  const body={error:{message:privateMarker,failed_generation:{sample:privateMarker},...fields}};
  await withTextResponse(()=>Response.json(body,{status:400}),async(captured,warnings)=>{
   await assert.rejects(requestGroqReport(project),error=>{
    assert.equal(error.status,502);
    assert.equal(error.diagnosticCode,'NEXI_AI_PROVIDER_REQUEST');
    assert.ok(!JSON.stringify(error).includes(privateMarker));
    assert.deepEqual(warnings,[JSON.stringify({code:error.diagnosticCode,providerStatus:400,reference:error.reference,...(providerDetail?{providerDetail}:{})})+' NexiAI']);
    assert.ok(!warnings.join(' ').includes('failed_generation'));
    return true;
   });
   assert.equal(captured.length,1);
  });
 }
});

test('text: skips declared oversized HTTP 400 details and cancels the body',async()=>{
 let cancelled=0;
 const body={getReader(){assert.fail('a declared oversized body must not be read');},async cancel(){cancelled++;}};
 const response={status:400,ok:false,headers:new Headers({'content-type':'application/json','content-length':'20000'}),body};
 await withTextResponse(()=>response,async(_captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>error.status===502&&error.diagnosticCode==='NEXI_AI_PROVIDER_REQUEST');
  assert.ok(!warnings.join(' ').includes('providerDetail'));
  assert.equal(cancelled,1);
 });
});

test('text: cancels an oversized HTTP 400 stream and keeps the generic reference',async()=>{
 let cancelled=0;
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(17000));},cancel(){cancelled++;throw Error(privateMarker);}});
 await withTextResponse(()=>new Response(stream,{status:400,headers:{'content-type':'application/json'}}),async(_captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>error.status===502&&Boolean(error.reference));
  assert.equal(cancelled,1);
  assert.ok(!warnings.join(' ').includes('providerDetail'));
  assert.ok(!warnings.join(' ').includes(privateMarker));
 });
});

test('text: HTTP 400 keeps the generic reference for malformed or interrupted diagnostic bodies',async()=>{
 const responses=[
  ()=>new Response('{'+privateMarker,{status:400,headers:{'content-type':'application/json'}}),
  ()=>new Response(new ReadableStream({pull(controller){controller.error(Error(privateMarker));}}),{status:400,headers:{'content-type':'application/json'}}),
 ];
 for(const response of responses) await withTextResponse(response,async(_captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>error.status===502&&error.diagnosticCode==='NEXI_AI_PROVIDER_REQUEST'&&Boolean(error.reference));
  assert.ok(!warnings.join(' ').includes('providerDetail'));
  assert.ok(!warnings.join(' ').includes(privateMarker));
 });
});

test('text: stops waiting for a stalled HTTP 400 diagnostic body',async()=>{
 let cancelled=0;
 const stream=new ReadableStream({cancel(){cancelled++;}});
 await withTextResponse(()=>new Response(stream,{status:400,headers:{'content-type':'application/json'}}),async(_captured,warnings)=>{
  await assert.rejects(requestGroqReport(project),error=>error.status===502&&error.diagnosticCode==='NEXI_AI_PROVIDER_REQUEST'&&Boolean(error.reference));
  assert.equal(cancelled,1);
  assert.ok(!warnings.join(' ').includes('providerDetail'));
 });
});
