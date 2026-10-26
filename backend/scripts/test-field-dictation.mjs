import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),temporary=path.resolve('.local-data','dictation-test-'+randomUUID()),origin='http://127.0.0.1:3303';
Object.assign(process.env,{NODE_ENV:'test',BILLING_MODE:'local-demo',DATA_DIR:temporary,SEED_DEMO_DATA:'false',CONTACT_VERIFICATION_ENABLED:'false',CORS_ORIGINS:origin,NEXI_AI_ENABLED:'true',NEXI_AUDIO_ENABLED:'false',NEXI_AI_PROVIDER:'groq',NEXI_AI_MODEL:'openai/gpt-oss-120b',NEXI_AUDIO_MODEL:'whisper-large-v3-turbo',GROQ_API_KEY:'synthetic-dictation-key-not-real',TRUST_PROXY_HOPS:'1'});
await mkdir(temporary,{recursive:true});require('@nestjs/common').Logger.overrideLogger(false);
const {createApp}=require('../dist/main.js'),{Database}=require('../dist/database/database.js');
const realFetch=globalThis.fetch;let app,db,base,checks=0,calls=[],mode='ok',seq=0;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://api.groq.com/')){
  calls.push({url:String(url),options});
  assert.ok(String(url).endsWith('/audio/transcriptions'),'Dictation never calls a language model');
  if(mode==='quota')return new Response('private upstream',{status:429});
  if(mode==='outage')throw Error('private upstream credential');
  if(mode==='huge')return new Response('x'.repeat(18000));
  return Response.json({text:mode==='silent'?'':mode==='longtext'?'x'.repeat(3000):'José Quispe, Oxapampa. No quiero pagos online.',duration:mode==='long'?65:10,segments:[{no_speech_prob:mode==='silent'?0.99:0.01}]});
 }
 return realFetch(url,options);
};
function check(value,message){assert.ok(value,message);checks++;}
const policy='2026-10-25-field-dictation-v1';
function wav(){const b=Buffer.alloc(44+32000);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b;}
function upload({field='problem',consent='true',policyVersion=policy,bytes=wav(),extra}={}){
 const form=new FormData();form.append('file',new Blob([bytes],{type:'audio/wav'}),'respuesta.wav');form.append('field',field);form.append('consent',consent);form.append('policyVersion',policyVersion);if(extra)form.append('text',extra);return form;
}
async function call(route,{body,code=201,ip='198.51.100.'+(++seq%200+1),requestOrigin=origin}={}){
 const res=await realFetch(base+'/api/quote-ai/audio/'+route,{method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,'X-Forwarded-For':ip},body});
 assert.equal(res.status,code,route+': '+(res.status===code?'':await res.clone().text()));checks++;return res.json();
}
const clear=()=>db.query('DELETE FROM cotizador_ia_cuotas');
try{
 app=await createApp();await app.listen(0,'127.0.0.1');base=await app.getUrl();db=app.get(Database);
 const disabled=await call('dictation-config',{code:200});check(disabled.enabled===false,'dictation respects disabled audio flag');
 await call('dictate',{body:upload(),code:503});check(calls.length===0,'disabled does not contact provider');
 process.env.NEXI_AUDIO_ENABLED='true';
 const config=await call('dictation-config',{code:200});
 check(config.enabled&&config.policyVersion===policy&&config.maxSeconds===60&&config.maxBytes===4194304&&config.perConnectionDailyLimit===20&&config.perConnectionMinuteLimit===4,'new bounded config');
 const old=await call('config',{code:200});
 assert.deepEqual(old,{enabled:true,policyVersion:'2026-10-25-audio-v1',maxSeconds:60,maxBytes:4194304,perVisitorDailyLimit:5});checks++;
 await call('dictate',{body:upload(),requestOrigin:'https://evil.test',code:403});
 for(const body of [upload({consent:'false'}),upload({policyVersion:'2026-10-25-audio-v1'}),upload({field:'launchDate'}),upload({field:'sector'}),upload({field:'__proto__'}),upload({bytes:Buffer.from('invalid')})])
  await call('dictate',{body,code:400});
 await call('dictate',{body:upload({extra:'never send existing text'}),code:400});
 await call('dictate',{body:upload({bytes:Buffer.alloc(4194305)}),code:413});
 check(calls.length===0,'invalid requests never contact provider');
 const fields=['businessName','offering','city','website','customers','salesProcess','problem','otherFunctions','colorsLiked','colorsDisliked','references','competitor','firstImpression','previewComment','deadlineReason','existingDomain','approver','name','email','phone'];
 for(const field of fields){await clear();const result=await call('dictate',{body:upload({field})});check(result.text==='José Quispe, Oxapampa. No quiero pagos online.'&&result.duration===10,field+' returns literal transcription');}
 const sent=calls[0].options.body;check(sent.get('language')==='es'&&sent.get('model')==='whisper-large-v3-turbo','Spanish ASR fixed free model');
 check([...sent.keys()].sort().join(',')==='file,language,model,response_format,temperature','no field, existing text, contact or project context sent to provider');
 await clear();mode='longtext';check((await call('dictate',{body:upload({field:'name'})})).text.length===3000,'transcript is not truncated to target field limit');
 for(const [value,code] of [['quota',429],['outage',503],['huge',502],['silent',422],['long',422]]){
  await clear();mode=value;const error=await call('dictate',{body:upload(),code});check(!JSON.stringify(error).includes('credential'),'safe errors');
 }mode='ok';await clear();
 const same='198.51.100.230';for(let i=0;i<4;i++)await call('dictate',{body:upload(),ip:same});
 const before=calls.length;await call('dictate',{body:upload(),ip:same,code:429});check(calls.length===before,'fifth connection minute call never reaches ASR');
 // Seed earlier daily usage so this boundary test does not consume the separate HTTP 20/15m limiter.
 await db.query("UPDATE cotizador_ia_cuotas SET hits=19 WHERE scope LIKE 'audio:dictate:visitor-day:%'");
 await db.query("DELETE FROM cotizador_ia_cuotas WHERE scope LIKE '%minute%'");await call('dictate',{body:upload(),ip:same});
 await call('dictate',{body:upload(),ip:same,code:429});
 const counters=JSON.stringify((await db.query('SELECT * FROM cotizador_ia_cuotas')).rows);
 check(counters.includes('audio:dictate:')&&!counters.includes(same)&&!counters.includes('José'),'own prefix without audio, text or clear IP');
 check((await db.query('SELECT count(*)::int n FROM solicitudes_cotizacion')).rows[0].n===0,'dictation never creates a quote');
 await clear();for(let i=0;i<6;i++)await call('dictate',{body:upload()});await call('dictate',{body:upload(),code:429});
 await clear();await db.query("INSERT INTO cotizador_ia_cuotas(scope,window_start,hits) VALUES('audio:dictate:global-day',date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',60)");
 await call('dictate',{body:upload(),code:429});
 // The old route still rejects contact and keeps its old consent.
 await call('transcribe',{body:upload({field:'email',policyVersion:'2026-10-25-audio-v1'}),code:400});
 console.log(JSON.stringify({result:'PASS',checks,realProviderCalls:0}));
}finally{
 globalThis.fetch=realFetch;await app?.close();assert.equal(path.dirname(temporary),path.resolve('.local-data'));assert.ok(path.basename(temporary).startsWith('dictation-test-'));await rm(temporary,{recursive:true,force:true});
}
