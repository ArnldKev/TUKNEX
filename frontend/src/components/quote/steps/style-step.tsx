'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { money } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';
import { QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField, type QuoteStepProps } from './shared';

const styles = [
  { id: 'modern' as const, name: 'Moderno', detail: 'Claro, actual y con personalidad.' },
  { id: 'elegant' as const, name: 'Elegante', detail: 'Sobrio, cuidado y con espacio para respirar.' },
  { id: 'minimal' as const, name: 'Minimalista', detail: 'Sólo lo esencial, fácil de recorrer.' },
  { id: 'bold' as const, name: 'Llamativo', detail: 'Color y energía para destacar.' },
];
const palettes = [
  { id: 'turquesa', name: 'Turquesa', color: '#00b9ae' },
  { id: 'azul', name: 'Azul', color: '#176ac6' },
  { id: 'verde', name: 'Verde', color: '#2c8868' },
  { id: 'cálido', name: 'Cálido', color: '#bf763f' },
];
export function QuoteStyleStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [style, colors, materials] = useWatch({
    control,
    name: ['stylePreference', 'colorsLiked', 'materials'],
    exact: true,
  });
  return (
    <>
      <div className="quote-style-grid" role="group" aria-label="Estilo visual">
        {styles.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`quote-style-option style-${item.id} ${style === item.id ? 'selected' : ''}`}
            aria-pressed={style === item.id}
            onClick={() => setValue('stylePreference', item.id, { shouldDirty: true })}
          >
            <span className="quote-style-sample" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
            {style === item.id && <Check size={18} />}
          </button>
        ))}
      </div>
      <fieldset className="quote-palette-group">
        <legend>Un color para imaginarlo</legend>
        {palettes.map((palette) => (
          <button
            type="button"
            key={palette.id}
            aria-pressed={colors === palette.id}
            className={colors === palette.id ? 'selected' : ''}
            onClick={() => setValue('colorsLiked', palette.id, { shouldDirty: true })}
          >
            <i style={{ background: palette.color }} />
            {palette.name}
            {colors === palette.id && <Check size={16} />}
          </button>
        ))}
      </fieldset>
      <p className="quote-inline-help">Abre «Personalizar mi boceto» junto a la maqueta para probar letras, tamaños, espacios y composición.</p>
      <QuoteTextField name="firstImpression" label="¿Qué mensaje debería verse primero?" placeholder="Ej. Comida casera, cerca de ti." />
      <QuoteDetails title="Mi marca, contenido y personalización (opcional)">
        <QuoteSelectField name="design" label="Nivel de personalización">
          <option value="essential">Esencial: estructura adaptada a mi marca · incluido</option>
          <option value="custom">A medida · + {money(prices['design-custom'])}</option>
          <option value="premium">Más elaborado · + {money(prices['design-premium'])}</option>
        </QuoteSelectField>
        <fieldset className="quote-check-group">
          <legend>¿Qué material ya tienes?</legend>
          {[
            { id: 'logo' as const, label: 'Logo' },
            { id: 'colors' as const, label: 'Colores de marca' },
            { id: 'photos' as const, label: 'Fotos propias' },
            { id: 'texts' as const, label: 'Textos' },
            { id: 'prices' as const, label: 'Productos y precios' },
            { id: 'help' as const, label: 'Necesito ayuda' },
          ].map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={materials.includes(item.id)}
                onChange={() =>
                  setValue(
                    'materials',
                    materials.includes(item.id)
                      ? materials.filter((id) => id !== item.id)
                      : [...materials, item.id],
                    { shouldDirty: true },
                  )
                }
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        <QuoteTextField
          name="colorsLiked"
          label="Otros colores que te gustan"
          placeholder="Puedes indicar un color o código hexadecimal."
        />
        <QuoteTextField name="colorsDisliked" label="Colores que quieres evitar" />
        <QuoteSelectField name="stylePreference" label="Otra dirección visual">
          <option value="modern">Moderno</option>
          <option value="elegant">Elegante</option>
          <option value="minimal">Minimalista</option>
          <option value="corporate">Corporativo</option>
          <option value="bold">Llamativo</option>
          <option value="unsure">Quiero orientación</option>
        </QuoteSelectField>
        <QuoteTextField
          name="references"
          label="Webs o estilos que te gustan"
          placeholder="Enlaces o una breve descripción."
          multiline
        />
        <QuoteTextField name="competitor" label="Marca o competencia de referencia" />
      </QuoteDetails>
      <QuoteStepHelp>
        El color y el estilo actualizan la maqueta orientativa. No cambian el precio; el nivel de
        personalización sí puede añadir un importe.
      </QuoteStepHelp>
    </>
  );
}
