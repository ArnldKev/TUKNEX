import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),temporary=path.resolve('.local-data','audio-test-'+randomUUID());
const origin='http://127.0.0.1:3302';
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temporary,SEED_DEMO_DATA:'false',CONTACT_VERIFICATION_ENABLED:'false',CORS_ORIGINS:origin,NEXI_AI_ENABLED:'true',NEXI_AUDIO_ENABLED:'false',NEXI_AI_PROVIDER:'groq',NEXI_AI_MODEL:'openai/gpt-oss-120b',NEXI_AUDIO_MODEL:'whisper-large-v3-turbo',GROQ_API_KEY:'synthetic-audio-key-not-real',TRUST_PROXY_HOPS:'1'});
await mkdir(temporary,{recursive:true});require('@nestjs/common').Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js');
let app,db,base,checks=0,calls=[],mode='ok',seq=0;const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://api.groq.com/')){
  calls.push({url:String(url),options});
  if(mode==='quota')return new Response('private upstream',{status:429});
  if(mode==='outage')throw Error('private upstream credential');
  if(mode==='huge')return new Response('x'.repeat(18000));
  if(String(url).endsWith('/transcriptions'))return Response.json({text:mode==='silent'?'':'No quiero pagos online. Una carta de 25 platos.',duration:mode==='long'?65:10,segments:[{no_speech_prob:mode==='silent'?0.99:0.01}]});
  return Response.json({choices:[{message:{content:JSON.stringify(mode==='invalid'?{text:'Carta',warnings:[],price:10}:{text:'No quiero pagos online. Quiero una carta de 25 platos.',warnings:[]})}}]});
 }
 return realFetch(url,options);
};
function check(v,m){assert.ok(v,m);checks++;}
const policyVersion='2026-10-25-audio-v1';
function wav(){const b=Buffer.alloc(44+32000);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b;}
async function call(route,{body,code=201,ip='198.51.100.'+(++seq%200+1),requestOrigin=origin}={}){
 const multipart=body instanceof FormData;
 const r=await realFetch(base+'/api/quote-ai/audio/'+route,{method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,'X-Forwarded-For':ip,...(!multipart&&body!==undefined?{'Content-Type':'application/json'}:{})},body:multipart?body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal(r.status,code,route+': '+(r.status===code?'':await r.clone().text()));checks++;return r.json();
}
function upload({consent='true',policy=policyVersion,bytes=wav(),type='audio/wav',field='problem'}={}){
 const b=new FormData();b.append('consent',consent);b.append('policyVersion',policy);b.append('field',field);b.append('file',new Blob([bytes],{type}),'audio.wav');return b;
}
const clear=()=>db.query('DELETE FROM cotizador_ia_cuotas');
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(Database);
 check((await call('config',{code:200})).enabled===false,'audio disabled by default');
 await call('transcribe',{body:upload(),code:503});check(calls.length===0,'disabled never contacts provider');
 process.env.NEXI_AUDIO_ENABLED='true';
 const cfg=await call('config',{code:200});check(cfg.enabled&&cfg.maxSeconds===60&&cfg.maxBytes===4194304,'bounded public config');
 await call('transcribe',{body:upload(),requestOrigin:'https://evil.test',code:403});
 await call('transcribe',{body:upload({consent:'false'}),code:400});
 await call('transcribe',{body:upload({policy:'old'}),code:400});
 await call('transcribe',{body:upload({field:'email'}),code:400});
 await call('transcribe',{body:upload({bytes:Buffer.from('<script>bad</script>')}),code:400});
 await call('transcribe',{body:upload({bytes:Buffer.alloc(4194305)}),code:413});
 const result=await call('transcribe',{body:upload()});check(result.text.includes('No quiero pagos')&&result.duration===10,'literal Spanish transcription');
 const sent=calls[0];check(sent.url==='https://api.groq.com/openai/v1/audio/transcriptions','fixed transcription endpoint');
 check(sent.options.body.get('language')==='es'&&sent.options.body.get('model')==='whisper-large-v3-turbo','Spanish multilingual model');
 check(sent.options.body.get('response_format')==='verbose_json','duration response required');
 check(!sent.options.body.has('url')&&!sent.options.body.has('prompt'),'no remote URL fetch or invented context');
 const text={field:'problem',text:result.text,consent:true,policyVersion};
 await call('organize',{body:{...text,consent:false},code:400});await clear();
 const ordered=await call('organize',{body:text});check(ordered.text.includes('No quiero pagos')&&ordered.warnings.length===0,'separate suggested rewrite');
 const prompt=JSON.parse(calls.at(-1).options.body);check(!prompt.tools&&prompt.response_format.json_schema.strict,'bounded structured generation without tools');
 check(prompt.messages[0].content.includes('negaciones'),'ordering prompt preserves negations');
 for(const [m,c] of [['quota',429],['outage',503],['huge',502],['silent',422],['long',422]]){
  await clear();mode=m;const e=await call('transcribe',{body:upload(),code:c});check(!JSON.stringify(e).includes('credential'),'safe error');
 }
 await clear();mode='invalid';await call('organize',{body:text,code:502});mode='ok';
 await clear();const same='198.51.100.230';await call('transcribe',{body:upload(),ip:same});await call('transcribe',{body:upload(),ip:same,code:429});
 for(let i=1;i<5;i++){await db.query("DELETE FROM cotizador_ia_cuotas WHERE scope LIKE '%minute%'");await call('transcribe',{body:upload(),ip:same});}
 await db.query("DELETE FROM cotizador_ia_cuotas WHERE scope LIKE '%minute%'");await call('transcribe',{body:upload(),ip:same,code:429});
 const counters=JSON.stringify((await db.query('SELECT * FROM cotizador_ia_cuotas')).rows);check(!counters.includes(same)&&!counters.includes(result.text),'no raw IP/audio/text retention in quotas');
 check((await db.query('SELECT count(*)::int n FROM solicitudes_cotizacion')).rows[0].n===0,'no unconfirmed quote created');

 await clear();
 const concurrent=await Promise.all([1,2,3].map(async()=>{
  const r=await realFetch(base+'/api/quote-ai/audio/transcribe',{method:'POST',headers:{Origin:origin,'X-Forwarded-For':'198.51.100.231'},body:upload()});await r.text();return r.status;
 }));
 check(concurrent.filter(s=>s===201).length===1&&concurrent.filter(s=>s===429).length===2,'atomic quota prevents concurrent duplicate calls');
 await clear();
 await db.query("INSERT INTO cotizador_ia_cuotas(scope,window_start,hits) VALUES('audio:transcribe:global-day',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',20)");
 await call('transcribe',{body:upload(),code:429});
 await clear();
 const {EventEmitter}=await import('node:events'),{QuoteAudioService}=require('../dist/ai/quote-audio.js');
 let release;const barrier=new Promise(resolve=>{release=resolve;});
 const slowDb={transaction:async fn=>{await barrier;return db.transaction(fn);}};
 const res=new EventEmitter();res.destroyed=false;res.writableEnded=false;
 let executed=false;
 const pending=new QuoteAudioService(slowDb).run({ip:'198.51.100.232'},res,'transcribe',async()=>{executed=true;return {};});
 res.destroyed=true;res.emit('close');release();
 await assert.rejects(pending,/cancel/i);checks++;check(!executed,'disconnect during quota reservation never starts provider');

 console.log(JSON.stringify({result:'PASS',checks,realProviderCalls:0}));
}finally{globalThis.fetch=realFetch;await app?.close();assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.ok(path.basename(temporary).startsWith('audio-test-'));await rm(temporary,{recursive:true,force:true});}

