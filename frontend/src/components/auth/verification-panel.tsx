'use client';
import {useCallback,useEffect,useState} from 'react';
import {CheckCircle2,Mail,Smartphone,ShieldCheck} from 'lucide-react';
import {billingRequest} from '@/lib/billing/api';
import {canSaveQuote,type VerificationStatus} from '@/lib/platform/verification';
import './production.css';
export function VerificationPanel({onContinue,compact=false}:{onContinue?:()=>void;compact?:boolean}) {
  const [status,setStatus]=useState<VerificationStatus|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[expanded,setExpanded]=useState(!compact);
  const [phone,setPhone]=useState(''),[dni,setDni]=useState(''),[codes,setCodes]=useState({email:'',phone:''}),[until,setUntil]=useState({email:0,phone:0}),[now,setNow]=useState(Date.now());
  const load=useCallback(async()=>{try{const next=await billingRequest<VerificationStatus>('auth/verification');setStatus(next);setPhone(next.phone);setError('');}catch(e){setError(e instanceof Error?e.message:'No pudimos comprobar tus datos.');}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  async function send(channel:'email'|'phone') {
    setBusy(true);setError('');setNotice('');
    try {const result=await billingRequest<{retryAfter:number}>('auth/verification/send',{method:'POST',body:JSON.stringify({channel})});setUntil(current=>({...current,[channel]:Date.now()+result.retryAfter*1000}));setNotice(channel==='email'?'El proveedor aceptó el correo. Revisa tu bandeja y spam; el código caduca en 10 minutos.':'El proveedor aceptó la solicitud del SMS. Escribe el código cuando lo recibas.');}
    catch(e){setError(e instanceof Error?e.message:'No se pudo solicitar el código.');}finally{setBusy(false);}
  }
  async function confirm(channel:'email'|'phone') {
    setBusy(true);setError('');setNotice('');
    try{setStatus(await billingRequest<VerificationStatus>('auth/verification/confirm',{method:'POST',body:JSON.stringify({channel,code:codes[channel]})}));setCodes(current=>({...current,[channel]:''}));setNotice('Dato de contacto confirmado.');window.dispatchEvent(new Event('account-updated'));}
    catch(e){setError(e instanceof Error?e.message:'No se pudo verificar el código.');}finally{setBusy(false);}
  }
  async function complete(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try{setStatus(await billingRequest<VerificationStatus>('auth/verification/profile',{method:'PATCH',body:JSON.stringify({phone,dni})}));setDni('');setNotice('Datos guardados. El DNI es declarado; no se ha consultado una fuente oficial.');window.dispatchEvent(new Event('account-updated'));}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron guardar tus datos.');}finally{setBusy(false);}
  }
  return <section className="verification-panel" aria-label="Verificación de mi cuenta">
    <div className="verification-heading"><ShieldCheck size={22}/><div><h2>Tu cuenta, con más confianza.</h2><p>{status?.emailVerified?'Correo confirmado':'Confirma tus datos de contacto'}{status?.phoneVerified?' · Móvil confirmado':''}</p></div>{compact&&<button className="platform-secondary" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}>{expanded?'Ocultar':'Revisar cuenta'}</button>}</div>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {notice&&<p className="platform-success" role="status">{notice}</p>}
    {!status&&!error&&<p role="status">Comprobando el estado de tu cuenta…</p>}
    {expanded&&status&&<>
      {!status.profileComplete&&<form onSubmit={complete} className="auth-form"><p>Completa los datos que faltan para preparar tus documentos.</p><label className="platform-field">Número de móvil<input type="tel" autoComplete="tel" required placeholder="+51 9…" maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="platform-field">DNI (8 dígitos)<input inputMode="numeric" required pattern="[0-9]{8}" minLength={8} maxLength={8} value={dni} onChange={e=>setDni(e.target.value)}/></label><button className="platform-button" disabled={busy}>Guardar mis datos</button></form>}
      <div className="verification-channels">{(['email','phone'] as const).map(channel=>{
        const verified=channel==='email'?status.emailVerified:status.phoneVerified,available=channel==='email'?status.emailAvailable:status.phoneAvailable,label=channel==='email'?'correo':'móvil',remaining=Math.max(0,Math.ceil((until[channel]-now)/1000));
        return <article key={channel}><div className="verification-channel-title">{channel==='email'?<Mail size={18}/>:<Smartphone size={18}/>}<strong>{channel==='email'?status.email:status.phone||'Móvil pendiente'}</strong><span className={verified?'verified-tag':'pending-tag'}>{verified?<><CheckCircle2 size={14}/> Confirmado</>:'Pendiente'}</span></div>
          {!verified&&(available?<><button type="button" className="platform-secondary" disabled={busy||remaining>0||channel==='phone'&&!status.phone} onClick={()=>void send(channel)}>{remaining?`Reenviar en ${remaining}s`:`Enviar código por ${channel==='email'?'correo':'SMS'}`}</button><form onSubmit={event=>{event.preventDefault();void confirm(channel);}} className="verification-code"><label className="platform-field">Código de {label}<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} value={codes[channel]} onChange={e=>setCodes(current=>({...current,[channel]:e.target.value.replace(/\D/g,'')}))}/></label><button className="platform-button" disabled={busy||codes[channel].length!==6}>Confirmar {label}</button></form></>:<p className="verification-unavailable">{channel==='email'?'El envío de correo':'El envío de SMS'} todavía no está habilitado. No hemos enviado ningún código.</p>)}
        </article>;
      })}</div>
      <p className="platform-muted">DNI {status.dniMasked||'pendiente'} · Dato declarado. Confirmar correo o móvil comprueba el acceso a ese contacto; no verifica tu identidad ante RENIEC.</p>
      {onContinue&&<button className="platform-button" disabled={busy||!canSaveQuote(status)} onClick={onContinue}>Continuar y guardar mi cotización</button>}
    </>}
  </section>;
}
