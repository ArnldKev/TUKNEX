'use client';
import { useFormContext, useWatch } from 'react-hook-form';
import type { QuoteFormValues } from '@/lib/quote/form';
import { previewFeedbackLabels } from '@/lib/quote/visual';
import { QuoteTextField } from './steps/shared';
import './visual-editor.css';

export function QuotePreviewFeedback() {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const feedback = useWatch({ control, name: 'previewFeedback' }) ?? 'unsure';
  return <section className="quote-preview-feedback" aria-label="Tu opinión del boceto">
    <h3>¿Se parece a lo que tienes en mente?</h3>
    <p>Tu opinión acompaña la cotización cuando decidas guardarla. El diseño todavía puede cambiar después de conversar con TUKNEX.</p>
    <div className="qvf-options" role="group" aria-label="Valorar el boceto">
      {Object.entries(previewFeedbackLabels).map(([value, label]) => <button type="button" key={value}
        aria-pressed={feedback === value} onClick={() => setValue('previewFeedback', value as NonNullable<QuoteFormValues['previewFeedback']>, { shouldDirty: true })}>{label}</button>)}
    </div>
    <QuoteTextField name="previewComment" label="¿Qué conservarías o cambiarías? (opcional)" multiline
      placeholder="Ej. Me gusta el color; prefiero títulos más grandes y una portada centrada." />
    {feedback === 'guidance' && <div>
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-tuknex-chat'))}>Abrir la guía de NEXI</button>
      <small>Por ahora NEXI ofrece una guía local. Este botón no envía una solicitud ni un aviso a administradores.</small>
    </div>}
  </section>;
}
