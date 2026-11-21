'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { billingRequest } from '@/lib/billing/api';

export function RecoveryForm({ onBack }: { onBack?: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const phaseHeading = useRef<HTMLHeadingElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sent) phaseHeading.current?.focus();
  }, [sent, done]);

  async function request(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await billingRequest<{ message: string }>('auth/recovery/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo solicitar el correo.');
    } finally {
      setBusy(false);
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
      await billingRequest('auth/recovery/confirm', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      });
      setPassword('');
      setConfirm('');
      setCode('');
      setDone(true);
      setNotice('Se cerraron las sesiones anteriores. Vuelve a iniciar sesión con tu nueva contraseña.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo recuperar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setSent(false);
    setCode('');
    setError('');
    setNotice('');
    // The email field remains mounted in both steps.
    emailInput.current?.focus();
  }

  return (
    <div className="auth-recovery">
      {sent && (
        <h3 className="auth-recovery-phase" ref={phaseHeading} tabIndex={-1}>
          {done ? 'Contraseña actualizada' : 'Ingresa tu código y tu nueva contraseña'}
        </h3>
      )}
      <div className="auth-recovery-status">
        {error && <p className="platform-error" role="alert">{error}</p>}
        {notice && <p className="platform-info" role="status">{notice}</p>}
      </div>
      {!done && (
        <form className="auth-form" onSubmit={sent ? reset : request}>
          <label className="platform-field">
            Correo de tu cuenta
            <input ref={emailInput} type="email" autoComplete="username" required readOnly={sent} value={email} onChange={event => setEmail(event.target.value)} />
          </label>
          {sent && <>
            <label className="platform-field">
              Código de recuperación
              <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} />
            </label>
            <label className="platform-field">
              Nueva contraseña
              <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
            </label>
            <label className="platform-field">
              Confirma la nueva contraseña
              <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} />
            </label>
          </>}
          <button className="platform-button" disabled={busy} type="submit">
            {busy ? 'Un momento…' : sent ? 'Actualizar contraseña' : 'Solicitar código'}
          </button>
          {sent && <button className="platform-text-link" type="button" onClick={changeEmail}>Cambiar correo o solicitar otro código</button>}
        </form>
      )}
      {!done && <p className="platform-muted">Si no recibes el código, puedes <Link href="/contacto">contactarnos</Link>.</p>}
      {onBack
        ? <button className="platform-text-link" type="button" onClick={onBack}>Volver a iniciar sesión</button>
        : <Link className="platform-text-link" href="/acceder">Volver a iniciar sesión</Link>}
    </div>
  );
}
