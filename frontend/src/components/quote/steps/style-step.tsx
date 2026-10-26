'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { money } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';
import { QuoteVisualEditor } from '../visual-editor';
import { QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField, type QuoteStepProps } from './shared';

const styles = [
  { id: 'modern' as const, name: 'Moderno', detail: 'Claro, actual y con personalidad.' },
  { id: 'elegant' as const, name: 'Elegante', detail: 'Sobrio y cuidado.' },
  { id: 'minimal' as const, name: 'Sencillo', detail: 'Lo esencial, fácil de recorrer.' },
  { id: 'bold' as const, name: 'Llamativo', detail: 'Color y energía para destacar.' },
  { id: 'corporate' as const, name: 'Profesional', detail: 'Orden y confianza para tu negocio.' },
  { id: 'unsure' as const, name: 'No estoy seguro', detail: 'Quiero orientación para elegir.' },
];
const palettes = [
  { id: 'turquesa', name: 'Turquesa', color: '#00b9ae' },
  { id: 'azul', name: 'Azul', color: '#176ac6' },
  { id: 'verde', name: 'Verde', color: '#2c8868' },
  { id: 'cálido', name: 'Cálido', color: '#bf763f' },
];
export function QuoteStyleStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [style, colors, materials] = useWatch({ control, name: ['stylePreference', 'colorsLiked', 'materials'], exact: true });
  return <>
    <div className="quote-style-grid" role="group" aria-label="¿Cómo te gustaría que se vea?">
      {styles.map(item => <button type="button" key={item.id}
        className={`quote-style-option style-${item.id} ${style === item.id ? 'selected' : ''}`}
        aria-pressed={style === item.id} onClick={() => setValue('stylePreference', item.id, { shouldDirty: true })}>
        <span className="quote-style-sample" aria-hidden="true"><i /><i /><i /></span>
        <strong>{item.name}</strong><small>{item.detail}</small>
        {style === item.id && <Check size={18} aria-hidden="true" />}
      </button>)}
    </div>
    <fieldset className="quote-palette-group">
      <legend>¿Qué colores te gustan? (opcional)</legend>
      {palettes.map(palette => <button type="button" key={palette.id} aria-pressed={colors === palette.id}
        className={colors === palette.id ? 'selected' : ''} onClick={() => setValue('colorsLiked', palette.id, { shouldDirty: true })}>
        <i style={{ background: palette.color }} aria-hidden="true" />{palette.name}
        {colors === palette.id && <Check size={16} aria-hidden="true" />}
      </button>)}
      <button type="button" aria-pressed={!colors} className={!colors ? 'selected' : ''}
        onClick={() => setValue('colorsLiked', '', { shouldDirty: true })}>No estoy seguro</button>
    </fieldset>
    <QuoteTextField name="colorsLiked" label="Otro color o combinación (opcional)" placeholder="Ej. Azul y blanco, como mi logo." />
    <QuoteTextField name="references" label="¿Hay alguna web o estilo que te guste? (opcional)" placeholder="Comparte un enlace o cuéntanos qué te gusta." multiline />
    <QuoteDetails title="Mi marca, contenido y personalización (opcional)">
      <QuoteSelectField name="design" label="¿Cuánto quieres personalizar el diseño?">
        <option value="essential">Esencial: adaptado a mi marca · incluido</option>
        <option value="custom">A medida · + {money(prices['design-custom'])}</option>
        <option value="premium">Más elaborado · + {money(prices['design-premium'])}</option>
      </QuoteSelectField>
      <fieldset className="quote-check-group"><legend>¿Qué material ya tienes?</legend>
        {[
          { id: 'logo' as const, label: 'Logo' }, { id: 'colors' as const, label: 'Colores de marca' },
          { id: 'photos' as const, label: 'Fotos propias' }, { id: 'texts' as const, label: 'Textos' },
          { id: 'prices' as const, label: 'Productos y precios' }, { id: 'help' as const, label: 'Necesito ayuda' },
        ].map(item => <label key={item.id}><input type="checkbox" checked={materials.includes(item.id)}
          onChange={() => setValue('materials', materials.includes(item.id) ? materials.filter(id => id !== item.id) : [...materials, item.id], { shouldDirty: true })} />{item.label}</label>)}
      </fieldset>
      <QuoteTextField name="firstImpression" label="¿Qué mensaje debería verse primero? (opcional)" placeholder="Ej. Comida casera, cerca de ti." />
      <QuoteTextField name="colorsDisliked" label="Colores que quieres evitar (opcional)" />
      <QuoteTextField name="competitor" label="Marca o competencia de referencia (opcional)" />
    </QuoteDetails>
    <QuoteVisualEditor />
    <QuoteStepHelp>El estilo y el color ayudan a imaginar tu web. El nivel de personalización puede cambiar la estimación.</QuoteStepHelp>
  </>;
}
