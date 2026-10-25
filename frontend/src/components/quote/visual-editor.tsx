'use client';

import { useId } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Paintbrush, Sparkles } from 'lucide-react';
import type { QuoteFormValues } from '@/lib/quote/form';
import { resolvePreviewPalette } from '@/lib/quote/preview';
import { resolveVisualPreferences, visualOptions, type VisualPreferences } from '@/lib/quote/visual';
import { useQuoteProjectSession } from './project-session';
import './visual-editor.css';

export function QuoteVisualEditor({ disabled = false }: { disabled?: boolean }) {
  const id = useId();
  const { control, setValue } = useFormContext<QuoteFormValues>();
  const { suggest, history } = useQuoteProjectSession();
  const [raw, colors, style, sector, projectType, features] = useWatch({ control,
    name: ['visualPreferences', 'colorsLiked', 'stylePreference', 'sector', 'projectType', 'features'] });
  const preferences = resolveVisualPreferences(raw);
  const color = resolvePreviewPalette(colors, style).accent;
  const food = sector === 'food';
  const presets = [
    { name: food ? 'Cálido y cercano' : 'Cercano y natural', colors: food ? 'cálido' : 'verde',
      style: 'modern' as const, font: 'rounded' as const, hero: 'split' as const },
    { name: 'Editorial y sereno', colors: 'azul', style: 'elegant' as const,
      font: 'editorial' as const, hero: 'centered' as const },
    { name: 'Claro y directo', colors: 'turquesa', style: 'minimal' as const,
      font: 'sans' as const, hero: 'split' as const },
  ];
  return <details className="quote-visual-editor">
    <summary><Paintbrush size={18} /> Personalizar mi boceto <span>Color, letras y composición</span></summary>
    <fieldset className="qve-body" disabled={disabled} aria-label="Opciones del boceto">
      <p>Prueba una dirección visual. Puedes deshacer cada elección; estas preferencias no cambian el precio.</p>
      <fieldset className="qve-ideas">
        <legend><Sparkles size={16} /> Ideas de ejemplo · guía local</legend>
        <p>Son combinaciones preparadas, no respuestas de una IA. Al aplicar una se reemplazan tu color, estilo, tipografía y portada.</p>
        {presets.map(preset => <button type="button" key={preset.name} onClick={() => suggest({ visual: {
          colorsLiked: preset.colors, stylePreference: preset.style,
          visualPreferences: { ...preferences, font: preset.font, hero: preset.hero },
        } }, `Dirección local: ${preset.name}`, ['sector'])}>Aplicar: {preset.name}</button>)}
      </fieldset>
      <label className="qve-color" htmlFor={id + '-color'}>
        <span>Color de acento del boceto</span>
        <input id={id + '-color'} type="color" value={color}
          onChange={event => setValue('colorsLiked', event.target.value, { shouldDirty: true })} />
        <code>{color.toUpperCase()}</code>
      </label>
      <div className="qve-grid">
        {(Object.keys(visualOptions) as (keyof VisualPreferences)[]).map(key => {
          const option = visualOptions[key];
          const unavailable = (key === 'hero' && projectType === 'system') ||
            (key === 'sectionOrder' && (projectType === 'system' || !features.includes('contact')));
          return <label key={key} htmlFor={id + key}>
            <span>{option.label}</span>
            <select id={id + key} value={preferences[key]} disabled={unavailable}
              onChange={event => setValue('visualPreferences', { ...preferences, [key]: event.target.value }, { shouldDirty: true })}>
              {Object.entries(option.choices).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            {unavailable && <small>{key === 'hero' ? 'La vista de sistema usa un panel de trabajo.' : 'Disponible cuando eliges la función Contacto en una web.'}</small>}
          </label>;
        })}
      </div>
      <p>El orden mueve los enlaces de las secciones disponibles; no añade funciones. Las ilustraciones y los productos son ejemplos.</p>
      {history.present.sources.visualPreferences === 'suggested' && <p className="qve-status" role="status">Dirección de ejemplo aplicada. Ahora puedes ajustarla a tu gusto.</p>}
    </fieldset>
    {disabled && <p className="qve-locked">Para cambiar el diseño de una propuesta calculada, vuelve a editarla y calcula de nuevo.</p>}
  </details>;
}
