'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {billingBase} from '@/lib/billing/api';
import {AccountLoadError,AccountResourceStore,type ClientOverview} from '@/lib/client/account-resources';
import type {SavedQuoteRequest} from '@/lib/quote/requests';
async function read<T>(path:string,signal:AbortSignal):Promise<T>{
 const timeout=AbortSignal.timeout(20000),combined=AbortSignal.any([signal,timeout]);
 try{const response=await fetch(billingBase+'/api/account/'+path,{signal:combined,credentials:'include',cache:'no-store'});if(!response.ok){if(response.status===401)window.dispatchEvent(new CustomEvent('account-expired',{detail:{reason:'expired'}}));throw new AccountLoadError(response.status,'Account request failed');}try{return await response.json() as T;}catch{throw new AccountLoadError(502,'Invalid response');}}
 catch(error){if(signal.aborted)throw error;if(timeout.aborted)throw new AccountLoadError(408,'Timeout');if(error instanceof AccountLoadError)throw error;throw new AccountLoadError(0,'Connection error');}
}
function validOverview(value:ClientOverview):boolean{return !!value&&typeof value.user?.id==='string'&&typeof value.user.name==='string'&&['quotes','contracts','installments','payments'].every(key=>Array.isArray(value[key as keyof ClientOverview]));}
export function useAccountResources(identity?:string){
 const [store]=useState(()=>new AccountResourceStore(async signal=>{const overview=await read<ClientOverview>('overview',signal);if(!validOverview(overview)||(identity&&overview.user.id!==identity))throw new AccountLoadError(502,'Invalid account response');const requests=overview.requests??await read<SavedQuoteRequest[]>('quote-requests',signal);if(!Array.isArray(requests))throw new AccountLoadError(502,'Invalid requests response');return{overview,requests};}));
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 useEffect(()=>{
  store.resume();void store.refresh();
  const visible=()=>{if(document.visibilityState==='visible'&&store.shouldRefresh())void store.refresh();};
  const important=()=>{void store.refresh();};
  window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);window.addEventListener('billing-change',important);
  return()=>{store.stop();window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);window.removeEventListener('billing-change',important);};
 },[store]);
 return{...snapshot,refresh:(keys?:('overview'|'requests')[])=>store.refresh(keys)};
}
