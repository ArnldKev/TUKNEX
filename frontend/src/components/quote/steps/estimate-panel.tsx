'use client';
import { memo, useMemo } from 'react';
import { estimateQuote, money } from '@/lib/pricing';
import { projectPricingInput } from '@/lib/quote/project';
import { useQuoteProjectSession } from '../project-session';

export const QuoteEstimatePanel = memo(function QuoteEstimatePanel({prices}:{prices:Record<string,number>}) {
  const { history } = useQuoteProjectSession();
  const estimate = useMemo(() => estimateQuote(projectPricingInput(history.present), prices), [history.present, prices]);
  return <section className="quote-live-price" aria-label="Referencia de inversión actual">
    <span>Inversión orientativa</span>
    <strong>{estimate.custom?'Evaluación personalizada':`${money(estimate.min)} – ${money(estimate.max)}`}</strong>
    <small>{estimate.custom?'Necesitamos revisar el alcance para darte un precio responsable.':'Se confirma al revisar los requisitos. Sin compromiso.'}</small>
    <p>Dominio, alojamiento, licencias y mantenimiento se confirman aparte.</p>
  </section>;
});
