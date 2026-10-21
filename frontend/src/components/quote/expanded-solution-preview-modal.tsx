'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Expand, Monitor, Tablet, X } from 'lucide-react';
import type { SolutionPreviewModel } from '@/lib/quote/preview';

interface ExpandedPreviewProps {
  model: SolutionPreviewModel;
  children: ReactNode;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}
const focusSelector =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ExpandedSolutionPreviewModal({
  model,
  children,
  onClose,
  returnFocusRef,
}: ExpandedPreviewProps) {
  const [presentation, setPresentation] = useState(false),
    [device, setDevice] = useState<'desktop' | 'tablet'>('desktop');
  const overlayRef = useRef<HTMLDivElement>(null),
    dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null),
    presentationRef = useRef<HTMLButtonElement>(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  const titleId = useId(),
    descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current,
      overlay = overlayRef.current;
    if (!dialog || !overlay) return;
    const previousFocus =
      returnFocusRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const body = document.body,
      html = document.documentElement,
      scrollY = window.scrollY;
    const savedBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const savedHtml = { overflow: html.style.overflow, scrollBehavior: html.style.scrollBehavior };
    const scrollbar = Math.max(0, window.innerWidth - html.clientWidth);
    const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    const siblings = Array.from(body.children)
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== overlay)
      .map((node) => ({ node, inert: node.inert, ariaHidden: node.getAttribute('aria-hidden') }));
    siblings.forEach(({ node }) => {
      node.inert = true;
      node.setAttribute('aria-hidden', 'true');
    });
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '-' + scrollY + 'px';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.paddingRight = currentPadding + scrollbar + 'px';
    html.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusSelector)).filter(
        (node) => node.getClientRects().length > 0 && !node.closest('[hidden]'),
      );
    const focusFirst = () => (focusable()[0] ?? dialog).focus({ preventScroll: true });
    const frame = window.requestAnimationFrame(() =>
      (closeRef.current ?? dialog).focus({ preventScroll: true }),
    );
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeAction.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable(),
        first = elements[0],
        last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      siblings.forEach(({ node, inert, ariaHidden }) => {
        node.inert = inert;
        if (ariaHidden === null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', ariaHidden);
      });
      Object.assign(body.style, savedBody);
      html.style.overflow = savedHtml.overflow;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = savedHtml.scrollBehavior;
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected && !previousFocus.closest('[inert]'))
          previousFocus.focus({ preventScroll: true });
      });
    };
  }, [returnFocusRef]);

  function togglePresentation() {
    setPresentation((value) => !value);
    window.requestAnimationFrame(() => presentationRef.current?.focus({ preventScroll: true }));
  }
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={overlayRef}
      className={'lp-modal-overlay' + (presentation ? ' lp-presentation' : '')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeAction.current();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="lp-expanded-dialog"
      >
        <header className="lp-modal-header">
          <div className={presentation ? 'lp-sr-only' : 'lp-modal-title'}>
            <span>VISTA PREVIA EN VIVO</span>
            <h2 id={titleId}>{model.businessName}</h2>
            <p id={descriptionId}>
              Maqueta orientativa. Explora el concepto; el diseño y alcance final se definirán contigo.
            </p>
          </div>
          <div className="lp-modal-tools">
            {!presentation && (
              <div className="lp-device-controls" role="group" aria-label="Ancho de la presentación">
                <button
                  type="button"
                  aria-pressed={device === 'desktop'}
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor size={17} />
                  <span>Amplia</span>
                </button>
                <button type="button" aria-pressed={device === 'tablet'} onClick={() => setDevice('tablet')}>
                  <Tablet size={17} />
                  <span>Tablet</span>
                </button>
              </div>
            )}
            <button
              ref={presentationRef}
              type="button"
              className="lp-presentation-toggle"
              onClick={togglePresentation}
              aria-pressed={presentation}
            >
              {presentation ? <ArrowLeft size={17} /> : <Expand size={17} />}
              <span>{presentation ? 'Salir de presentación' : 'Presentación limpia'}</span>
            </button>
            <button
              ref={closeRef}
              type="button"
              className="lp-modal-close"
              onClick={() => closeAction.current()}
              aria-label="Cerrar vista previa y volver al cotizador"
            >
              <X size={20} />
              <span>Volver</span>
            </button>
          </div>
        </header>
        <div className="lp-modal-body">
          <div className={'lp-expanded-stage lp-device-' + device}>{children}</div>
        </div>
        {!presentation && (
          <footer className="lp-modal-footer">
            <span>
              <i /> {model.solutionName} · {model.styleName} · {model.palette.name}
            </span>
            <small>Esc para volver · Las respuestas del cotizador se conservan.</small>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
