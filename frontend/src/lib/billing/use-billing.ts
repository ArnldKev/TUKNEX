'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemoAuth } from '../platform/auth';
import { billingState } from './api';
import type { BillingData } from './types';
export function useBilling() {
  const {user,ready}=useDemoAuth(),enabled=ready && user?.role==='admin',identity=user?.id;
  const epoch=useRef(0);
  const [data,setData]=useState<BillingData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const refresh=useCallback(async()=>{
    const run=++epoch.current;
    if(!enabled){setData(null);setError('');setLoading(false);return;}
    setLoading(true);
    try{const next=await billingState();if(run===epoch.current){setData(next);setError('');}}
    catch(error){if(run===epoch.current)setError(error instanceof Error?error.message:'No pudimos cargar la gestión.');}
    finally{if(run===epoch.current)setLoading(false);}
  },[enabled,identity]);
  useEffect(()=>{
    setData(null);void refresh();
    const update=()=>void refresh();
    window.addEventListener('billing-change',update);window.addEventListener('billing-auth',update);window.addEventListener('focus',update);
    return()=>{epoch.current++;window.removeEventListener('billing-change',update);window.removeEventListener('billing-auth',update);window.removeEventListener('focus',update);};
  },[refresh]);
  return {data,error,loading,refresh};
}
