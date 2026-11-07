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
