'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { platformRepository } from '@/lib/platform/repository';
export function LeadActions() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector('input')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('input,textarea,button') || []);
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [open]);
  return (
    <>
      <div className="adm-lead-actions">
        <span>Registros ficticios · Los cambios duran esta sesión</span>
        <button
          className="adm-primary"
          onClick={() => {
            setOpen(true);
            setNotice('');
          }}
        >
          <Plus size={15} />
          Nuevo lead demo
        </button>
      </div>
      {notice && (
        <p className="adm-inline-notice" role="status">
          {notice}
        </p>
      )}
      {open && (
        <div className="adm-modal-backdrop" onClick={() => setOpen(false)}>
          <form
            ref={ref}
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-lead-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              platformRepository.createLead({
                name: String(data.get('name')),
                business: String(data.get('business')),
                email: String(data.get('email')),
                message: String(data.get('message')),
              });
              setNotice('Lead de demostración creado en memoria.');
              setOpen(false);
            }}
          >
            <button
              className="adm-modal-close"
              type="button"
              aria-label="Cerrar nuevo lead"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            <span className="adm-eyebrow">NUEVA OPORTUNIDAD · DEMO</span>
            <h2 id="create-lead-title">Una idea que empieza.</h2>
            <label className="adm-field">
              Nombre de ejemplo
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Cliente de ejemplo"
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              Negocio
              <input
                name="business"
                required
                minLength={2}
                maxLength={100}
                placeholder="Mi negocio demo"
                autoComplete="off"
              />
            </label>
            <label className="adm-field">
              Correo de ejemplo
              <input type="email" name="email" placeholder="cliente@example.com" autoComplete="off" />
            </label>
            <label className="adm-field">
              Necesidad
              <textarea name="message" rows={3} maxLength={1000} />
            </label>
            <div className="adm-modal-actions">
              <button type="button" className="adm-secondary" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="adm-primary" type="submit">
                <Save size={15} />
                Crear lead demo
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
