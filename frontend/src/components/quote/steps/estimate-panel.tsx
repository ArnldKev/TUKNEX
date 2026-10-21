'use client';

import { memo, useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { estimateQuote, money, type QuoteInput } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';

export const QuoteEstimatePanel = memo(function QuoteEstimatePanel({
  control,
  prices,
}: {
  control: Control<QuoteFormValues>;
  prices: Record<string, number>;
}) {
  const [projectType, features, design, timeline, productsRange, userRange, otherFunctions] = useWatch({
    control,
    name: ['projectType', 'features', 'design', 'timeline', 'productsRange', 'userRange', 'otherFunctions'],
    exact: true,
  });
  const input = useMemo<QuoteInput>(
    () => ({ projectType, features, design, timeline, productsRange, userRange, otherFunctions }),
    [projectType, features, design, timeline, productsRange, userRange, otherFunctions],
  );
  const estimate = useMemo(() => estimateQuote(input, prices), [input, prices]);
  return (
    <section className="quote-live-price" aria-label="Referencia de inversión actual">
      <span>Inversión orientativa</span>
      <strong>
        {estimate.custom ? 'Evaluación personalizada' : `${money(estimate.min)} – ${money(estimate.max)}`}
      </strong>
      <small>
        {estimate.custom
          ? 'Necesitamos revisar el alcance para darte un precio responsable.'
          : 'Se confirma al revisar los requisitos. Sin compromiso.'}
      </small>
      <p>Dominio, alojamiento, licencias y mantenimiento se confirman aparte.</p>
    </section>
  );
});
