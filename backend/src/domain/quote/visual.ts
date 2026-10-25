// Keep identical in frontend and backend. Only enumerated presentation choices are accepted.
import { z } from 'zod';

export const visualOptions = {
  font: { label: 'Tipografía', choices: { sans: 'Clara y actual', editorial: 'Editorial, con serifas', rounded: 'Cercana y redondeada' } },
  scale: { label: 'Tamaño de los títulos', choices: { balanced: 'Equilibrado', large: 'Protagonista' } },
  spacing: { label: 'Espacio entre elementos', choices: { airy: 'Amplio', compact: 'Compacto' } },
  hero: { label: 'Composición de portada', choices: { split: 'Texto e ilustración', centered: 'Mensaje centrado' } },
  surface: { label: 'Fondo de portada', choices: { tinted: 'Tono de mi color', paper: 'Claro, como papel' } },
  sectionOrder: { label: 'Orden de navegación', choices: { content: 'Oferta antes de contacto', contact: 'Contacto antes de la oferta' } },
} as const;
export const visualPreferencesSchema = z.object({
  font: z.enum(['sans', 'editorial', 'rounded']),
  scale: z.enum(['balanced', 'large']),
  spacing: z.enum(['airy', 'compact']),
  hero: z.enum(['split', 'centered']),
  surface: z.enum(['tinted', 'paper']),
  sectionOrder: z.enum(['content', 'contact']),
}).strict();
export type VisualPreferences = z.infer<typeof visualPreferencesSchema>;
export const visualDefaults: VisualPreferences = {
  font: 'sans', scale: 'balanced', spacing: 'airy', hero: 'split', surface: 'tinted', sectionOrder: 'content',
};
export const previewFeedbackLabels = {
  unsure: 'Aún lo estoy explorando', like: 'Me gusta esta dirección', changes: 'Quiero algunos cambios', guidance: 'Necesito orientación',
} as const;
export function resolveVisualPreferences(value: unknown): VisualPreferences {
  const parsed = visualPreferencesSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...visualDefaults };
}
export function visualPreferenceSummary(value: unknown): string {
  if (value === undefined || value === null) return 'Sin preferencias adicionales registradas';
  const preferences = resolveVisualPreferences(value);
  return (Object.keys(visualOptions) as (keyof VisualPreferences)[]).map(key => {
    const option = visualOptions[key];
    return `${option.label}: ${(option.choices as Record<string, string>)[preferences[key]]}`;
  }).join(' · ');
}
