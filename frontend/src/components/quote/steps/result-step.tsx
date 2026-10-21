'use client';

import { DEMO_MODE } from '@/config/environment';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { money } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';
import type { QuoteResult } from '@/lib/quote/contracts';
import { QuoteSummary } from './summary';
import { QuotePdfDownload } from '../quote-pdf-download';

export function QuoteResultStep({
  values,
  result,
  busy,
  savedId,
  authenticated,
  proposal,
  onEdit,
  onRequest,
  onWhatsApp,
}: {
  values: QuoteFormValues;
  result: QuoteResult;
  busy: boolean;
  savedId: string;
  authenticated: boolean;
  proposal: string;
  onEdit: (step: number) => void;
  onRequest: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="quote-result">
      <span className="quote-result-check">
        <CheckCheck size={28} />
      </span>
      <div className="quote-result-price">
        <span>{result.label}</span>
        <strong>
          {result.custom ? 'Conversemos sobre tu proyecto' : `${money(result.min)} – ${money(result.max)}`}
        </strong>
        <small>
          {result.custom
            ? 'Necesitamos conversar para darte un precio responsable.'
            : 'Inversión orientativa · no constituye una oferta contractual'}
        </small>
      </div>
      <QuoteSummary values={values} result={result} onEdit={onEdit} />
      <div className="quote-breakdown">
        <div>
          <span>Complejidad</span>
          <strong>{result.complexity}</strong>
        </div>
        <div>
          <span>Tiempo estimado</span>
          <strong>{result.duration}</strong>
        </div>
        <div>
          <span>Vigencia de referencia</span>
          <strong>{result.validityDays} días</strong>
        </div>
        {!result.custom && (
          <>
            <div>
              <span>Solución base</span>
              <strong>{money(result.base)}</strong>
            </div>
            {result.extras.map((extra) => (
              <div key={extra.id}>
                <span>{extra.name}</span>
                <strong>+ {money(extra.amount)}</strong>
              </div>
            ))}
            {result.designAmount > 0 && (
              <div>
                <span>Diseño</span>
                <strong>+ {money(result.designAmount)}</strong>
              </div>
            )}
            {result.urgencyAmount > 0 && (
              <div>
                <span>Prioridad</span>
                <strong>+ {money(result.urgencyAmount)}</strong>
              </div>
            )}
          </>
        )}
      </div>
      {result.custom && (
        <ul className="quote-custom-reasons">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <details className="quote-detail-block" open>
        <summary>
          Qué incluye y qué se define aparte <ChevronDown size={18} />
        </summary>
        <h4>Alcance inicial</h4>
        <ul>
          {result.scope.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4>Costos separados</h4>
        <ul>
          {result.thirdPartyCosts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h4>Fuera del alcance inicial</h4>
        <ul>
          {result.exclusions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <p className="quote-disclaimer">
        {result.conditions} El plazo comienza con el alcance aprobado y la entrega de materiales. Tu
        presupuesto orienta las prioridades y no modifica el cálculo.
      </p>
      <div className="quote-demo-note">
        <ShieldCheck size={22}/><span>{savedId && !DEMO_MODE ? <><strong>Guardada en tu cuenta.</strong> TUKNEX ya puede consultar tus respuestas y tu propuesta.</> : DEMO_MODE ? 'Propuesta de demostración: no se envía a TUKNEX.' : authenticated ? 'Al preparar la propuesta se intenta guardarla en tu cuenta. Si el servicio falla, verás un aviso y podrás reintentarlo.' : 'Puedes consultar la estimación sin registrarte. Al guardar podrás iniciar sesión o crear tu cuenta aquí mismo, sin perder tus respuestas.'}</span>
      </div>
      <div className="quote-result-actions">
        <button type="button" className="quote-primary" onClick={onRequest} disabled={!!savedId || busy}>
          {busy ? 'Guardando…' : savedId ? <><Check size={18}/> {DEMO_MODE?'En la sesión demo':'Cotización guardada'}</> : <>Guardar cotización <ArrowRight size={18}/></>}
        </button>
        {savedId && !DEMO_MODE && <Link className="quote-outline" href="/mi-cuenta/cotizaciones">Ver mis cotizaciones <ArrowRight size={18}/></Link>}
        <button type="button" className="quote-outline" onClick={onWhatsApp}><MessageCircle size={18}/> Enviar a WhatsApp</button>
      </div>
      <QuotePdfDownload values={values} result={result} savedId={savedId} />
      <button type="button" className="quote-back" onClick={() => onEdit(0)}>
        <ArrowLeft size={18} /> Editar respuestas
      </button>
      {!authenticated && (
        <p className="quote-guest-link">
          ¿Quieres guardar y consultar esta propuesta?{' '}
          <button type="button" className="platform-text-link" onClick={onRequest}>Inicia sesión o crea tu cuenta <ArrowRight size={16}/></button>
          <small>
            Tus respuestas se mantienen mientras completas el acceso.
          </small>
        </p>
      )}
      <div className="quote-print-proposal">
        <pre>{proposal}</pre>
      </div>
    </div>
  );
}
