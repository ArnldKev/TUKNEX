'use client';
import {useState} from 'react';
import {X,LockKeyhole} from 'lucide-react';
import {AuthScreen} from './auth-screen';
import {VerificationPanel} from './verification-panel';
import {useAccessibleModal} from './use-accessible-modal';
import {useDemoAuth} from '@/lib/platform/auth';
import {billingRequest} from '@/lib/billing/api';
import {canSaveQuote,type VerificationStatus} from '@/lib/platform/verification';
import type {User} from '@/lib/platform/types';
import './production.css';
export function QuoteAuthDialog({onClose,onSave}:{onClose:()=>void;onSave:()=>Promise<void>}) {
  const auth=useDemoAuth(),[mode,setMode]=useState<'login'|'register'|'reset'>('login'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useAccessibleModal(true,()=>{if(!busy)onClose();});
  async function continueSave(user?:User) {
    if(user?.role==='admin'){setError('Esta cuenta administra TUKNEX. Para enviar tu proyecto usa una cuenta de cliente.');return;}
    setBusy(true);setError('');
    try{const status=await billingRequest<VerificationStatus>('auth/verification');if(!canSaveQuote(status))return;await onSave();onClose();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar. Tu propuesta sigue en esta pantalla.');}finally{setBusy(false);}
  }
  return <div className="platform-modal-backdrop quote-auth-backdrop"><section className="platform-modal quote-auth-modal" role="dialog" aria-modal="true" aria-labelledby="quote-access-title">
    <header className="quote-auth-heading"><LockKeyhole size={22}/><div><h2 id="quote-access-title">Tu propuesta tiene un lugar.</h2><p>Accede para guardarla. Tus respuestas siguen aquí.</p></div><button type="button" aria-label="Cerrar acceso y volver a mi propuesta" disabled={busy} onClick={onClose}><X size={22}/></button></header>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {busy?<p role="status" className="platform-info">Guardando tu propuesta…</p>:auth.user?.role==='client'?<VerificationPanel onContinue={()=>void continueSave()}/>:auth.user?.role==='admin'?<div className="auth-form"><p>Necesitas una cuenta de cliente para enviar una cotización. Tu propuesta se conservará al cambiar de cuenta.</p><button className="platform-secondary" onClick={()=>void auth.logout()}>Usar otra cuenta</button></div>:<AuthScreen mode={mode} embedded onModeChange={setMode} onComplete={continueSave}/>}
  </section></div>;
}
