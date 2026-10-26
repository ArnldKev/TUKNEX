'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Clock3, Check } from 'lucide-react';
import { budgetLabels } from '@/lib/quote/presentation';
import type { QuoteFormValues } from '@/lib/quote/form';
import { QuoteCheckboxField, QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField, type QuoteStepProps } from './shared';

export function QuoteTimingStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [timeline, domain] = useWatch({ control, name: ['timeline', 'domain'], exact: true });
  return <>
    <div className="quote-timing-options" role="group" aria-label="¿Cuándo te gustaría tenerlo?">
      {[
        { id: 'flexible' as const, title: 'No estoy seguro todavía', detail: 'Puedo planificarlo con calma, sin prioridad urgente.' },
        { id: 'standard' as const, title: 'En las próximas semanas', detail: 'Quiero empezar pronto y acordar un plazo.' },
        { id: 'urgent' as const, title: 'Tengo una fecha cercana', detail: `Revisaremos disponibilidad. Prioridad +${prices['urgent-percent']}% referencial.` },
      ].map(item => <button type="button" key={item.id} aria-pressed={timeline === item.id}
        className={`quote-timing-option ${timeline === item.id ? 'selected' : ''}`}
        onClick={() => setValue('timeline', item.id, { shouldDirty: true })}>
        <Clock3 size={24} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.detail}</small></span>
        <span className="quote-radio" aria-hidden="true">{timeline === item.id && <Check size={15} />}</span>
      </button>)}
    </div>
    <div className="quote-fields">
      <QuoteSelectField name="budget" label="¿Qué presupuesto tienes en mente? (opcional)" help="Nos ayuda a priorizar. No determina el precio calculado.">
        {Object.entries(budgetLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </QuoteSelectField>
      <QuoteTextField name="launchDate" label="Fecha ideal (opcional)" type="date" />
      <QuoteCheckboxField name="hardDeadline">Necesito que esté listo para esa fecha.</QuoteCheckboxField>
      <QuoteTextField name="deadlineReason" label="¿Hay algo que debamos saber sobre esa fecha? (opcional)" placeholder="Ej. La inauguración de mi local. La fecha todavía puede cambiar." multiline />
    </div>
    <QuoteDetails title="Dominio, publicación y ayuda (opcional)">
      <QuoteSelectField name="domain" label="¿Ya tienes una dirección web?" help="Es la dirección de tu página, como tunegocio.pe.">
        <option value="unsure">No estoy seguro / quiero orientación</option><option value="yes">Sí, ya tengo dominio</option><option value="no">Todavía no</option>
      </QuoteSelectField>
      {domain === 'yes' && <QuoteTextField name="existingDomain" label="Tu dominio actual" placeholder="tunegocio.pe" />}
      <QuoteSelectField name="hosting" label="¿Ya tienes dónde alojar tu web?" help="El alojamiento es el espacio donde se guarda tu página.">
        <option value="unsure">No estoy seguro / quiero orientación</option><option value="yes">Sí, ya tengo alojamiento</option><option value="no">Todavía no</option>
      </QuoteSelectField>
      <QuoteSelectField name="management" label="¿Quién actualizará el contenido?">
        <option value="unsure">Quiero que me orienten</option><option value="self">Quiero administrarlo</option><option value="tuknex">Prefiero solicitar los cambios a TUKNEX</option>
      </QuoteSelectField>
      <QuoteCheckboxField name="training">Me gustaría aprender a usarlo.</QuoteCheckboxField>
      <QuoteCheckboxField name="maintenance">Quiero evaluar mantenimiento mensual.</QuoteCheckboxField>
      <QuoteCheckboxField name="corporateEmail">Necesito correo con el nombre de mi negocio.</QuoteCheckboxField>
      <QuoteTextField name="approver" label="¿Quién aprueba el proyecto? (opcional)" placeholder="Puedes indicar solo un cargo o rol." />
    </QuoteDetails>
    <QuoteStepHelp>Dominio, alojamiento y mantenimiento se cotizan por separado. El plazo se acuerda cuando definamos el alcance y los materiales.</QuoteStepHelp>
  </>;
}
