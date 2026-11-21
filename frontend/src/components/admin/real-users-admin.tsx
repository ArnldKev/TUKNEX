'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { billingRequest } from '@/lib/billing/api';
import type { User } from '@/lib/platform/types';
import { AccountShell } from '@/components/auth/account-shell';
import { RecordList } from '@/components/records/record-list';

const roleLabel = { admin: 'Administrador principal', subadmin: 'Subadministrador', client: 'Cliente' };

export function RealUsersAdmin() {
  const { user } = useDemoAuth();
  return <RoleGate allowed={['admin']}><Users key={user?.id} /></RoleGate>;
}

function Users() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await billingRequest<User[]>('auth/users', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      if (!Array.isArray(result)) throw new Error('Respuesta de usuarios no válida');
      if (!controller.signal.aborted) setUsers(result);
    } catch {
      if (!controller.signal.aborted) setError('No pudimos actualizar las cuentas.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  return (
    <AccountShell admin title="Usuarios">
      <div className="portal-page-heading">
        <div>
          <h1>Usuarios</h1>
          <p>Consulta las cuentas con acceso a TUKNEX.</p>
        </div>
        <button type="button" className="platform-secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Consultando…' : error ? 'Reintentar' : 'Actualizar cuentas'}
        </button>
      </div>
      <section className="portal-panel" aria-labelledby="registered-account-title" aria-busy={loading}>
        <h2 id="registered-account-title">Cuentas registradas</h2>
        {error && <p className="platform-error" role="alert">{error}{users ? ' Mostramos la última lista disponible.' : ''}</p>}
        {loading && !users && <p role="status">Cargando cuentas…</p>}
        {users && <RecordList
          items={users}
          getKey={item => item.id}
          getSearchText={item => [item.name, item.email, roleLabel[item.role]].join(' ')}
          searchLabel="Buscar por nombre, correo o rol"
          emptyMessage="Todavía no hay cuentas registradas."
          renderItem={item => <article className="console-user-row">
            <div><strong>{item.name}</strong><span>{item.email}</span></div>
            <span>{roleLabel[item.role]}</span>
          </article>}
        />}
      </section>
    </AccountShell>
  );
}
