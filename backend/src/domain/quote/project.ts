// Keep this module identical in frontend/src/lib/quote and backend/src/domain/quote.
// project.test.ts verifies the source and dependency parity; no contact data belongs here.
import { z } from 'zod';
import { FEATURES, type QuoteInput } from '../pricing';
import { visualDefaults, visualPreferencesSchema } from './visual';
import { quoteDefaults, quoteFormSchema, type QuoteFormValues } from './form';

export const PROJECT_SCHEMA_VERSION = 2;
export const PROJECT_HISTORY_LIMIT = 30;
const MAX_PROJECT_JSON_LENGTH = 64_000;
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const originSchema = z.enum(['written', 'selected', 'imported', 'transcribed', 'suggested']);

// Drafts may be incomplete. Final submission still uses the existing quoteFormSchema.
export const projectAnswersSchema = quoteFormSchema.omit({
  name: true, email: true, phone: true, approver: true,
  privacyAcknowledged: true, marketingConsent: true,
  stylePreference: true, colorsLiked: true, colorsDisliked: true, firstImpression: true,
  visualPreferences: true, previewFeedback: true, previewComment: true,
}).extend({
  offering: z.string().max(300),
  problem: z.string().max(1000),
  sector: z.enum(['', 'food', 'tourism', 'commerce', 'services', 'health', 'education', 'other']),
  features: quoteFormSchema.shape.features.max(FEATURES.length),
  salesChannels: quoteFormSchema.shape.salesChannels.max(6),
  materials: quoteFormSchema.shape.materials.max(6),
}).strict();

export const projectVisualSchema = quoteFormSchema.pick({
  stylePreference: true, colorsLiked: true, colorsDisliked: true, firstImpression: true,
  visualPreferences: true, previewFeedback: true, previewComment: true,
}).extend({
  visualPreferences: visualPreferencesSchema.default(visualDefaults),
  previewFeedback: quoteFormSchema.shape.previewFeedback.default('unsure'),
  previewComment: quoteFormSchema.shape.previewComment.default(''),
}).strict();

const answerKeys = Object.keys(projectAnswersSchema.shape) as (keyof ProjectAnswers)[];
const visualKeys = Object.keys(projectVisualSchema.shape) as (keyof ProjectVisual)[];
export const PROJECT_FIELDS = [...answerKeys, ...visualKeys];
const fieldSchema = z.enum(PROJECT_FIELDS);
const stateSchema = z.object({
  answers: projectAnswersSchema,
  visual: projectVisualSchema,
  sources: z.partialRecord(fieldSchema, originSchema),
}).strict();
export const quoteProjectSchema = stateSchema.extend({
  schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
  id: z.uuid(),
  revision,
}).strict();

// Patches must not fill absent fields with defaults: changing a color must preserve typography and feedback.
const visualPatchSchema = projectVisualSchema.partial().extend({
  visualPreferences: visualPreferencesSchema.optional(),
  previewFeedback: quoteFormSchema.shape.previewFeedback,
  previewComment: quoteFormSchema.shape.previewComment,
});
export const projectChangeSchema = z.object({
  answers: projectAnswersSchema.partial().optional(),
  visual: visualPatchSchema.optional(),
}).strict().refine(change => Object.keys(change.answers ?? {}).length + Object.keys(change.visual ?? {}).length > 0,
  'El cambio debe incluir al menos una decisión.');

// A future provider proposes a patch; it cannot replace a project or set its price/identity.
export const projectSuggestionSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  baseRevision: revision,
  reason: z.string().trim().min(1).max(1000),
  evidenceFields: z.array(fieldSchema).min(1).max(PROJECT_FIELDS.length),
  change: projectChangeSchema,
}).strict();

export type ProjectAnswers = z.infer<typeof projectAnswersSchema>;
export type ProjectVisual = z.infer<typeof projectVisualSchema>;
export type QuoteProject = z.infer<typeof quoteProjectSchema>;
export type ProjectState = z.infer<typeof stateSchema>;
export type ProjectChange = z.infer<typeof projectChangeSchema>;
export type ProjectSuggestion = z.infer<typeof projectSuggestionSchema>;
export type ProjectOrigin = z.infer<typeof originSchema>;
export type ProjectField = typeof PROJECT_FIELDS[number];
export interface ProjectHistory {
  initial: ProjectState;
  past: ProjectState[];
  present: QuoteProject;
  future: ProjectState[];
  lastGroup: string | null;
}
interface ChangeOptions {
  expectedRevision?: number;
  origin?: ProjectOrigin;
  group?: string | null;
}

export class StaleProjectRevisionError extends Error {
  constructor() { super('Tu idea cambió. Revisa la sugerencia con la versión actual antes de aplicarla.'); }
}
const pick = <T extends object, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map(key => [key, value[key]])) as Pick<T, K>;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function stateOf(project: QuoteProject): ProjectState {
  return stateSchema.parse({ answers: project.answers, visual: project.visual, sources: project.sources });
}
function stateFromForm(values: QuoteFormValues, sources: ProjectState['sources']): ProjectState {
  return stateSchema.parse({ answers: pick(values, answerKeys), visual: pick(values, visualKeys), sources });
}
function checkRevision(history: ProjectHistory, expected?: number) {
  if (expected !== undefined && history.present.revision !== expected) throw new StaleProjectRevisionError();
}
function advance(project: QuoteProject, state: ProjectState): QuoteProject {
  return quoteProjectSchema.parse({ ...state, schemaVersion: PROJECT_SCHEMA_VERSION,
    id: project.id, revision: project.revision + 1 });
}
function commit(history: ProjectHistory, next: ProjectState, options: ChangeOptions): ProjectHistory {
  checkRevision(history, options.expectedRevision);
  const previous = stateOf(history.present);
  const changed = PROJECT_FIELDS.filter(field => {
    const group = visualKeys.includes(field as keyof ProjectVisual) ? 'visual' : 'answers';
    return !equal((previous[group] as Record<string, unknown>)[field], (next[group] as Record<string, unknown>)[field]);
  });
  if (!changed.length) return history;
  const sources = { ...next.sources };
  for (const field of changed) sources[field] = options.origin ?? 'selected';
  const group = options.group ?? null;
  const coalesce = group !== null && history.lastGroup === group && history.future.length === 0;
  return {
    ...history,
    past: coalesce ? history.past : [...history.past, previous].slice(-PROJECT_HISTORY_LIMIT),
    present: advance(history.present, { ...next, sources }),
    future: [], lastGroup: group,
  };
}

export function createQuoteProject(values: QuoteFormValues = quoteDefaults, id = crypto.randomUUID()): QuoteProject {
  return quoteProjectSchema.parse({ ...stateFromForm(values, {}), schemaVersion: PROJECT_SCHEMA_VERSION, id, revision: 0 });
}
export function createProjectHistory(project: QuoteProject): ProjectHistory {
  const present = quoteProjectSchema.parse(project);
  return { initial: stateOf(present), past: [], present, future: [], lastGroup: null };
}
export function recordProjectForm(history: ProjectHistory, values: QuoteFormValues, options: ChangeOptions = {}): ProjectHistory {
  return commit(history, stateFromForm(values, history.present.sources), options);
}
export function changeQuoteProject(history: ProjectHistory, rawChange: ProjectChange, options: ChangeOptions = {}): ProjectHistory {
  checkRevision(history, options.expectedRevision);
  const change = projectChangeSchema.parse(rawChange);
  return commit(history, stateSchema.parse({
    answers: { ...history.present.answers, ...change.answers },
    visual: { ...history.present.visual, ...change.visual }, sources: history.present.sources,
  }), options);
}
export function acceptProjectSuggestion(history: ProjectHistory, rawSuggestion: ProjectSuggestion): ProjectHistory {
  const suggestion = projectSuggestionSchema.parse(rawSuggestion);
  if (suggestion.projectId !== history.present.id) throw new StaleProjectRevisionError();
  return changeQuoteProject(history, suggestion.change, { expectedRevision: suggestion.baseRevision, origin: 'suggested' });
}
export function undoProject(history: ProjectHistory): ProjectHistory {
  const target = history.past.at(-1);
  if (!target) return history;
  return { ...history, past: history.past.slice(0, -1), present: advance(history.present, target),
    future: [stateOf(history.present), ...history.future].slice(0, PROJECT_HISTORY_LIMIT), lastGroup: null };
}
export function redoProject(history: ProjectHistory): ProjectHistory {
  const target = history.future[0];
  if (!target) return history;
  return { ...history, past: [...history.past, stateOf(history.present)].slice(-PROJECT_HISTORY_LIMIT),
    present: advance(history.present, target), future: history.future.slice(1), lastGroup: null };
}
export function restoreProjectStart(history: ProjectHistory): ProjectHistory {
  const previous = stateOf(history.present);
  if (equal(previous.answers, history.initial.answers) && equal(previous.visual, history.initial.visual)) return history;
  return { ...history, past: [...history.past, previous].slice(-PROJECT_HISTORY_LIMIT),
    present: advance(history.present, history.initial), future: [], lastGroup: null };
}
export function projectToForm(project: QuoteProject, current: QuoteFormValues): QuoteFormValues {
  const valid = quoteProjectSchema.parse(project);
  return { ...current, ...valid.answers, ...valid.visual };
}
export function projectPricingInput(project: QuoteProject): QuoteInput {
  return pick(project.answers, ['projectType', 'features', 'design', 'timeline', 'productsRange', 'userRange', 'otherFunctions']);
}
export function projectPreviewInput(project: QuoteProject) {
  const answers = project.answers;
  return {
    input: { projectType: answers.projectType, features: answers.features, design: answers.design, timeline: 'standard' as const },
    businessName: answers.businessName,
    context: { goal: answers.goal, sector: answers.sector, offering: answers.offering,
      stylePreference: project.visual.stylePreference, colorsLiked: project.visual.colorsLiked,
      firstImpression: project.visual.firstImpression, visualPreferences: project.visual.visualPreferences },
  };
}
export function projectRequirements(project: QuoteProject) {
  return [...new Set(project.answers.features)].map(id => ({
    id, label: FEATURES.find(feature => feature.id === id)!.name,
    evidenceField: 'features' as const, basis: 'form-selection' as const,
  }));
}
export function serializeQuoteProject(project: QuoteProject): string {
  const json = JSON.stringify(quoteProjectSchema.parse(project));
  if (json.length > MAX_PROJECT_JSON_LENGTH) throw new Error('El proyecto supera el tamaño permitido.');
  return json;
}
export function parseQuoteProject(json: string): QuoteProject {
  if (json.length > MAX_PROJECT_JSON_LENGTH) throw new Error('El proyecto supera el tamaño permitido.');
  const raw = JSON.parse(json);
  if (raw?.schemaVersion === 1) {
    // Validate the original shape before adding defaults; never reinterpret unknown versions.
    const legacy = quoteProjectSchema.extend({ schemaVersion: z.literal(1),
      visual: projectVisualSchema.omit({ visualPreferences: true, previewFeedback: true, previewComment: true }),
    }).parse(raw);
    return quoteProjectSchema.parse({ ...legacy, schemaVersion: PROJECT_SCHEMA_VERSION });
  }
  return quoteProjectSchema.parse(raw);
}
