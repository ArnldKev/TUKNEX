'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAccessibleModal } from '@/components/auth/use-accessible-modal';
import './records.css';

export function RecordDetail({ title, subtitle, actions, onClose, children, className = '' }: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useAccessibleModal(mounted, onClose, dialog);
  if (!mounted) return null;
  return createPortal(
    <div className="records-detail-backdrop">
      <section className={'platform-modal records-detail ' + className} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} tabIndex={-1}>
        <header className="records-detail-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <div className="records-detail-subtitle">{subtitle}</div>}</div>
          <button type="button" className="records-detail-close" onClick={onClose}><X size={19} aria-hidden="true"/><span>Cerrar detalle</span></button>
        </header>
        {actions && <div className="records-detail-actions">{actions}</div>}
        <div className="records-detail-body">{children}</div>
      </section>
    </div>, document.body,
  );
}
