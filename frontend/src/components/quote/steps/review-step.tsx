'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import type { QuoteFormValues } from '@/lib/quote/form';
import { QuotePreviewFeedback } from '../preview-feedback';
import { QuoteSummary } from './summary';
import { QuoteCheckboxField, QuoteDetails, QuoteTextField } from './shared';

export function QuoteReviewStep({ onEdit }: { onEdit: (step: number) => void }) {
  const { control } = useFormContext<QuoteFormValues>();
  const [projectType, goal, businessName, offering, features, design, materials, timeline, maintenance] =
    useWatch({
      control,
      name: [
        'projectType',
        'goal',
        'businessName',
        'offering',
        'features',
        'design',
        'materials',
        'timeline',
        'maintenance',
      ],
      exact: true,
    });
  return (
    <>
      <QuoteSummary
        values={{
          projectType,
          goal,
          businessName,
          offering,
          features,
          design,
          materials,
          timeline,
          maintenance,
        }}
        onEdit={onEdit}
      />
      <QuotePreviewFeedback />
      <QuoteDetails title="Quiero añadir mis datos de contacto (opcional)">
        <QuoteTextField name="name" label="Tu nombre" placeholder="Puedes mantenerlo anónimo." />
        <QuoteTextField
          name="email"
          label="Correo electrónico"
          type="email"
          placeholder="tucorreo@ejemplo.com"
        />
        <QuoteTextField name="phone" label="WhatsApp" type="tel" placeholder="+51 …" />
        <QuoteCheckboxField name="marketingConsent">
          Opcional: deseo recibir contacto comercial sobre este proyecto.
        </QuoteCheckboxField>
      </QuoteDetails>
      <div className="quote-demo-note">
        <ShieldCheck size={22} />
        <span>
          Para calcular o descargar tu propuesta, tus respuestas se procesan en el servicio de cotización. Puedes consultar el cálculo sin guardarlo. Al pulsar Guardar cotización, podrás iniciar sesión o crear tu cuenta y la propuesta quedará disponible para ti y TUKNEX. El borrador local sólo contiene opciones anónimas.
        </span>
      </div>
      <QuoteCheckboxField name="privacyAcknowledged">
        Entiendo que, al guardar la cotización, mis respuestas se asociarán a mi cuenta para gestionar la solicitud.
      </QuoteCheckboxField>
    </>
  );
}
