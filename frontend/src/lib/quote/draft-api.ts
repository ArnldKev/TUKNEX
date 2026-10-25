import { billingBase } from '../billing/api';
import { quoteProjectSchema } from './project';
import type { DraftConfig, DraftSummary, RemoteDraft } from './drafts';
export class DraftHttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function draftRequest<T>(path='',body?: unknown,method=body===undefined?'GET':'POST'): Promise<T> {
  const response=await fetch(billingBase+'/api/quote-drafts'+path,{method,credentials:'include',cache:'no-store',
    signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok){const data=await response.json().catch(()=>null);throw new DraftHttpError(response.status,data?.message||'No pudimos guardar el avance. Tus respuestas siguen en pantalla.');}
  return response.json();
}
export function validateRemoteDraft(value: RemoteDraft): RemoteDraft {
  return {...value,project:quoteProjectSchema.parse(value.project)};
}
export const draftApi = {
  config:()=>draftRequest<DraftConfig>('/config'),
  list:()=>draftRequest<DraftSummary[]>(),
  get:async(id:string)=>validateRemoteDraft(await draftRequest<RemoteDraft>('/'+id)),
  save:async(id:string,body:unknown)=>validateRemoteDraft(await draftRequest<RemoteDraft>('/'+id,body,'PATCH')),
};
