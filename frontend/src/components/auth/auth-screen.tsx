'use client';
import Link from 'next/link';
import { RecoveryForm } from './recovery-form';
import type {User} from '@/lib/platform/types';
import './production.css';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import {
  registrationConfirmationIssue,
  registrationPasswordHelp,
  registrationPasswordIssue,
  registrationPasswordMax,
  registrationPasswordMin,
} from '@/lib/platform/registration-password';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useDemoAuth } from '@/lib/platform/auth';
import './platform.css';
export function AuthScreen({mode='login',embedded=false,onModeChange,onComplete}:{mode?:'login'|'register'|'reset';embedded?:boolean;onModeChange?:(mode:'login'|'register'|'reset')=>void;onComplete?:(user:User)=>Promise<void>}) {
  const auth=useDemoAuth(),router=useRouter();
  const [phone,setPhone]=useState(''),[dni,setDni]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState('');
  const [consent,setConsent]=useState(false),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmationError, setConfirmationError] = useState<string>();
  const passwordId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const registering = mode === 'register';

  async function submit(event:React.FormEvent) {
    event.preventDefault();
    setError('');
    if (registering) {
      const issue = registrationPasswordIssue(password);
      const confirmationIssue = registrationConfirmationIssue(password, confirm);
      setPasswordError(issue);
      setConfirmationError(confirmationIssue);
      if (issue || confirmationIssue) {
        (issue ? passwordRef : confirmationRef).current?.focus();
        return;
      }
    }
    setBusy(true);
    try {
      if(mode==='reset') {await auth.resetPassword(email);return;}
      if(mode==='register' && !consent) throw new Error('Confirma que aceptas el tratamiento de tus datos para gestionar tu cuenta.');
      const user=mode==='login' ? await auth.login(email,password) : await auth.register({name,email,password,phone,dni,privacyConsent:consent});
      setPassword('');setConfirm('');if(onComplete)await onComplete(user);else router.replace(user.role==='admin'?'/admin':user.role==='subadmin'?'/equipo':'/mi-cuenta');
    } catch(error) {setError(error instanceof Error?error.message:'No pudimos completar la operación. Vuelve a intentarlo.');}
    finally {setBusy(false);}
  }
  return <main className={'auth-page'+(embedded?' auth-embedded':'')}>
    <aside className="auth-story">
      <Link href="/" className="platform-brand"><img className="official" src="/images/brand-logo.webp" alt="TUKNEX · La base de tu siguiente nivel" /></Link>
      <div className="auth-story-main"><span className="platform-pill"><Sparkles size={13}/> TU SIGUIENTE NIVEL, MÁS CERCA</span><h1>Las buenas ideas<br/>merecen un<br/><em>gran espacio.</em></h1><p>Tu proyecto, tus avances y tu equipo. Todo conectado, de una forma simple y cercana.</p></div>
      <div className="auth-story-footer"><ShieldCheck size={16}/><span>Tu cuenta, conectada con TUKNEX.</span></div>
    </aside>
    <section className="auth-form-area"><Link className="auth-back" href="/"><ArrowLeft size={15}/> Volver a TUKNEX</Link>
      <div className="auth-form-container"><span className="auth-demo-label"><span/> TU ESPACIO TUKNEX</span>
        <h2>{mode==='login'?'Qué bueno verte por aquí.':mode==='register'?'Empecemos algo grande.':'Recupera tu acceso.'}</h2>
        <p className="auth-description">{mode==='login'?'Inicia sesión con tu correo y contraseña.':mode==='register'?'Crea tu cuenta para consultar tus cotizaciones y seguir tu proyecto.':'Solicita un código por correo para recuperar tu acceso.'}</p>
        {mode==='reset' ? <RecoveryForm onBack={embedded?()=>onModeChange?.('login'):undefined}/> : <>
          <form onSubmit={submit} className="auth-form">
            {mode==='register' && <>
              <label className="platform-field">Nombre completo<div><UserRound size={17}/><input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} /></div></label>
              <label className="platform-field">Número de móvil<input type="tel" autoComplete="tel" required maxLength={20} placeholder="+51 9…" value={phone} onChange={e=>setPhone(e.target.value)}/><small>Usaremos este número para tu cuenta y la verificación por SMS cuando esté habilitada.</small></label><label className="platform-field">DNI (8 dígitos)<input inputMode="numeric" autoComplete="off" required pattern="[0-9]{8}" minLength={8} maxLength={8} value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,''))}/><small>Dato declarado para tus documentos. No constituye una verificación de identidad oficial.</small></label>
            </>}
            <label className="platform-field">Correo electrónico<div><Mail size={17}/><input name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></div></label>
            <div className="platform-field">
              <span>
                <label htmlFor={passwordId}>Contraseña</label>
                {!registering && (embedded
                  ? <button type="button" className="platform-text-link" onClick={() => onModeChange?.('reset')}>¿Olvidaste tu acceso?</button>
                  : <Link href="/recuperar-acceso">¿Olvidaste tu acceso?</Link>)}
              </span>
              <div>
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  required
                  minLength={registering ? registrationPasswordMin : 1}
                  maxLength={registrationPasswordMax}
                  value={password}
                  aria-invalid={registering && passwordError ? true : undefined}
                  aria-describedby={registering ? `${passwordId}-help${passwordError ? ` ${passwordId}-error` : ''}` : undefined}
                  onChange={event => {
                    setPassword(event.target.value);
                    setPasswordError(undefined);
                    setConfirmationError(undefined);
                  }}
                  onInvalid={registering ? event => setPasswordError(registrationPasswordIssue(event.currentTarget.value)) : undefined}
                />
                <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {registering && <small id={passwordId + '-help'}>{registrationPasswordHelp}</small>}
              {registering && passwordError && <p className="platform-error" id={passwordId + '-error'} role="alert">{passwordError}</p>}
            </div>
            {registering && <>
              <div className="platform-field">
                <label htmlFor={passwordId + '-confirm'}>Confirma tu contraseña</label>
                <div>
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    ref={confirmationRef}
                    id={passwordId + '-confirm'}
                    name="confirmPassword"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={registrationPasswordMin}
                    maxLength={registrationPasswordMax}
                    value={confirm}
                    aria-invalid={!!confirmationError || undefined}
                    aria-describedby={confirmationError ? passwordId + '-confirm-error' : undefined}
                    onChange={event => {
                      setConfirm(event.target.value);
                      setConfirmationError(undefined);
                    }}
                    onInvalid={event => setConfirmationError(registrationConfirmationIssue(password, event.currentTarget.value))}
                  />
                </div>
                {confirmationError && <p className="platform-error" id={passwordId + '-confirm-error'} role="alert">{confirmationError}</p>}
              </div>
              <label className="platform-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Acepto el tratamiento de mis datos para crear y gestionar mi cuenta y cotizaciones. <Link href="/privacidad" target="_blank" rel="noopener noreferrer">Cómo usamos tus datos</Link>.</span></label>
            </>}
            {error && <p className="platform-error" role="alert">{error}</p>}
            <button className="platform-button auth-submit" disabled={busy} type="submit">{busy?'Un momento…':mode==='login'?'Iniciar sesión':'Crear mi cuenta'} <ArrowRight size={17}/></button>
          </form>
          <p className="auth-switch">{mode==='login'?<>¿Aún no tienes cuenta? {embedded?<button type="button" onClick={()=>onModeChange?.('register')}>Crear una cuenta</button>:<Link href="/registro">Crear una cuenta</Link>}</>:<>¿Ya tienes cuenta? {embedded?<button type="button" onClick={()=>onModeChange?.('login')}>Iniciar sesión</button>:<Link href="/acceder">Iniciar sesión</Link>}</>}</p>
          <div className="auth-privacy"><ShieldCheck size={15}/><p>Protegemos tu contraseña y solo puedes acceder a lo que corresponde a tu cuenta.</p></div>
        </>}
      </div><p className="auth-form-footer">TUKNEX · La base de tu siguiente nivel</p>
    </section>
  </main>;
}
