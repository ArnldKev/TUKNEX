import assert from 'node:assert/strict';
import test from 'node:test';
import { platformRepository } from '../platform/repository';
import { quoteDefaults } from './form';
import { quoteService } from './service';
import { resolveApiUrl } from '../../config/api';

test('a client proposal uses the authenticated HTTP API and the server result',async t=>{
  const values={...quoteDefaults,offering:'Productos de prueba',sector:'commerce' as const,problem:'Mostrar productos con claridad.',privacyAcknowledged:true};
  const estimate=await quoteService.calculate(values);
  const count=platformRepository.getSnapshot().quotes.length;
  t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,options?:RequestInit)=>{
    assert.equal(String(url),'http://127.0.0.1:4000/api/account/quote-requests');
    assert.equal(options?.credentials,'include');
    assert.deepEqual(JSON.parse(String(options?.body)),{values,idempotencyKey:'c5e2d1be-a782-4e54-90d2-f3be1127c478'});
    return Response.json({id:'saved-request',number:'TK-S-TEST',result:{...estimate,min:225,max:275}});
  });
  const saved=await quoteService.request({input:values,result:estimate,contact:{name:'',business:'',marketingConsent:false},answers:[],idempotencyKey:'c5e2d1be-a782-4e54-90d2-f3be1127c478'});
  assert.equal(saved.mode,'persistent');assert.equal(saved.result?.min,225);assert.equal(saved.number,'TK-S-TEST');
  assert.equal(platformRepository.getSnapshot().quotes.length,count);
});
test('a failed save rejects instead of falling back to fake memory success',async t=>{
  const input={...quoteDefaults,offering:'Productos de prueba',sector:'commerce' as const,problem:'Mostrar productos con claridad.',privacyAcknowledged:true};
  const result=await quoteService.calculate(input),count=platformRepository.getSnapshot().quotes.length;
  t.mock.method(globalThis,'fetch',async()=>Response.json({message:'No se pudo guardar en el servidor.'},{status:500}));
  await assert.rejects(quoteService.request({input,result,contact:{name:'',business:'',marketingConsent:false},answers:[]}),/No se pudo guardar/);
  assert.equal(platformRepository.getSnapshot().quotes.length,count);
});
test('local API hostname follows the frontend so cookies work on localhost and 127.0.0.1',()=>{
  assert.equal(resolveApiUrl('http://127.0.0.1:4000','localhost'),'http://localhost:4000');
  assert.equal(resolveApiUrl('http://localhost:4000/','127.0.0.1'),'http://127.0.0.1:4000');
  assert.equal(resolveApiUrl('https://api.example.com/','localhost'),'https://api.example.com');
});

test('same-origin deployment resolves / to the current website API base',()=>{assert.equal(resolveApiUrl('/','tuknex.example'),'');});
