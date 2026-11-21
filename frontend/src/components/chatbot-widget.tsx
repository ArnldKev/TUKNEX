'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  MessageCircle,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { brand } from '@/config/brand';
import { NexiAvatar } from '@/components/3d/nexi-avatar';
import { getWhatsAppUrl } from '@/lib/config';
import { DEFAULT_PRICES, PROJECT_TYPES, readPriceOverrides } from '@/lib/pricing';
import { guidedAssistantProvider, recommendationUrl } from '@/lib/assistant/guided-provider';
import type { AssistantMessage, AssistantRecommendation } from '@/lib/assistant/contracts';
import { platformRepository } from '@/lib/platform/repository';
import { useDemoAuth } from '@/lib/platform/auth';
import './quote-chat.css';
import './nexi-editorial.css';

const quickPrompts = [
  'Tengo un restaurante: menú y pedidos por WhatsApp',
  'No sé qué web necesito',
  '¿Qué es hosting?',
  '¿Cuánto cuesta una web?',
];
type NexiState = 'idle' | 'wave' | 'listening' | 'thinking' | 'celebrate';
function newMessage(
  role: AssistantMessage['role'],
  content: string,
  recommendation?: AssistantRecommendation,
): AssistantMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    recommendation,
  };
}

export function ChatbotWidget({ embedded = false }: { embedded?: boolean } = {}) {
  const auth = useDemoAuth();
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const panelId = useId();
  const [open, setOpen] = useState(embedded);
  const [pointerOpen, setPointerOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState('');
  const [avatarState, setAvatarState] = useState<NexiState>('idle');
  const [paused, setPaused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [confirmation, setConfirmation] = useState<AssistantRecommendation | null>(null);
  const sessionRef = useRef(`NEXI-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const sendingRef = useRef(false);
  const avatarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const allowMotion = reducedMotion === false && !paused;
  const close = useCallback(() => {
    if (embedded) return;
    setOpen(false);
    window.requestAnimationFrame(() => {
      const opener = openerRef.current;
      if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
      else launcherRef.current?.focus({ preventScroll: true });
    });
  }, [embedded]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReducedMotion(media.matches);
    syncMotionPreference();
    media.addEventListener('change', syncMotionPreference);
    return () => media.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    setMessages([
      newMessage(
        'assistant',
        `¡Hola! Soy ${brand.assistantName}, ${brand.assistantSubtitle.toLowerCase()} 🐾 Cuéntame qué hace tu negocio y qué te gustaría mejorar. Te acompaño con palabras simples.`,
      ),
    ]);
    const openChat = (event: Event) => {
      const opener: unknown = event instanceof CustomEvent ? event.detail : null;
      if (opener instanceof HTMLElement) {
        openerRef.current = opener;
        setPointerOpen(!opener.matches(':focus-visible'));
      } else {
        if (document.activeElement instanceof HTMLElement) openerRef.current = document.activeElement;
        setPointerOpen(false);
      }
      setOpen(true);
    };
    window.addEventListener('open-tuknex-chat', openChat);
    const media = window.matchMedia('(max-width: 600px)');
    const syncMobile = () => setMobile(media.matches);
    syncMobile();
    media.addEventListener('change', syncMobile);
    return () => {
      window.removeEventListener('open-tuknex-chat', openChat);
      media.removeEventListener('change', syncMobile);
      if (avatarTimeoutRef.current) clearTimeout(avatarTimeoutRef.current);
    };
  }, []);
  useEffect(() => {
    if (!open || embedded) return;
    const compact = window.matchMedia('(max-width: 600px)').matches;
    (compact ? closeRef.current : inputRef.current)?.focus({ preventScroll: true });
  }, [open, embedded]);

  useEffect(() => {
    const panel = panelRef.current;
    const viewport = window.visualViewport;
    if (!open || embedded || !mobile || !panel || !viewport) return;
    const syncViewport = () => {
      panel.style.setProperty('--nexi-viewport-top', `${viewport.offsetTop}px`);
      panel.style.setProperty('--nexi-viewport-height', `${viewport.height}px`);
      panel.toggleAttribute('data-compact-viewport', viewport.height < 460);
    };
    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
      panel.style.removeProperty('--nexi-viewport-top');
      panel.style.removeProperty('--nexi-viewport-height');
      panel.removeAttribute('data-compact-viewport');
    };
  }, [open, embedded, mobile]);
  useEffect(() => {
    const log = scrollRef.current;
    if (!log) return;
    log.scrollTo({ top: messages.length <= 1 ? 0 : log.scrollHeight, behavior: 'instant' });
  }, [messages, typing, open, confirmation]);
  useEffect(() => {
    if (!open || embedded) return;
    const previousOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    const keyboard = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      const active = document.activeElement;
      if (event.defaultPrevented || !panel) return;
      if (event.key === 'Escape' && (mobile || panel.contains(active) || active === launcherRef.current)) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !mobile) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled])',
      )).filter((item) => item.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!panel.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      if (mobile) document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keyboard);
    };
  }, [open, mobile, embedded, close]);

  function persist(next: AssistantMessage[]) {
    try {
      platformRepository.saveConversation(
        {
          id: sessionRef.current,
          name: 'Visitante demo',
          topic:
            next.find((item) => item.role === 'user')?.content ?? `Orientación con ${brand.assistantName}`,
          messages: next.map(({ role, content }) => ({ role, content })),
        },
        auth.user?.id,
      );
      window.dispatchEvent(new Event('tuknex-data'));
    } catch {
      setStatus('El historial no pudo añadirse a la memoria de esta sesión. Puedes seguir conversando.');
    }
  }
  async function send(text: string) {
    const content = text.trim().slice(0, 1200);
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    const next = [...messages, newMessage('user', content)];
    setMessages(next);
    setInput('');
    setTyping(true);
    setAvatarState('thinking');
    setStatus('');
    setConfirmation(null);
    persist(next);
    if (avatarTimeoutRef.current) clearTimeout(avatarTimeoutRef.current);
    try {
      const reply = await guidedAssistantProvider.respond({
        message: content,
        history: next,
        prices: { ...DEFAULT_PRICES, ...readPriceOverrides() },
      });
      const completed = [...next, newMessage('assistant', reply.content, reply.recommendation)];
      setMessages(completed);
      persist(completed);
      setAvatarState(reply.recommendation ? 'celebrate' : 'idle');
      if (reply.recommendation) avatarTimeoutRef.current = setTimeout(() => setAvatarState('idle'), 1400);
    } catch {
      setMessages([
        ...next,
        newMessage(
          'assistant',
          'Mi guía local no pudo responder esta vez. Puedes volver a intentar o preparar una consulta por WhatsApp.',
        ),
      ]);
      setAvatarState('idle');
    } finally {
      sendingRef.current = false;
      setTyping(false);
    }
  }
  async function shareWhatsApp() {
    const lastUser = [...messages].reverse().find((item) => item.role === 'user')?.content;
    const message = `Hola TUKNEX. Conversé con ${brand.assistantName} y quisiera asesoría.${lastUser ? ` Mi consulta: ${lastUser}` : ' Quiero encontrar una solución web para mi negocio.'}`;
    const url = getWhatsAppUrl(message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setStatus(
        'Mensaje copiado. El WhatsApp comercial no está configurado; compártelo con tu contacto de TUKNEX.',
      );
    } catch {
      setStatus(
        'No se pudo copiar el mensaje. Puedes escribir a tu contacto de TUKNEX para solicitar asesoría.',
      );
    }
  }
  function confirmRecommendation(recommendation: AssistantRecommendation) {
    const search = recommendationUrl(recommendation).split('?')[1] ?? '';
    window.dispatchEvent(new CustomEvent('tuknex-quote-prefill', { detail: search }));
    close();
  }

  return (
    <div
      className={`chat-widget chat-editorial ${embedded ? 'chat-embedded' : ''}`}
      data-motion-enabled={allowMotion ? '' : undefined}
    >
      {open && mobile && !embedded && (
        <button
          type="button"
          className="chat-mobile-backdrop"
          onClick={close}
          aria-label="Cerrar chat"
          tabIndex={-1}
        />
      )}
        {(open || embedded) && (
          <section
            ref={panelRef}
            id={panelId}
            className="chat-panel"
            role={embedded ? 'region' : 'dialog'}
            aria-modal={!embedded && mobile ? true : undefined}
            aria-label={`Conversación con ${brand.assistantName}`}
            data-pointer-open={pointerOpen && allowMotion && !embedded ? '' : undefined}
          >
            <div className="nexi-chat-header">
              <div className="nexi-chat-avatar">
                <NexiAvatar
                  compact
                  className="nexi-header-dog"
                  state={avatarState}
                  paused={!allowMotion}
                  interactive={allowMotion}
                />
              </div>
              <div>
                <strong>{brand.assistantName}</strong>
                <span>{brand.assistantSubtitle}</span>
              </div>
              <div className="nexi-chat-controls">
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  disabled={reducedMotion !== false}
                  aria-pressed={!allowMotion}
                  aria-label={
                    paused
                      ? `Activar animaciones de ${brand.assistantName}`
                      : `Pausar animaciones de ${brand.assistantName}`
                  }
                  title={paused ? 'Activar animaciones' : 'Pausar animaciones'}
                >
                  {paused ? <Play size={15} /> : <Pause size={15} />}
                </button>
                {!embedded && (
                  <button ref={closeRef} type="button" onClick={close} aria-label="Cerrar conversación">
                    <X size={19} />
                  </button>
                )}
              </div>
            </div>
            <div className="chat-demo-label">
              <ShieldCheck size={15} aria-hidden="true" /> Guía local por reglas
            </div>
            <div
              className="chat-messages"
              ref={scrollRef}
              role="log"
              tabIndex={-1}
              aria-label="Mensajes de la conversación"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message) => (
                <div key={message.id} className={`chat-message ${message.role}`}>
                  {message.role === 'assistant' && <span className="chat-mini-avatar" aria-hidden="true">🐾</span>}
                  <div>
                    <p>{message.content}</p>
                    {message.recommendation && (
                      <div className="nexi-recommendation">
                        <span>
                          <Sparkles size={12} /> PUNTO DE PARTIDA
                        </span>
                        <strong>
                          {
                            PROJECT_TYPES.find((item) => item.id === message.recommendation?.projectType)
                              ?.name
                          }
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmation(message.recommendation!);
                            setAvatarState('listening');
                          }}
                        >
                          Usar esta recomendación <ArrowRight size={13} />
                        </button>
                        <small>Puedes revisarla antes de continuar.</small>
                      </div>
                    )}
                    <small>{message.role === 'assistant' ? brand.assistantName : 'Tú'}</small>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="chat-message assistant">
                  <span className="chat-mini-avatar" aria-hidden="true">🐾</span>
                  <div><p>{brand.assistantName} prepara una respuesta.</p></div>
                </div>
              )}
              {messages.length < 3 && (
                <div className="chat-prompts">
                  {quickPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => {
                      scrollRef.current?.focus({ preventScroll: true });
                      void send(prompt);
                    }} disabled={typing}>
                      {prompt}
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              )}
              {confirmation && (
                <div className="nexi-confirmation">
                  <strong>
                    ¿Empezamos con {PROJECT_TYPES.find((item) => item.id === confirmation.projectType)?.name}?
                  </strong>
                  <p>
                    Se transferirán la categoría y las funciones sugeridas. Podrás cambiarlas. No se
                    transferirá tu texto ni información personal.
                  </p>
                  <div>
                    <Link
                      href={recommendationUrl(confirmation)}
                      onClick={() => confirmRecommendation(confirmation)}
                    >
                      <Check size={14} /> Sí, empezar cotización
                    </Link>
                    <button type="button" onClick={() => setConfirmation(null)}>
                      Seguir conversando
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="chat-ctas">
              <Link href="/cotizar" onClick={close}>
                Ver el cotizador <ArrowRight size={14} />
              </Link>
              <button type="button" onClick={shareWhatsApp}>
                <MessageCircle size={14} /> Hablar por WhatsApp
              </button>
            </div>
            {status && (
              <p className="chat-status" role="status">
                {status}
              </p>
            )}
            <form
              className="chat-input-form"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <input
                ref={inputRef}
                aria-label={`Cuéntale tu idea a ${brand.assistantName}`}
                value={input}
                onFocus={() => {
                  if (!typing) setAvatarState('listening');
                }}
                onBlur={() => {
                  if (!typing) setAvatarState('idle');
                }}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1200}
                placeholder="Cuéntame qué hace tu negocio…"
              />
              <button
                type="submit"
                aria-label={`Enviar consulta a ${brand.assistantName}`}
                disabled={!input.trim() || typing}
              >
                <Send size={18} />
              </button>
            </form>
            <p className="chat-privacy">
              Historial sólo en memoria. Al recargar se pierde. Evita compartir datos sensibles.
            </p>
          </section>
        )}
      {!embedded && (
        <button
          ref={launcherRef}
          type="button"
          className={`chat-launcher ${open ? 'is-open' : ''}`}
          onClick={(event) => {
            if (open) close();
            else {
              openerRef.current = event.currentTarget;
              setPointerOpen(event.detail > 0 && !event.currentTarget.matches(':focus-visible'));
              setOpen(true);
            }
          }}
          aria-label={
            open
              ? `Minimizar ${brand.assistantName}`
              : `${brand.assistantSubtitle}. Habla con ${brand.assistantName}`
          }
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
        >
          <span className="chat-launcher-icon">
            {open ? (
              <X size={22} />
            ) : (
              <img
                className="nexi-launcher-dog"
                src="/images/nexi-fallback.svg"
                width="55"
                height="58"
                alt=""
              />
            )}
          </span>
          {!open && (
            <span>
              {brand.assistantSubtitle}
              <strong>
                Habla con {brand.assistantName} <Sparkles size={12} />
              </strong>
            </span>
          )}
          {!open && <i />}
        </button>
      )}
    </div>
  );
}
