'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Clock3, Check } from 'lucide-react';
import { budgetLabels } from '@/lib/quote/presentation';
import type { QuoteFormValues } from '@/lib/quote/form';
import {
  QuoteCheckboxField,
  QuoteDetails,
  QuoteSelectField,
  QuoteStepHelp,
  QuoteTextField,
  type QuoteStepProps,
} from './shared';

export function QuoteTimingStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [timeline, hardDeadline, domain] = useWatch({
    control,
    name: ['timeline', 'hardDeadline', 'domain'],
    exact: true,
  });
  return (
    <>
      <div className="quote-timing-options" role="group" aria-label="Prioridad del proyecto">
        {[
          {
            id: 'flexible' as const,
            title: 'Puedo planificar con calma',
            detail: 'Sin una fecha definida. Priorizamos lo esencial.',
          },
          {
            id: 'standard' as const,
            title: 'Quiero empezar pronto',
            detail: 'En las próximas semanas, con un cronograma acordado.',
          },
          {
            id: 'urgent' as const,
            title: 'Tengo una fecha cercana',
            detail: `Revisamos disponibilidad. Prioridad +${prices['urgent-percent']}% referencial.`,
          },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={timeline === item.id}
            className={`quote-timing-option ${timeline === item.id ? 'selected' : ''}`}
            onClick={() => setValue('timeline', item.id, { shouldDirty: true })}
          >
            <Clock3 size={24} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <span className="quote-radio">{timeline === item.id && <Check size={15} />}</span>
          </button>
        ))}
      </div>
      <QuoteDetails title="Presupuesto y fecha ideal (opcional)">
        <QuoteSelectField
          name="budget"
          label="¿Qué presupuesto tienes en mente?"
          help="Sirve para priorizar. No determina automáticamente el precio."
        >
          {Object.entries(budgetLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </QuoteSelectField>
        <QuoteTextField name="launchDate" label="Fecha ideal de lanzamiento" type="date" />
        <QuoteCheckboxField name="hardDeadline">Tengo una fecha límite real.</QuoteCheckboxField>
        {hardDeadline && (
          <QuoteTextField
            name="deadlineReason"
            label="¿Cuál es la fecha y el motivo?"
            placeholder="Ej. La inauguración de mi local."
          />
        )}
        <QuoteTextField
          name="approver"
          label="¿Quién aprueba el proyecto?"
          placeholder="Puedes indicar sólo un cargo o rol."
        />
      </QuoteDetails>
      <QuoteDetails title="Publicación y acompañamiento (opcional)">
        <QuoteSelectField
          name="domain"
          label="¿Ya tienes una dirección web?"
          help="El dominio es tu dirección, como tunegocio.pe."
        >
          <option value="unsure">No sé / quiero orientación</option>
          <option value="yes">Sí, ya tengo dominio</option>
          <option value="no">Todavía no</option>
        </QuoteSelectField>
        {domain === 'yes' && (
          <QuoteTextField name="existingDomain" label="Tu dominio actual" placeholder="tunegocio.pe" />
        )}
        <QuoteSelectField
          name="hosting"
          label="¿Ya tienes alojamiento para tu página?"
          help="El hosting es el espacio donde vive tu web."
        >
          <option value="unsure">No sé / quiero orientación</option>
          <option value="yes">Sí, ya tengo hosting</option>
          <option value="no">Todavía no</option>
        </QuoteSelectField>
        <QuoteSelectField name="management" label="¿Quién gestionará el contenido?">
          <option value="unsure">Quiero que me orienten</option>
          <option value="self">Quiero administrarlo</option>
          <option value="tuknex">Prefiero solicitar los cambios a TUKNEX</option>
        </QuoteSelectField>
        <QuoteCheckboxField name="training">Me gustaría recibir capacitación.</QuoteCheckboxField>
        <QuoteCheckboxField name="maintenance">Quiero evaluar mantenimiento mensual.</QuoteCheckboxField>
        <QuoteCheckboxField name="corporateEmail">Necesito correo corporativo.</QuoteCheckboxField>
      </QuoteDetails>
      <QuoteStepHelp>
        Dominio, alojamiento, licencias y mantenimiento se confirman por separado. El plazo comienza con el
        alcance aprobado y los materiales entregados.
      </QuoteStepHelp>
    </>
  );
}
