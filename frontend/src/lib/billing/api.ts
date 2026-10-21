import { API_URL } from '../../config/api';
import type { BillingData } from './types';
export const billingBase = API_URL;
let connected = false;
export function setBillingSession(value: boolean) {
  connected = value;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('billing-auth'));
}
export function hasBillingSession() { return connected; }
export async function billingRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(billingBase + '/api/' + path, {
    ...options, signal:options.signal??AbortSignal.timeout(20000), credentials: 'include', cache: 'no-store',
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  });
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('auth/')) {
      setBillingSession(false);
      if(typeof window!=='undefined')window.dispatchEvent(new Event('account-expired'));
    }
    const error = await res.json().catch(() => ({ message: 'No se pudo completar la operación.' }));
    throw new Error(error.message || 'No se pudo completar la operación.');
  }
  return res.json();
}
export async function billingLogin(email: string, password: string) {
  const result = await billingRequest<{user:{role:string}}>('auth/login', {method:'POST',body:JSON.stringify({email,password})});
  setBillingSession(result.user.role === 'admin');
}
export async function billingLogout() {
  await fetch(billingBase + '/api/auth/logout', {method:'POST',credentials:'include',signal:AbortSignal.timeout(5000)}).catch(() => {});
  setBillingSession(false);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('account-expired'));
}
export function billingState() { return billingRequest<BillingData>('billing/state'); }
export async function pdfBlob(path: string, body?: unknown): Promise<{blob:Blob;filename:string}> {
  const res=await fetch(billingBase+'/api/'+path,{method:body?'POST':'GET',credentials:'include',signal:AbortSignal.timeout(30000),headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok) {const error=await res.json().catch(()=>({message:'El servicio de documentos no está disponible.'}));throw new Error(error.message);}
  if(!res.headers.get('content-type')?.includes('application/pdf')) throw new Error('No se recibió un PDF válido.');
  return {blob:await res.blob(),filename:res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'TUKNEX-documento.pdf'};
}
export function savePdf(blob: Blob, filename: string) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function billingAuthHeaders(): Record<string,string> { return {}; }
