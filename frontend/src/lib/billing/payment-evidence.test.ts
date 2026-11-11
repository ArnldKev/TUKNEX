import test from 'node:test';
import assert from 'node:assert/strict';
import type {Payment} from './types';
import {formatPaymentDate,paymentAppliedCents,paymentReceipt,paymentsForInstallment} from './payment-evidence';
import {RECEIPT_MAX_BYTES} from './receipts';

const payment=(overrides:Partial<Payment>={}):Payment=>({id:'p1',contractId:'c1',amountCents:10000,date:'2026-10-25',method:'yape',reference:'OP-QA',observation:'',voided:false,createdAt:'2026-10-25T12:00:00Z',...overrides});
test('distributed payment appears on each applied installment with only its applied amount',()=>{
 const distributed=payment({receiptId:'r1',allocations:[{installmentId:'first',amountCents:5000},{installmentId:'second',amountCents:5000}]}),other=payment({id:'p2',installmentId:'other'});
 assert.deepEqual(paymentsForInstallment([distributed,other],'first'),[distributed]);
 assert.equal(paymentAppliedCents(distributed,'first'),5000);
 assert.equal(paymentAppliedCents(distributed,'second'),5000);
 assert.equal(paymentAppliedCents(distributed,'missing'),0);
 assert.equal(paymentAppliedCents(distributed),10000);
 assert.deepEqual(paymentsForInstallment([distributed],'missing'),[]);
});
test('canonical allocations override legacy installment id and voided evidence remains visible',()=>{
 const legacy=payment({installmentId:'first'}),authoritative=payment({id:'p2',installmentId:'first',allocations:[]}),voided=payment({id:'p3',voided:true,voidReason:'Corregido',allocations:[{installmentId:'first',amountCents:3500}]});
 assert.deepEqual(paymentsForInstallment([legacy,authoritative,voided],'first'),[legacy,voided]);
 assert.equal(paymentAppliedCents(legacy,'first'),10000);
 assert.equal(paymentAppliedCents(authoritative,'first'),0);
 assert.equal(paymentsForInstallment([voided],'first')[0].voided,true);
});
test('payment date keeps the stored calendar day and handles the original Date-string response',()=>{
 assert.equal(formatPaymentDate('2026-10-25'),'25/10/2026');
 assert.equal(formatPaymentDate('2026-10-25T00:00:00.000Z'),'25/10/2026');
 assert.equal(formatPaymentDate('Sun Oct 25 2026 00:00:00 GMT+0000 (Coordinated Universal Time)'),'25/10/2026');
 assert.equal(formatPaymentDate('bad'),'Sin fecha');assert.equal(formatPaymentDate(null),'Sin fecha');
});
test('receipt loader uses authenticated private route and preserves supported MIME/filename',async()=>{
 const previous=globalThis.fetch;try{
  for(const mime of ['image/png','image/jpeg','application/pdf']){
   let requested='';let options:RequestInit|undefined;
   globalThis.fetch=async(input,init)=>{requested=String(input);options=init;return new Response(new Blob(['synthetic-evidence'],{type:mime}),{headers:{'content-type':mime,'content-disposition':'attachment; filename="a/b:proof.png"'}});};
   const result=await paymentReceipt('account','private/id');
   assert.match(requested,/\/api\/account\/receipts\/private%2Fid$/);assert.equal(options?.credentials,'include');assert.equal(options?.cache,'no-store');
   assert.equal(result.blob.type,mime);assert.equal(result.filename,'a_b_proof.png');
  }
 }finally{globalThis.fetch=previous;}
});
test('receipt loader rejects errors, HTML masquerading as a receipt, empty and oversized downloads',async()=>{
 const previous=globalThis.fetch;try{
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Comprobante no encontrado.'}),{status:404,headers:{'content-type':'application/json'}});
  await assert.rejects(paymentReceipt('account','id'),/no encontrado/);
  globalThis.fetch=async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}});
  await assert.rejects(paymentReceipt('billing','id'),/imagen o PDF/);
  globalThis.fetch=async()=>new Response('',{headers:{'content-type':'image/png'}});
  await assert.rejects(paymentReceipt('billing','id'),/vacío/);
  globalThis.fetch=async()=>new Response('small',{headers:{'content-type':'image/png','content-length':String(RECEIPT_MAX_BYTES+1)}});
  await assert.rejects(paymentReceipt('billing','id'),/5 MB/);
  globalThis.fetch=async()=>new Response(new Blob([new Uint8Array(RECEIPT_MAX_BYTES+1)],{type:'image/png'}),{headers:{'content-type':'image/png'}});
  await assert.rejects(paymentReceipt('billing','id'),/5 MB/);
 }finally{globalThis.fetch=previous;}
});
