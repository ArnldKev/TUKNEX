import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
import type {SavedQuoteRequest} from './requests';
import {saveStaffQuoteRequest,findQuoteClientAccount,linkQuoteClient} from './staff-requests';
const key='daec2aca-7c24-4ce1-90f8-a17d1381dd19';
const values={...quoteDefaults,offering:'Carta del restaurante',sector:'food' as const,problem:'Organizar los pedidos del restaurante.',privacyAcknowledged:true};

test('staff saves an unlinked request through the staff endpoint with its idempotency key',async t=>{
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,options?:RequestInit)=>{
  assert.equal(String(url),'http://127.0.0.1:4000/api/team/quote-requests');
  assert.equal(options?.method,'POST');assert.equal(options?.credentials,'include');
  assert.deepEqual(JSON.parse(String(options?.body)),{values,idempotencyKey:key});
  return Response.json({id:'request',userId:null,clientId:null,createdById:'staff',teamProjectId:'project',revision:1});
 });
 const saved=await saveStaffQuoteRequest(values,key);
 assert.equal(saved.clientId,null);assert.equal(saved.userId,null);assert.equal(saved.createdById,'staff');
 assert.equal(values.name,'');assert.equal(values.email,'');
});

test('a rejected staff save is reported and never represented as a saved quote',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({message:'Solicitud no disponible.'},{status:403}));
 await assert.rejects(saveStaffQuoteRequest(values,key),/Solicitud no disponible/);
});

for(const search of ['Bianca López','12345678','cliente+cafe@example.com','López & Hijos']){
 test('registered client search accepts '+search+' and preserves credentialed authentication',async t=>{
  const controller=new AbortController();
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,options?:RequestInit)=>{
   assert.equal(String(url),'http://127.0.0.1:4000/api/team/client-accounts?search='+encodeURIComponent(search));
   assert.equal(options?.credentials,'include');assert.equal(options?.body,undefined);assert.equal(options?.signal,controller.signal);
   return Response.json([{userId:'user',clientId:'client',name:'Cliente',email:'cliente+cafe@example.com',dni:'12345678'}]);
  });
  const found=await findQuoteClientAccount(' '+search+' ',controller.signal);assert.equal(found.length,1);assert.equal(found[0].dni,'12345678');
 });
}

test('opening the client picker loads registered accounts without a required email',async t=>{
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,options?:RequestInit)=>{
  assert.equal(String(url),'http://127.0.0.1:4000/api/team/client-accounts?search=');
  assert.equal(options?.credentials,'include');assert.equal(options?.method,undefined);assert.equal(options?.body,undefined);
  return Response.json([{userId:'user',clientId:'client',name:'Bianca López',email:'bianca@example.test'}]);
 });
 const found=await findQuoteClientAccount();assert.equal(found[0].name,'Bianca López');
});

test('no matching registered account and a failed directory call remain distinct outcomes',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json([]));
 assert.deepEqual(await findQuoteClientAccount('Sin coincidencia'),[]);
 fetch.mock.mockImplementation(async()=>Response.json({message:'No pudimos cargar los clientes.'},{status:503}));
 await assert.rejects(findQuoteClientAccount('Bianca'),/No pudimos cargar los clientes/);
});

test('linking submits the selected account and server revision without replacing original answers',async t=>{
 const request={id:'request',revision:3,values} as SavedQuoteRequest;
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,options?:RequestInit)=>{
  assert.equal(String(url),'http://127.0.0.1:4000/api/team/quote-requests/request/client');
  assert.equal(options?.method,'PATCH');assert.equal(options?.credentials,'include');
  assert.deepEqual(JSON.parse(String(options?.body)),{clientUserId:'user',revision:3});
  return Response.json({...request,userId:'user',clientId:'client',revision:4});
 });
 const saved=await linkQuoteClient(request,'user');assert.equal(saved.clientId,'client');assert.deepEqual(request.values,values);
});

test('stale assignment conflicts are surfaced without silent retry against another account',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({message:'La solicitud cambió. Actualiza antes de vincular.'},{status:409});});
 await assert.rejects(linkQuoteClient({id:'request',revision:1} as SavedQuoteRequest,'user'),/La solicitud cambió/);assert.equal(calls,1);
});

test('legacy metadata without a revision cannot accidentally link a client',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({});});
 await assert.rejects(linkQuoteClient({id:'request'} as SavedQuoteRequest,'user'),/Actualiza la solicitud/);assert.equal(calls,0);
});
