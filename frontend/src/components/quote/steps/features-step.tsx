'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { FEATURES, SYSTEM_MODULES, money } from '@/lib/pricing';
import { featuresByProject, type QuoteFormValues } from '@/lib/quote/form';
import { QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField, type QuoteStepProps } from './shared';

export function QuoteFeaturesStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [projectType, features] = useWatch({ control, name: ['projectType', 'features'], exact: true });
  const isSystem = projectType === 'system';
  const allowed = FEATURES.filter((item) => featuresByProject[projectType].includes(item.id));
  const primaryIds = isSystem
    ? [...SYSTEM_MODULES]
    : projectType === 'store'
      ? ['catalog', 'cart', 'payments']
      : projectType === 'business' || projectType === 'redesign'
        ? ['information', 'whatsapp', 'contact', 'gallery']
        : featuresByProject[projectType].filter((id) => id !== 'variations' && id !== 'search');
  const primary = allowed.filter((item) => (primaryIds as readonly string[]).includes(item.id));
  const advanced = allowed.filter((item) => !(primaryIds as readonly string[]).includes(item.id));
  function featureButton(item: (typeof FEATURES)[number]) {
    const included =
      item.price === 0 ||
      (item.id === 'catalog' && projectType === 'catalog') ||
      (isSystem && (['login', 'admin', ...SYSTEM_MODULES] as readonly string[]).includes(item.id));
    const price =
      item.price === null
        ? 'Revisión de alcance'
        : included
          ? isSystem
            ? 'Dentro del alcance básico*'
            : 'Incluido'
          : `+ ${money(prices[item.id === 'catalog' ? 'feature-catalog' : item.id] ?? item.price)}`;
    return (
      <button
        type="button"
        key={item.id}
        className={`quote-feature ${features.includes(item.id) ? 'selected' : ''}`}
        onClick={() =>
          setValue(
            'features',
            features.includes(item.id) ? features.filter((id) => id !== item.id) : [...features, item.id],
            { shouldDirty: true },
          )
        }
        aria-pressed={features.includes(item.id)}
      >
        <span className="quote-checkbox">{features.includes(item.id) && <Check size={17} />}</span>
        <span>
          <strong>{item.name}</strong>
          <small>{item.detail}</small>
          <em>{price}</em>
        </span>
      </button>
    );
  }
  return (
    <>
      <div
        className="quote-features-grid"
        role="group"
        aria-label={isSystem ? 'Módulos de tu sistema' : 'Funciones de tu solución'}
      >
        {primary.map(featureButton)}
      </div>
      {isSystem && (
        <p className="quote-scope-note">
          * El rango de {money(prices.system)}–{money(prices['limit-system'])} contempla sólo uno o dos
          módulos sencillos. Tres o más, roles avanzados e integraciones necesitan evaluación.
        </p>
      )}
      <QuoteDetails
        title={isSystem ? 'Usuarios y funciones adicionales' : 'Más opciones y detalles (opcional)'}
      >
        {advanced.length > 0 && <div className="quote-features-grid">{advanced.map(featureButton)}</div>}
        {['catalog', 'store'].includes(projectType) && (
          <QuoteSelectField name="productsRange" label="¿Cuántos productos o servicios mostrarás?">
            <option value="1-20">Hasta 20</option>
            <option value="21-100">Entre 21 y 100</option>
            <option value="100+">Más de 100</option>
            <option value="none">Todavía no lo sé</option>
          </QuoteSelectField>
        )}
        {isSystem && (
          <QuoteSelectField name="userRange" label="¿Cuántas personas lo usarían?">
            <option value="1-2">Una o dos personas</option>
            <option value="3-5">Entre tres y cinco</option>
            <option value="6+">Seis o más / varios roles</option>
          </QuoteSelectField>
        )}
        <QuoteTextField
          name="otherFunctions"
          label="¿Hay algo más que deba hacer?"
          placeholder="Cuéntalo con tus palabras. Lo revisaremos antes de fijar un precio."
          multiline
        />
      </QuoteDetails>
      <QuoteStepHelp>
        {isSystem
          ? 'Un módulo es una tarea principal, como registrar clientes o controlar inventario. Empecemos con lo esencial.'
          : projectType === 'store'
            ? 'Una tienda con cobros requiere conversar sobre productos, pedidos, pagos y entregas. No le asignamos el precio de una web sencilla.'
            : 'No hace falta marcarlo todo. Puedes empezar con pocas funciones y ampliar después.'}
      </QuoteStepHelp>
    </>
  );
}
