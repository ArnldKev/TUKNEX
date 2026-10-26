import assert from 'node:assert/strict';
import test from 'node:test';
test('AudioCapture: micrófono y cancelación',async t=>{
 const api=await import('./audio-capture').catch(()=>null);assert.ok(api,'Falta el ciclo de grabación seguro');
 const Capture=api.AudioCapture;
 interface FakeRecorder {state:string;mimeType:string;ondataavailable:((e:{data:Blob})=>void)|null;onstop:(()=>void)|null;onerror:(()=>void)|null;start():void;stop():void}
 function harness(){
  let stopped=0,recorder:FakeRecorder,clock=0,tick:(()=>void)|undefined;
  const states:string[]=[],ready:Blob[]=[],errors:string[]=[];
  const stream={getTracks:()=>[{stop:()=>stopped++}]};
  const env={getStream:async()=>stream,createRecorder:()=>recorder={state:'inactive',mimeType:'audio/webm',ondataavailable:null,onstop:null,onerror:null,start(){this.state='recording';},stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['test'],{type:'audio/webm'})});this.onstop?.();}},now:()=>clock,every:(f:()=>void)=>{tick=f;return 1;},clear:()=>{tick=undefined;}};
  const capture=new Capture({onState:s=>states.push(s),onReady:b=>ready.push(b),onError:e=>errors.push(e)},env as never);
  return {capture,env,states,ready,errors,get stopped(){return stopped;},get recorder(){return recorder;},advance:(ms:number)=>{clock+=ms;tick?.();}};
 }
 await t.test('detener produce audio y apaga el micrófono',async()=>{const h=harness();await h.capture.start();assert.equal(h.states.at(-1),'recording');h.capture.stop();assert.equal(h.ready.length,1);assert.ok(h.stopped>0);assert.equal(h.ready[0].type,'audio/webm');});
 await t.test('cancelar descarta incluso si el permiso llega tarde',async()=>{const h=harness();let allow:(s:unknown)=>void=()=>{};h.env.getStream=()=>new Promise(resolve=>{allow=resolve;}) as never;const pending=h.capture.start();h.capture.cancel();let stopped=0;allow({getTracks:()=>[{stop:()=>stopped++}]});await pending;assert.equal(stopped,1);assert.equal(h.ready.length,0);assert.equal(h.states.at(-1),'idle');});
 await t.test('permiso denegado conserva alternativa escrita',async()=>{const h=harness();h.env.getStream=async()=>{throw Error('Permission denied');};await h.capture.start();assert.equal(h.errors.length,1);assert.equal(h.ready.length,0);});
 await t.test('un minuto detiene y exceso de tamaño descarta',async()=>{const h=harness();await h.capture.start();h.advance(60000);assert.equal(h.ready.length,1);assert.ok(h.stopped>0);const large=harness();await large.capture.start();large.recorder.ondataavailable!({data:new Blob([new Uint8Array(4194305)])});assert.equal(large.ready.length,0);assert.ok(large.errors.length>0);assert.ok(large.stopped>0);});
 await t.test('distingue permiso denegado, micrófono ausente y dispositivo ocupado sin sugerir carga',async()=>{
  const cases=[
   {name:'NotAllowedError',message:/permiso.*(denegado|bloqueado)/i},
   {name:'NotFoundError',message:/no.*(encontr|detect).*micrófono/i},
   {name:'NotReadableError',message:/micrófono.*ocupado/i},
  ];
  for(const item of cases){
   const h=harness();h.env.getStream=async()=>{throw new DOMException('private device detail',item.name);};
   await h.capture.start();assert.equal(h.states.at(-1),'idle');assert.equal(h.ready.length,0);
   assert.equal(h.errors.length,1);assert.match(h.errors[0],item.message,item.name);
   assert.match(h.errors[0],/escrib/i);assert.doesNotMatch(h.errors[0],/sube|carg[ae]|private/i);
  }
 });
 await t.test('un formato no compatible libera el micrófono y conserva alternativa escrita',async()=>{
  const h=harness();h.env.createRecorder=()=>{throw new DOMException('unsupported codec','NotSupportedError');};
  await h.capture.start();assert.equal(h.states.at(-1),'idle');assert.equal(h.stopped,1);
  assert.equal(h.ready.length,0);assert.match(h.errors[0],/no.*compatible/i);assert.match(h.errors[0],/escrib/i);
 });
 await t.test('fallar al iniciar un dispositivo ocupado libera los tracks sin entregar audio',async()=>{
  const h=harness(),create=h.env.createRecorder;
  h.env.createRecorder=()=>{const recorder=create();recorder.start=()=>{throw new DOMException('device busy','NotReadableError');};return recorder;};
  await h.capture.start();assert.equal(h.stopped,1);assert.equal(h.ready.length,0);assert.match(h.errors[0],/ocupado/i);
 });
 await t.test('un rechazo tardío después de cancelar no publica errores ni audio',async()=>{
  const h=harness();let rejectPermission:(reason:unknown)=>void=()=>{};
  h.env.getStream=()=>new Promise((_resolve,reject)=>{rejectPermission=reject;}) as never;
  const pending=h.capture.start();h.capture.cancel();
  rejectPermission(new DOMException('denied later','NotAllowedError'));await pending;
  assert.equal(h.errors.length,0);assert.equal(h.ready.length,0);assert.equal(h.states.at(-1),'idle');
 });

 await t.test('salir libera recursos sin entregar audio',async()=>{const h=harness();await h.capture.start();h.capture.dispose();assert.ok(h.stopped>0);assert.equal(h.ready.length,0);});
});

