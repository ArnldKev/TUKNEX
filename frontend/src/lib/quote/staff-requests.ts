import {billingRequest} from '../billing/api';
import type {QuoteFormValues} from './form';
import type {QuoteClientAccount,SavedQuoteRequest} from './requests';

export async function saveStaffQuoteRequest(values:QuoteFormValues,idempotencyKey:string){
  const saved=await billingRequest<SavedQuoteRequest>('team/quote-requests',{
    method:'POST',body:JSON.stringify({values,idempotencyKey}),
  });
  if(typeof window!=='undefined')window.dispatchEvent(new Event('billing-change'));
  return saved;
}
export function findQuoteClientAccount(search='',signal?:AbortSignal){
  return billingRequest<QuoteClientAccount[]>('team/client-accounts?search='+encodeURIComponent(search.trim()),{signal});
}
export async function linkQuoteClient(request:SavedQuoteRequest,clientUserId:string){
  if(!request.revision)throw Error('Actualiza la solicitud antes de vincular el cliente.');
  const saved=await billingRequest<SavedQuoteRequest>('team/quote-requests/'+request.id+'/client',{
    method:'PATCH',body:JSON.stringify({clientUserId,revision:request.revision}),
  });
  if(typeof window!=='undefined')window.dispatchEvent(new Event('billing-change'));
  return saved;
}
