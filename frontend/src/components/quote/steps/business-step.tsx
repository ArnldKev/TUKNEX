'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField } from './shared';
import { sectorLabels } from '@/lib/quote/presentation';
import type { QuoteFormValues } from '@/lib/quote/form';

export function QuoteBusinessStep() {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const channels = useWatch({ control, name: 'salesChannels', exact: true });
  return (
    <div className="quote-fields">
      <QuoteTextField name="businessName" label="Nombre del negocio o proyecto (opcional)" placeholder="Puedes usar un nombre temporal" />
      <QuoteTextField
        name="offering"
        label="¿Qué vendes u ofreces?"
        placeholder="Ej. Menú de restaurante y pedidos para recojo"
      />
      <QuoteSelectField name="sector" label="¿En qué rubro trabajas?">
        <option value="">Selecciona una opción</option>
        {Object.entries(sectorLabels).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </QuoteSelectField>
      <QuoteTextField
        name="problem"
        label="¿Qué te gustaría hacer más fácil?"
        placeholder="Ej. Evitar repetir los precios y el menú por chat."
        multiline
      />
      <QuoteDetails title="Más sobre tu idea (opcional)">

        <QuoteTextField name="city" label="Ciudad o zona de atención" placeholder="Ej. Oxapampa" />
        <QuoteTextField
          name="customers"
          label="¿A quiénes atiendes?"
          placeholder="Vecinos, turistas, empresas…"
        />
        <fieldset className="quote-check-group">
          <legend>¿Cómo te contactan hoy?</legend>
          {[
            { id: 'whatsapp' as const, label: 'WhatsApp' },
            { id: 'phone' as const, label: 'Llamadas' },
            { id: 'social' as const, label: 'Redes sociales' },
            { id: 'physical' as const, label: 'Local físico' },
            { id: 'website' as const, label: 'Mi web' },
            { id: 'other' as const, label: 'Otro' },
          ].map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={channels.includes(item.id)}
                onChange={() =>
                  setValue(
                    'salesChannels',
                    channels.includes(item.id)
                      ? channels.filter((id) => id !== item.id)
                      : [...channels, item.id],
                    { shouldDirty: true },
                  )
                }
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        <QuoteTextField
          name="salesProcess"
          label="Contexto de tu idea o cómo trabajas"
          placeholder="Ej. Hoy anoto los pedidos en un cuaderno y quiero reunirlos en un solo lugar."
          multiline
        />
        <QuoteTextField
          name="website"
          label="Web o red social actual"
          placeholder="Enlace o nombre de tu página"
        />
      </QuoteDetails>
      <QuoteStepHelp>
        No necesitas explicarlo con términos técnicos. Basta con contar qué haces y qué quieres mejorar.
      </QuoteStepHelp>
    </div>
  );
}
