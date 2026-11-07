'use client';
import { useEffect, useRef, type RefObject } from 'react';

type ModalEntry = { token: symbol; root: () => HTMLElement | null };
const modals: ModalEntry[] = [];
let originalOverflow = '';
const focusable = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
function controls(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(focusable)).filter(element =>
    element.tabIndex >= 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0,
  );
}
function focusInside(root: HTMLElement | null) {
  if (!root) return;
  const target = controls(root)[0] || root;
  target.focus({ preventScroll: true });
}

/** One focus trap per topmost dialog; nested details/editors share the scroll lock. */
export function useAccessibleModal(open: boolean, onClose: () => void, dialogRef?: RefObject<HTMLElement | null>) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const returnScope = previous?.closest<HTMLElement>('.records-list, .quote-requests-panel, .team-workspace, .portal-content, main');
    const entry: ModalEntry = {
      token: Symbol('dialog'),
      root: () => dialogRef?.current || Array.from(document.querySelectorAll<HTMLElement>('.platform-modal')).at(-1) || null,
    };
    if (!modals.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modals.push(entry);
    const isTop = () => modals.at(-1)?.token === entry.token;
    const frame = requestAnimationFrame(() => { if (isTop()) focusInside(entry.root()); });
    const keyboard = (event: KeyboardEvent) => {
      if (!isTop() || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = entry.root();
      if (!root) return;
      const items = controls(root), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); root.focus({ preventScroll: true }); return; }
      if (!root.contains(document.activeElement)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keyboard);
      const wasTop = isTop(), index = modals.indexOf(entry);
      if (index >= 0) modals.splice(index, 1);
      if (!modals.length) document.body.style.overflow = originalOverflow;
      if (wasTop) {
        const next = modals.at(-1)?.root();
        if (previous?.isConnected && (!next || next.contains(previous))) previous.focus({ preventScroll: true });
        else if (next) focusInside(next);
        else if (returnScope?.isConnected) focusInside(returnScope);
      }
    };
  }, [open, dialogRef]);
}
