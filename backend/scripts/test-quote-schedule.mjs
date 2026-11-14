import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('reflect-metadata');
const {QuoteRequestsService}=require('../dist/quotes/quote-requests.js');
const {quoteDefaults}=require('../dist/domain/quote/form.js');
const {quoteToday}=require('../dist/domain/quote/schedule.js');
const actor={id:randomUUID(),clientId:randomUUID(),role:'client',name:'Cliente sintético',email:'schedule@example.test'};
const base={...quoteDefaults,offering:'Carta de café de prueba',sector:'food',problem:'Organizar consultas de prueba',privacyAcknowledged:true,name:actor.name,email:actor.email};
const unavailable=new Proxy({},{get(){return()=>{throw Error('No provider, PDF, verification or billing side effect is allowed in schedule tests');};}});
for(const staff of [false,true]){
 for(const launchDate of ['', '2020-01-01','2099-02-30','not-a-date'])test(`new ${staff?'staff':'client'} request rejects invalid deadline ${launchDate||'(empty)'} before any write`,async()=>{
  let reads=0;const db={query:async()=>{reads++;return {rows:[]};},transaction:()=>{throw Error('No transaction is allowed for an invalid schedule');}};
  const service=new QuoteRequestsService(db,unavailable,unavailable,unavailable);
  const body={values:{...base,hardDeadline:true,launchDate},idempotencyKey:randomUUID()};
  const request=staff?service.createStaff({...actor,role:'admin'},body):service.create(actor,body);
  await assert.rejects(request,error=>error.getStatus?.()===400&&/fecha/i.test(error.message));assert.equal(reads,1);
 });
}
test('replaying a saved historical request does not revalidate its passed deadline or create a duplicate',async()=>{
 const values={...base,hardDeadline:true,launchDate:'2020-01-01',deadlineReason:'Fecha histórica conservada'},key=randomUUID(),id=randomUUID();
 const row={id,numero:'TK-S-HISTORICA',usuario_id:actor.id,cliente_id:actor.clientId,creado_por_id:actor.id,revision:1,
  entrada_hash:createHash('sha256').update(JSON.stringify(values)).digest('hex'),clave_idempotencia:key,respuestas:values,estimacion:{},estado:'pending',created_at:'2020-01-01T12:00:00.000Z',updated_at:'2020-01-01T12:00:00.000Z'};
 let reads=0;const db={query:async()=>{reads++;return {rows:[row]};},transaction:()=>{throw Error('A replay must not write');}};
 const result=await new QuoteRequestsService(db,unavailable,unavailable,unavailable).create(actor,{values,idempotencyKey:key});
 assert.equal(result.id,id);assert.equal(result.values.launchDate,'2020-01-01');assert.equal(result.values.hardDeadline,true);assert.equal(reads,1);
});
test('server calendar uses Peru rather than the UTC date before local midnight',()=>{
 assert.equal(quoteToday(new Date('2026-11-12T04:59:59.999Z')),'2026-11-11');
 assert.equal(quoteToday(new Date('2026-11-12T05:00:00.000Z')),'2026-11-12');
});
