'use client';
import Link from 'next/link';
import { RecoveryForm } from './recovery-form';
import type {User} from '@/lib/platform/types';
import './production.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useDemoAuth } from '@/lib/platform/auth';
import { billingRequest } from '@/lib/billing/api';
import './platform.css';
export function AuthScreen({mode='login',embedded=false,onModeChange,onComplete}:{mode?:'login'|'register'|'reset';embedded?:boolean;onModeChange?:(mode:'login'|'register'|'reset')=>void;onComplete?:(user:User)=>Promise<void>}) {
  const auth=useDemoAuth(),router=useRouter();
  const [phone,setPhone]=useState(''),[dni,setDni]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState(''),[setupToken,setSetupToken]=useState('');
  const [admin,setAdmin]=useState(false),[needsAdmin,setNeedsAdmin]=useState(false),[consent,setConsent]=useState(false),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{billingRequest<{needsAdmin:boolean}>('auth/setup-status').then(r=>setNeedsAdmin(r.needsAdmin)).catch(()=>{});},[]);
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try {
      if(mode==='reset') {await auth.resetPassword(email);return;}
      if(mode==='register' && password!==confirm) throw new Error('Las contraseñas no coinciden.');
      if(mode==='register' && !consent) throw new Error('Confirma que aceptas el tratamiento de tus datos para gestionar tu cuenta.');
      const user=mode==='login' ? await auth.login(email,password) : admin ? await auth.registerAdmin({name,email,password,setupToken}) : await auth.register({name,email,password,phone,dni,privacyConsent:consent});
      setPassword('');setConfirm('');setSetupToken('');if(onComplete)await onComplete(user);else router.replace(user.role==='admin'?'/admin':'/mi-cuenta');
    } catch(error) {setError(error instanceof Error?error.message:'No pudimos completar la operación. Comprueba que el backend esté encendido.');}
    finally {setBusy(false);}
  }
  return <main className={'auth-page'+(embedded?' auth-embedded':'')}>
    <aside className="auth-story">
      <Link href="/" className="platform-brand"><img className="official" src="/images/brand-logo.png" alt="TUKNEX · La base de tu siguiente nivel" /></Link>
      <div className="auth-story-main"><span className="platform-pill"><Sparkles size={13}/> TU SIGUIENTE NIVEL, MÁS CERCA</span><h1>Las buenas ideas<br/>merecen un<br/><em>gran espacio.</em></h1><p>Tu proyecto, tus avances y tu equipo. Todo conectado, de una forma simple y cercana.</p></div>
      <div className="auth-story-footer"><ShieldCheck size={16}/><span>Tu cuenta, conectada con TUKNEX.</span></div>
    </aside>
    <section className="auth-form-area"><Link className="auth-back" href="/"><ArrowLeft size={15}/> Volver a TUKNEX</Link>
      <div className="auth-form-container"><span className="auth-demo-label"><span/> TU ESPACIO TUKNEX</span>
        <h2>{mode==='login'?'Qué bueno verte por aquí.':mode==='register'?'Empecemos algo grande.':'Recupera tu acceso.'}</h2>
        <p className="auth-description">{mode==='login'?'Inicia sesión con tu correo y contraseña.':mode==='register'?'Crea tu cuenta para consultar tus cotizaciones y seguir tu proyecto.':'Solicita un código por correo para recuperar tu acceso.'}</p>
        {mode==='login' && needsAdmin && <p className="platform-info">Primera configuración: <Link href="/registro">crear la cuenta administradora</Link> requiere el código privado del backend.</p>}
        {mode==='reset' ? <RecoveryForm onBack={embedded?()=>onModeChange?.('login'):undefined}/> : <>
          <form onSubmit={submit} className="auth-form">
            {mode==='register' && <>
              {needsAdmin && <label className="platform-field">Tipo de cuenta<select value={admin?'admin':'client'} onChange={e=>setAdmin(e.target.value==='admin')}><option value="client">Cliente</option><option value="admin">Primer administrador</option></select></label>}
              <label className="platform-field">Nombre completo<div><UserRound size={17}/><input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} /></div></label>
              {!admin && <><label className="platform-field">Número de móvil<input type="tel" autoComplete="tel" required maxLength={20} placeholder="+51 9…" value={phone} onChange={e=>setPhone(e.target.value)}/><small>Usaremos este número para tu cuenta y la verificación por SMS cuando esté habilitada.</small></label><label className="platform-field">DNI (8 dígitos)<input inputMode="numeric" autoComplete="off" required pattern="[0-9]{8}" minLength={8} maxLength={8} value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,''))}/><small>Dato declarado para tus documentos. No constituye una verificación de identidad oficial.</small></label></>}
              {admin && <label className="platform-field">Código privado de configuración<div><LockKeyhole size={17}/><input type="password" autoComplete="off" required minLength={24} value={setupToken} onChange={e=>setSetupToken(e.target.value)}/></div><small>Se configura únicamente en el backend. Si ya existe un administrador, pídele que cree tu acceso.</small></label>}
            </>}
            <label className="platform-field">Correo electrónico<div><Mail size={17}/><input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></div></label>
            <label className="platform-field"><span>Contraseña {mode==='login' && (embedded?<button type="button" className="platform-text-link" onClick={()=>onModeChange?.('reset')}>¿Olvidaste tu acceso?</button>:<Link href="/recuperar-acceso">¿Olvidaste tu acceso?</Link>)}</span><div><LockKeyhole size={17}/><input type={show?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} required minLength={mode==='register'?12:1} maxLength={128} placeholder={mode==='register'?'Mínimo 12 caracteres':''} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setShow(!show)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
            {mode==='register' && <><label className="platform-field">Confirma tu contraseña<div><LockKeyhole size={17}/><input type={show?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></label><label className="platform-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Acepto el tratamiento de mis datos para crear y gestionar mi cuenta y cotizaciones. <Link href="/privacidad" target="_blank" rel="noopener noreferrer">Cómo usamos tus datos</Link>.</span></label></>}
            {error && <p className="platform-error" role="alert">{error}</p>}
            <button className="platform-button auth-submit" disabled={busy} type="submit">{busy?'Un momento…':mode==='login'?'Iniciar sesión':admin?'Crear administrador':'Crear mi cuenta'} <ArrowRight size={17}/></button>
          </form>
          <p className="auth-switch">{mode==='login'?<>¿Aún no tienes cuenta? {embedded?<button type="button" onClick={()=>onModeChange?.('register')}>Crear una cuenta</button>:<Link href="/registro">Crear una cuenta</Link>}</>:<>¿Ya tienes cuenta? {embedded?<button type="button" onClick={()=>onModeChange?.('login')}>Iniciar sesión</button>:<Link href="/acceder">Iniciar sesión</Link>}</>}</p>
          <div className="auth-privacy"><ShieldCheck size={15}/><p>Tu contraseña se almacena mediante un hash seguro. Los permisos y la sesión se verifican en el servidor.</p></div>
        </>}
      </div><p className="auth-form-footer">TUKNEX · La base de tu siguiente nivel</p>
    </section>
  </main>;
}
