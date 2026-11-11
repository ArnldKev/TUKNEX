import type {Payment} from './types';
import {billingBase} from './api';
import {RECEIPT_MAX_BYTES} from './receipts';

export function paymentsForInstallment(payments:Payment[], installmentId?:string):Payment[] {
  if(!installmentId)return payments;
  return payments.filter(payment=>payment.allocations!==undefined
    ? payment.allocations.some(allocation=>allocation.installmentId===installmentId&&allocation.amountCents>0)
    : payment.installmentId===installmentId);
}
export function paymentAppliedCents(payment:Payment,installmentId?:string):number {
  if(!installmentId)return payment.amountCents;
  if(payment.allocations!==undefined)return payment.allocations.filter(a=>a.installmentId===installmentId).reduce((sum,a)=>sum+a.amountCents,0);
  return payment.installmentId===installmentId?payment.amountCents:0;
}
export function formatPaymentDate(value:unknown):string {
  if(!value)return 'Sin fecha';
  const text=String(value),calendar=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if(calendar)return calendar[3]+'/'+calendar[2]+'/'+calendar[1];
  const date=new Date(text);
  if(Number.isNaN(date.getTime()))return 'Sin fecha';
  return String(date.getUTCDate()).padStart(2,'0')+'/'+String(date.getUTCMonth()+1).padStart(2,'0')+'/'+date.getUTCFullYear();
}
export async function paymentReceipt(scope:'billing'|'account',id:string,signal?:AbortSignal):Promise<{blob:Blob;filename:string}> {
  const response=await fetch(billingBase+'/api/'+scope+'/receipts/'+encodeURIComponent(id),{credentials:'include',cache:'no-store',signal});
  if(!response.ok){const error=await response.json().catch(()=>null);throw Error(error?.message||'No pudimos cargar el comprobante. Vuelve a intentarlo.');}
  const mime=response.headers.get('content-type')?.split(';')[0].trim();
  if(!mime||!['application/pdf','image/png','image/jpeg'].includes(mime))throw Error('El servicio no devolvió una imagen o PDF válido.');
  if(Number(response.headers.get('content-length')||0)>RECEIPT_MAX_BYTES)throw Error('El comprobante supera el límite de 5 MB.');
  const blob=await response.blob();if(!blob.size||blob.size>RECEIPT_MAX_BYTES)throw Error('El archivo recibido está vacío o supera 5 MB.');
  const extension=mime==='application/pdf'?'.pdf':mime==='image/png'?'.png':'.jpg';
  const filename=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]?.replace(/[\\/:*?"<>|]/g,'_').slice(0,160)||'comprobante'+extension;
  return {blob,filename};
}
