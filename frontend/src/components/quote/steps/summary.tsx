'use client';

import { FileText } from 'lucide-react';
import { FEATURES, PROJECT_TYPES } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';
import type { QuoteResult } from '@/lib/quote/contracts';
import { goalLabels } from '@/lib/quote/presentation';

export type QuoteSummaryValues = Pick<
  QuoteFormValues,
  | 'projectType'
  | 'goal'
  | 'businessName'
  | 'offering'
  | 'features'
  | 'design'
  | 'materials'
  | 'timeline'
  | 'maintenance'
>;
export function QuoteSummary({
  values,
  result,
  onEdit,
}: {
  values: QuoteSummaryValues;
  result?: QuoteResult;
  onEdit?: (step: number) => void;
}) {
  const rows = [
    { label: 'Solución', value: PROJECT_TYPES.find((item) => item.id === values.projectType)!.name, step: 0 },
    { label: 'Objetivo', value: goalLabels[values.goal], step: 0 },
    { label: 'Negocio', value: values.businessName || values.offering || 'Sin nombre indicado', step: 1 },
    {
      label: 'Funciones',
      value:
        FEATURES.filter((item) => values.features.includes(item.id))
          .map((item) => item.name)
          .join(', ') || 'Por definir',
      step: 2,
    },
    {
      label: 'Diseño / contenido',
      value: `${values.design === 'essential' ? 'Esencial' : values.design === 'custom' ? 'A medida' : 'Premium'} · ${values.materials.length ? `${values.materials.length} materiales disponibles` : 'Contenido por preparar'}`,
      step: 3,
    },
    {
      label: 'Plazo / soporte',
      value: `${values.timeline === 'urgent' ? 'Prioritario' : values.timeline === 'flexible' ? 'Flexible' : 'Próximas semanas'}${values.maintenance ? ' · Mantenimiento por cotizar' : ''}`,
      step: 4,
    },
  ];
  return (
    <div className="quote-summary">
      <div className="quote-summary-heading">
        <FileText size={20} />
        <strong>{result ? 'Alcance de tu propuesta' : 'Revisa tus decisiones'}</strong>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="quote-summary-row">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              aria-label={`Editar ${row.label.toLowerCase()}`}
            >
              Editar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
