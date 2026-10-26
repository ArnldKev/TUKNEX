import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
test('Flujo y recuperación del cotizador',async t=>{
 const api=await import('./workflow').catch(()=>null);assert.ok(api,'Falta el flujo progresivo del cotizador');
 const values={...quoteDefaults,offering:'Platos caseros',sector:'food' as const,problem:'Organizar pedidos',privacyAcknowledged:true};
 await t.test('empieza sin elección ni avance; validar una etapa avanza17%',()=>{
  const initial=api.initialQuoteFlow();assert.equal(api.quoteProgress(initial,values),0);
  assert.throws(()=>api.advanceQuoteFlow(initial,values));
  const next=api.advanceQuoteFlow({...initial,goalChosen:true},values);
  assert.equal(next.step,1);assert.equal(api.quoteProgress(next,values),17);
  assert.equal(api.quoteProgress({...next,step:0},values),17);
 });
 await t.test('sin responder negocio no deja avanzar y no pierde etapas validadas',()=>{
  const first=api.advanceQuoteFlow({...api.initialQuoteFlow(),goalChosen:true},values);
  assert.throws(()=>api.advanceQuoteFlow(first,{...values,offering:''}));
  const second=api.advanceQuoteFlow(first,values);assert.equal(second.step,2);assert.equal(api.quoteProgress(second,values),33);
  assert.equal(api.quoteProgress({...second,step:0},values),33);
 });
 await t.test('solo marca100cuando se completa toda la información',()=>{
  let flow={...api.initialQuoteFlow(),goalChosen:true};for(let i=0;i<5;i++)flow=api.advanceQuoteFlow(flow,values);
  assert.equal(api.quoteProgress(flow,values),83);const done=api.completeQuoteFlow(flow,values);assert.equal(api.quoteProgress(done,values),100);
  assert.equal(api.quoteProgress(done,{...values,offering:''}),83);
 });
 await t.test('recupera textos del proyecto en pestaña sin contacto, claves ni permisos',()=>{
  const now=Date.UTC(2026,9,25);const flow=api.advanceQuoteFlow({...api.initialQuoteFlow(),goalChosen:true},values);
  const raw=api.serializeQuoteRecovery({...values,businessName:'Negocio prueba',name:'Nombre privado',email:'private@example.test',phone:'+51900000001',approver:'Privado'},flow,now);
  for(const secret of ['Nombre privado','private@example.test','51900000001','Privado'])assert.equal(raw.includes(secret),false);
  const restored=api.parseQuoteRecovery(raw,now+1000);assert.ok(restored);
  assert.equal(restored.values.businessName,'Negocio prueba');assert.equal(restored.values.offering,values.offering);assert.equal(restored.values.email,'');assert.equal(restored.values.privacyAcknowledged,false);assert.equal(restored.flow.step,1);
  assert.equal(api.parseQuoteRecovery(raw,now+86400001),null);
 });
 await t.test('rechaza recuperación corrupta, enorme o de otra versión y conserva texto inválido local',()=>{
  assert.equal(api.parseQuoteRecovery('{bad',0),null);assert.equal(api.parseQuoteRecovery('x'.repeat(100001),0),null);
  const raw=api.serializeQuoteRecovery({...values,offering:'x'.repeat(400)},api.initialQuoteFlow(),1000);
  const restored=api.parseQuoteRecovery(raw,2000);assert.equal(restored?.values.offering.length,400);
  assert.equal(api.parseQuoteRecovery(raw.replace('"version":1','"version":99'),2000),null);
 });
});

