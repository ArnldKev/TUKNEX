'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { billingRequest } from '@/lib/billing/api';
import './account-notifications.css';

interface Notice {
  id: string;
  kind: string;
  projectName: string;
  route: string;
  createdAt: string;
  readAt: string | null;
}

interface Inbox {
  unread: number;
  items: Notice[];
}

const titles: Record<string, string> = {
  contract_sent: 'Recibiste un contrato',
  contract_accepted: 'El cliente aceptó el contrato',
  quote_request: 'Nueva solicitud de cotización',
  orientation: 'Nueva consulta de orientación',
  quote_response: 'El cliente respondió a una propuesta',
  payment_report: 'Nuevo aviso de pago',
  payment_report_updated: 'El cliente actualizó un aviso de pago',
};

const dateFormat = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
});

function destination(route: string) {
  const origin = 'https://cuenta.invalid';
  try {
    if (!route.startsWith('/')) return null;
    const url = new URL(route, origin);
    return url.origin === origin && /^\/(admin|equipo|mi-cuenta)(\/|$)/.test(url.pathname)
      ? url.pathname + url.search + url.hash
      : null;
  } catch {
    return null;
  }
}

export function AccountNotifications() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const running = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    try {
      const next = await billingRequest<Inbox>('account/notifications', {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!controller.signal.aborted) {
        setInbox(next);
        setError('');
      }
    } catch {
      if (!controller.signal.aborted) setError('No pudimos cargar las notificaciones.');
    } finally {
      if (running.current === controller) running.current = null;
    }
  }, []);

  useEffect(() => {
    const updateWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    const interval = window.setInterval(updateWhenVisible, 45000);
    window.addEventListener('focus', updateWhenVisible);
    window.addEventListener('billing-change', updateWhenVisible);
    document.addEventListener('visibilitychange', updateWhenVisible);
    return () => {
      running.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', updateWhenVisible);
      window.removeEventListener('billing-change', updateWhenVisible);
      document.removeEventListener('visibilitychange', updateWhenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function markRead(noticeId?: string) {
    setBusy(true);
    const endpoint = noticeId ? 'account/notifications/' + noticeId + '/read' : 'account/notifications/read-all';
    try {
      await billingRequest(endpoint, { method: 'POST', body: '{}' });
      await refresh();
    } catch {
      setError('No pudimos marcar la notificación como leída.');
    } finally {
      setBusy(false);
    }
  }

  const unread = inbox?.unread ?? 0;
  return (
    <div className="account-notifications" ref={root}>
      <button
        type="button" className="account-notifications-trigger" ref={trigger}
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {unread > 0 && <span className="account-notifications-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <section className="account-notifications-panel" id={id} aria-labelledby={id + '-heading'}>
          <div className="account-notifications-heading">
            <div>
              <h2 id={id + '-heading'} tabIndex={-1} ref={heading}>Notificaciones</h2>
              <span aria-live="polite">{unread ? `${unread} sin leer` : 'Al día'}</span>
            </div>
            <button type="button" className="account-notifications-icon" aria-label="Cerrar notificaciones" onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}><X size={19} aria-hidden="true" /></button>
          </div>
          {error && <p className="account-notifications-message" role="alert">{error} <button type="button" onClick={() => void refresh()}>Actualizar</button></p>}
          {!inbox && !error && <p className="account-notifications-message" role="status">Cargando notificaciones…</p>}
          {inbox && !inbox.items.length && <p className="account-notifications-message">Aún no tienes notificaciones.</p>}
          {!!unread && <button type="button" className="account-notifications-mark-all" disabled={busy} onClick={() => void markRead()}>Marcar todas como leídas</button>}
          {!!inbox?.items.length && <ul className="account-notifications-list">
            {inbox.items.map(item => {
              const route = destination(item.route);
              const content = <><strong>{titles[item.kind] || 'Actualización de TUKNEX'}</strong><span>{item.projectName}</span><time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time></>;
              return (
                <li key={item.id} data-unread={!item.readAt}>
                  {route ? <Link href={route} onClick={() => {
                    if (!item.readAt) void markRead(item.id);
                    if (route === window.location.pathname.replace(/\/$/, '') + window.location.search + window.location.hash) {
                      window.dispatchEvent(new Event('private-record-open'));
                    }
                    setOpen(false);
                  }}>{content}</Link> : <div className="account-notifications-item">{content}</div>}
                  {!item.readAt && <button type="button" className="account-notifications-icon" aria-label={`Marcar como leída la notificación de ${item.projectName}`} disabled={busy} onClick={() => void markRead(item.id)}><Check size={17} aria-hidden="true" /></button>}
                </li>
              );
            })}
          </ul>}
        </section>
      )}
    </div>
  );
}
