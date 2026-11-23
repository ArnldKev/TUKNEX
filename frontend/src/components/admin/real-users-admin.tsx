'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, ShieldCheck, Mail, UserRound } from 'lucide-react';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { billingRequest } from '@/lib/billing/api';
import type { BillingClient } from '@/lib/billing/types';
import type { User, UserRole } from '@/lib/platform/types';
import { AccountShell } from '@/components/auth/account-shell';
import { RecordList } from '@/components/records/record-list';
import { RecordDetail } from '@/components/records/record-detail';
import './real-users-admin.css';

const roleLabels = { admin: 'Administrador', subadmin: 'Subadministrador', client: 'Cliente' };
const roleDescriptions = {
  admin: 'Gestiona clientes, cotizaciones, contratos, pagos y configuración. La creación y suspensión de cuentas quedan a cargo del administrador principal.',
  subadmin: 'Trabaja en sus proyectos asignados y prepara cotizaciones y contratos. No accede a cobros, precios globales ni proyectos de otros colaboradores.',
  client: 'Consulta únicamente sus propios proyectos, cotizaciones, contratos y pagos.',
};
const roleLabel = (user: User) => user.isOwner ? 'Administrador principal' : roleLabels[user.role];
const message = (error: unknown) => error instanceof Error ? error.message : 'No pudimos completar la operación.';

export function RealUsersAdmin() {
  const { user } = useDemoAuth();
  return <RoleGate allowed={['admin']}><Users key={user?.id} /></RoleGate>;
}

function Users() {
  const { user: actor } = useDemoAuth();
  const canManage = actor?.isOwner === true;
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await billingRequest<User[]>('auth/users', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      if (!Array.isArray(result)) throw new Error('Respuesta de usuarios no válida.');
      if (!controller.signal.aborted) setUsers(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError(message(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  // A completed mutation must not be replaced by an older list response.
  function saveUser(saved: User) {
    request.current?.abort();
    setLoading(false);
    setError('');
    setUsers(current => [saved, ...(current || []).filter(item => item.id !== saved.id)]);
  }
  const selected = users?.find(item => item.id === selectedId);
  const filtered = users?.filter(item => (role === 'all' || item.role === role) &&
    (status === 'all' || (status === 'active' ? item.active !== false : item.active === false)));

  return (
    <AccountShell admin title="Usuarios">
      <div className="portal-page-heading">
        <div><h1>Usuarios</h1><p>Gestiona las cuentas y el acceso a TUKNEX.</p></div>
        <div className="users-actions">
          <button type="button" className="platform-secondary" disabled={loading} onClick={() => void load()}>
            {loading ? 'Consultando…' : error ? 'Reintentar' : 'Actualizar cuentas'}
          </button>
          {canManage && <button type="button" className="platform-button" disabled={users === null} onClick={() => { setNotice(''); setCreating(true); }}><Plus size={18} aria-hidden="true"/>Crear usuario</button>}
        </div>
      </div>
      {notice && <p className="platform-info" role="status">{notice}</p>}
      {!canManage && <p className="platform-info">El administrador principal gestiona la creación y suspensión de cuentas.</p>}
      <section className="portal-panel users-panel" aria-labelledby="registered-account-title" aria-busy={loading}>
        <h2 id="registered-account-title">Cuentas registradas</h2>
        <div className="users-filters">
          <label className="platform-field">Rol<select value={role} onChange={event => setRole(event.target.value)}><option value="all">Todos los roles</option><option value="admin">Administradores</option><option value="subadmin">Subadministradores</option><option value="client">Clientes</option></select></label>
          <label className="platform-field">Estado<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="suspended">Suspendidos</option></select></label>
        </div>
        {error && <p className="platform-error" role="alert">{error}{users ? ' Mostramos la última lista disponible.' : ''}</p>}
        {loading && !users && <p role="status">Cargando cuentas…</p>}
        {filtered && <RecordList items={filtered} getKey={item => item.id}
          getSearchText={item => [item.name, item.email, roleLabel(item)].join(' ')}
          searchLabel="Buscar por nombre, correo o rol"
          emptyMessage={users?.length ? 'No hay cuentas con estos filtros.' : 'Todavía no hay cuentas registradas.'}
          renderItem={item => <article className="console-user-row users-account-row">
            <div className="users-account-person"><strong>{item.name}</strong><span>{item.email}</span></div>
            <div><span>{roleLabel(item)}</span><span className={'users-status ' + (item.active === false ? 'suspended' : '')}>{item.active === false ? 'Suspendido' : 'Activo'}</span></div>
            <button type="button" className="platform-secondary" onClick={() => setSelectedId(item.id)}>Ver detalles<span className="sr-only"> de {item.name}</span></button>
          </article>}
        />}
      </section>
      {creating && canManage && <CreateUser users={users || []} onClose={() => setCreating(false)} onCreated={saved => {
        saveUser(saved); setCreating(false); setNotice('Cuenta de ' + saved.name + ' creada. Ya puede iniciar sesión con su contraseña inicial. No se envió ningún correo.');
      }}/>}
      {selected && <UserDetail key={selected.id} user={selected} canManage={canManage} onClose={() => setSelectedId(null)} onChanged={saveUser}/>}
    </AccountShell>
  );
}

function CreateUser({ users, onClose, onCreated }: { users: User[]; onClose: () => void; onCreated: (user: User) => void }) {
  const [role, setRole] = useState<UserRole>('client');
  const [linkExisting, setLinkExisting] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<BillingClient[] | null>(null);
  const [clientError, setClientError] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [clientRetry, setClientRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    if (!linkExisting || role !== 'client') return;
    const controller = new AbortController();
    setClientError(''); setClients(null);
    void billingRequest<{clients: BillingClient[]}>('billing/state', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) })
      .then(data => { if (!controller.signal.aborted) setClients(data.clients); })
      .catch(failure => { if (!controller.signal.aborted) setClientError(message(failure)); });
    return () => controller.abort();
  }, [linkExisting, role, clientRetry]);
  const availableClients = clients?.filter(client => !users.some(user => user.clientId === client.id));
  const visibleClients = availableClients?.filter(client => client.id === clientId ||
    [client.name, client.email, client.taxId].join(' ').toLocaleLowerCase('es').includes(clientQuery.trim().toLocaleLowerCase('es')));
  const selectedClient = clients?.find(client => client.id === clientId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget, fields = new FormData(form);
    const password = String(fields.get('password') || '');
    if (password !== fields.get('confirmPassword')) { setError('Las contraseñas no coinciden.'); form.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus(); return; }
    if (role === 'client' && linkExisting && !selectedClient) { setError('Selecciona el cliente que recibirá acceso.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    const controller = new AbortController(); mutation.current = controller;
    try {
      const saved = await billingRequest<User>('auth/users', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]), body: JSON.stringify({
        name: String(fields.get('name')).trim(), email: String(fields.get('email')).trim().toLowerCase(), role, password,
        ...(role === 'client' && linkExisting ? { clientId } : {}),
      }) });
      if (controller.signal.aborted) return;
      form.reset(); onCreated(saved);
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <RecordDetail title="Crear usuario" subtitle="Crea una cuenta y define qué espacio puede utilizar." className="users-dialog" onClose={() => { if (!inFlight.current) onClose(); }}>
    <form className="users-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <div className="users-form-grid">
          <label className="platform-field">Nombre y apellidos<input name="name" required minLength={2} maxLength={100} autoComplete="off"/></label>
          <label className="platform-field">Correo de acceso<input name="email" type="email" required maxLength={254} autoComplete="off"/></label>
        </div>
        <label className="platform-field">Rol<select name="role" value={role} onChange={event => { setRole(event.target.value as UserRole); setClientId(''); setError(''); }}><option value="client">Cliente</option><option value="subadmin">Subadministrador</option><option value="admin">Administrador</option></select></label>
        <div className="users-role-description"><ShieldCheck size={22} aria-hidden="true"/><p>{roleDescriptions[role]}</p></div>
        {role === 'client' && <section className="users-client-link">
          <label className="platform-check"><input type="checkbox" checked={linkExisting} onChange={event => { setLinkExisting(event.target.checked); setClientId(''); }}/><span>Dar acceso a un cliente ya guardado</span></label>
          {!linkExisting && <p>Se creará también su ficha en Clientes. Si ya lo registraste allí, activa esta opción para conservar sus documentos en la misma ficha.</p>}
          {linkExisting && <>
            <p>Selecciona la ficha correcta. Esta cuenta podrá consultar los documentos publicados que pertenezcan a ese cliente.</p>
            {clientError ? <div role="alert"><p className="platform-error">{clientError}</p><button className="platform-secondary" type="button" onClick={() => setClientRetry(value => value + 1)}>Reintentar clientes</button></div> : !clients ? <p role="status">Cargando clientes…</p> : <>
              <label className="platform-field">Buscar cliente por nombre, correo o documento<input type="search" value={clientQuery} onChange={event => setClientQuery(event.target.value)}/></label>
              <label className="platform-field">Cliente guardado<select required value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Selecciona un cliente sin cuenta</option>{visibleClients?.map(client => <option key={client.id} value={client.id}>{client.name} · {client.email || client.taxId || 'Sin correo'}</option>)}</select></label>
              {!availableClients?.length && <p>No hay clientes disponibles sin cuenta. Puedes crear una ficha nueva desactivando esta opción.</p>}
              {selectedClient && <p className="platform-info">Darás acceso a <strong>{selectedClient.name}</strong> · {selectedClient.email || 'Sin correo guardado'} · Documento: {selectedClient.taxId || 'Sin documento'}.</p>}
            </>}
          </>}
        </section>}
        <div className="users-form-grid">
          <label className="platform-field">Contraseña inicial<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" aria-describedby="users-password-help"/></label>
          <label className="platform-field">Repetir contraseña<input name="confirmPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>
        </div>
        <p id="users-password-help" className="users-help">Usa al menos 12 caracteres. La persona podrá cambiarla desde Recuperar acceso. Crear la cuenta no envía correos; después puedes enviar un código desde su ficha si el correo está configurado.</p>
      </fieldset>
      {error && <p className="platform-error" role="alert">{error}</p>}
      {busy && <p role="status">Creando la cuenta…</p>}
      <div className="users-actions users-form-actions"><button type="button" className="platform-secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="platform-button" type="submit" disabled={busy || (role === 'client' && linkExisting && !selectedClient)}><Plus size={18} aria-hidden="true"/>{busy ? 'Creando…' : 'Crear usuario'}</button></div>
    </form>
  </RecordDetail>;
}

function UserDetail({ user, canManage, onClose, onChanged }: { user: User; canManage: boolean; onClose: () => void; onChanged: (user: User) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const inFlight = useRef(false);
  const mutation = useRef<AbortController | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  async function act(kind: 'status' | 'invitation') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    const controller = new AbortController(); mutation.current = controller;
    try {
      if (kind === 'status') {
        const saved = await billingRequest<User>('auth/users/' + user.id + '/status', { method: 'PATCH', body: JSON.stringify({active: user.active === false}), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (controller.signal.aborted) return;
        onChanged(saved); setConfirmSuspend(false); setNotice(saved.active ? 'Acceso reactivado.' : 'Acceso suspendido. Se cerraron sus sesiones; sus documentos se conservan.');
      } else {
        const result = await billingRequest<{message: string}>('auth/users/' + user.id + '/invitation', { method: 'POST', body: '{}', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (controller.signal.aborted) return;
        setNotice(result.message + ' En Recuperar acceso, elige «Ya tengo un código» para establecer la contraseña.');
      }
    } catch (failure) { if (!controller.signal.aborted) setError(message(failure)); }
    finally { inFlight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <RecordDetail title={user.name} subtitle={user.email} className="users-dialog" onClose={() => { if (!inFlight.current) onClose(); }}>
    <div className="users-form">
      <div className="users-role-description"><UserRound size={24} aria-hidden="true"/><div><h3>{roleLabel(user)}</h3><p>{user.isOwner ? 'Control principal de TUKNEX y gestión de todas las cuentas.' : roleDescriptions[user.role]}</p></div></div>
      <dl className="users-detail-data"><div><dt>Estado</dt><dd>{user.active === false ? 'Suspendido' : 'Activo'}</dd></div><div><dt>Fecha de creación</dt><dd>{new Date(user.createdAt).toLocaleDateString('es-PE', {timeZone: 'America/Lima'})}</dd></div></dl>
      {user.isOwner && <p className="platform-info">La cuenta principal está protegida y no se puede suspender desde este panel.</p>}
      {canManage && !user.isOwner && <>
        <section className="users-detail-section"><h3>Acceso a la cuenta</h3><p>Envía un código para que esta persona establezca su propia contraseña en <Link href="/recuperar-acceso" target="_blank" rel="noopener noreferrer">Recuperar acceso</Link>. Necesita el servicio de correo configurado.</p><button type="button" className="platform-secondary" disabled={busy || user.active === false} onClick={() => void act('invitation')}><Mail size={17} aria-hidden="true"/>Enviar código de acceso</button></section>
        <section className="users-detail-section"><h3>{user.active === false ? 'Reactivar cuenta' : 'Suspender cuenta'}</h3><p>Suspender impide iniciar sesión y cierra las sesiones existentes. Los proyectos y documentos se conservan.</p>
          {confirmSuspend && user.active !== false ? <div className="users-confirm"><p>¿Suspender el acceso de <strong>{user.name}</strong>?</p><div className="users-actions"><button type="button" className="platform-secondary" disabled={busy} onClick={() => setConfirmSuspend(false)}>Cancelar</button><button type="button" className="platform-secondary users-danger" disabled={busy} onClick={() => void act('status')}>Confirmar suspensión</button></div></div> : <button type="button" className="platform-secondary" disabled={busy} onClick={() => { if (user.active === false) void act('status'); else setConfirmSuspend(true); }}>{user.active === false ? 'Reactivar acceso' : 'Suspender acceso'}</button>}
        </section>
      </>}
      {busy && <p role="status">Guardando la solicitud…</p>}
      {error && <p className="platform-error" role="alert">{error}</p>}
      {notice && <p className="platform-info" role="status">{notice}</p>}
    </div>
  </RecordDetail>;
}
