'use client';

import type { CSSProperties } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { money } from '@/lib/pricing';
import type { QuoteFormValues } from '@/lib/quote/form';
import { resolvePreviewPalette } from '@/lib/quote/preview';
import { resolveVisualPreferences, type VisualPreferences } from '@/lib/quote/visual';
import { QuoteVisualEditor } from '../visual-editor';
import { QuoteDetails, QuoteSelectField, QuoteStepHelp, QuoteTextField, type QuoteStepProps } from './shared';
import './style-step.css';

const styles = [
  { id: 'modern' as const, name: 'Moderno', detail: 'Portada asimétrica, tarjetas suaves y letras claras. Una imagen actual y cercana.', title: 'Ideas que avanzan.', badge: 'TU PRÓXIMO PASO' },
  { id: 'elegant' as const, name: 'Elegante', detail: 'Letras con serifas, líneas finas y una portada editorial. Un ritmo sereno y cuidado.', title: 'Cada detalle cuenta.', badge: 'HECHO CON CUIDADO' },
  { id: 'minimal' as const, name: 'Sencillo', detail: 'Pocos elementos, mucho espacio y un mensaje directo. Lo importante se encuentra fácil.', title: 'Solo lo esencial.', badge: 'MENOS, MEJOR' },
  { id: 'bold' as const, name: 'Llamativo', detail: 'Títulos grandes, formas con carácter y contraste. Tu mensaje toma el protagonismo.', title: 'Hazte notar.', badge: 'UNA IDEA CON FUERZA' },
  { id: 'corporate' as const, name: 'Profesional', detail: 'Bloques ordenados, geometría recta y datos claros. Una presentación formal y confiable.', title: 'Todo en su lugar.', badge: 'CLARIDAD Y CONFIANZA' },
  { id: 'unsure' as const, name: 'No estoy seguro', detail: 'Conservamos tus preferencias y definimos la dirección visual contigo.', title: 'Lo decidimos juntos.', badge: 'TU IDEA, A TU MANERA' },
];
const directionPresets = {
  modern: {font:'sans',spacing:'airy',hero:'split',surface:'tinted'},
  elegant: {font:'editorial',spacing:'airy',hero:'split',surface:'paper'},
  minimal: {font:'sans',spacing:'airy',hero:'centered',surface:'paper'},
  bold: {font:'sans',spacing:'compact',hero:'split',surface:'tinted'},
  corporate: {font:'sans',spacing:'compact',hero:'split',surface:'tinted'},
} as const;
/** Explicit style choice supplies a starting direction; independent controls can override it later. */
export function styleDirectionPreferences(style:QuoteFormValues['stylePreference'],current:VisualPreferences):VisualPreferences {
  return style==='unsure'?current:{...current,...directionPresets[style]};
}
function StyleSample({item,colors}:{item:typeof styles[number];colors:string}) {
  const palette=resolvePreviewPalette(colors,item.id);
  const variables={
    '--qstyle-accent':palette.accent,'--qstyle-on-accent':palette.onAccent,
    '--qstyle-tint':palette.surface,'--qstyle-ink':palette.ink,
  } as CSSProperties;
  return <span className={'qstyle-preview qstyle-preview-'+item.id} style={variables} aria-hidden="true">
    <span className="qstyle-mini-bar"><i/><span/><i/></span>
    <span className="qstyle-mini-hero"><span className="qstyle-mini-copy"><span>{item.badge}</span><b>{item.title}</b><i/><em/></span><span className="qstyle-mini-art"><i/><i/><i/></span></span>
    <span className="qstyle-mini-bottom"><i/><i/><i/></span>
  </span>;
}
const palettes = [
  { id: 'turquesa', name: 'Turquesa', color: '#00b9ae' },
  { id: 'azul', name: 'Azul', color: '#176ac6' },
  { id: 'verde', name: 'Verde', color: '#2c8868' },
  { id: 'cálido', name: 'Cálido', color: '#bf763f' },
];
export function QuoteStyleStep({ prices }: QuoteStepProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const [style, colors, materials, rawVisual] = useWatch({ control, name: ['stylePreference', 'colorsLiked', 'materials', 'visualPreferences'], exact: true });
  const preferences=resolveVisualPreferences(rawVisual);
  function chooseStyle(next:QuoteFormValues['stylePreference']) {
    setValue('stylePreference',next,{shouldDirty:true});
    if(next!=='unsure')setValue('visualPreferences',styleDirectionPreferences(next,preferences),{shouldDirty:true});
  }
  return <>
    <p className="qstyle-intro">Elige la forma de presentar tu idea. Cada estilo aplica letras, espacio, portada y fondo de partida. Conservamos los colores que hayas elegido; después puedes personalizarlo.</p>
    <div className="quote-style-grid" role="group" aria-label="¿Cómo te gustaría que se vea?">
      {styles.map(item => <button type="button" key={item.id} data-style={item.id}
        className={`quote-style-option qstyle-card style-${item.id} ${style === item.id ? 'selected' : ''}`}
        aria-pressed={style === item.id} onClick={() => chooseStyle(item.id)}>
        <StyleSample item={item} colors={colors}/>
        <span className="qstyle-copy"><strong>{item.name}</strong><small>{item.detail}</small></span>
        <span className="qstyle-choice">{style === item.id?<><Check size={16} aria-hidden="true"/>Elegido</>:<>Elegir esta dirección<span aria-hidden="true">↗</span></>}</span>
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
