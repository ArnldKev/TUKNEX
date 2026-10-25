import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { estimateQuote } from '../pricing';
import { quoteDefaults, quoteFormSchema } from './form';
import { buildSolutionPreview } from './preview';
import {
  PROJECT_HISTORY_LIMIT, StaleProjectRevisionError, acceptProjectSuggestion, changeQuoteProject,
  createProjectHistory, createQuoteProject, parseQuoteProject, projectChangeSchema,
  projectPreviewInput, projectPricingInput, projectRequirements, projectSuggestionSchema,
  projectToForm, quoteProjectSchema, recordProjectForm, redoProject, restoreProjectStart,
  serializeQuoteProject, undoProject,
} from './project';

const id = '226b85fc-d47f-4a08-9366-5d780d39598b';
const suggestionId = '12b00e6a-3fb9-40ab-bc06-4b227a7989d6';
const original = () => createProjectHistory(createQuoteProject(quoteDefaults, id));
function draw(project: ReturnType<typeof createQuoteProject>) {
  const { input, businessName, context } = projectPreviewInput(project);
  return buildSolutionPreview(input, businessName, context);
}

test('frontend and backend keep the exact same project schema and form dependencies', async () => {
  for (const name of ['project', 'form', 'visual', '../pricing']) {
    const [front, back] = await Promise.all([
      readFile(new URL(`./${name}.ts`, import.meta.url), 'utf8'),
      readFile(new URL(`../../../../backend/src/domain/quote/${name}.ts`, import.meta.url), 'utf8'),
    ]);
    assert.equal(front.replaceAll('\r\n', '\n'), back.replaceAll('\r\n', '\n'), name);
  }
});

test('incomplete drafts validate without weakening final submission validation', () => {
  assert.equal(quoteFormSchema.safeParse(quoteDefaults).success, false);
  const draft = createQuoteProject(quoteDefaults, id);
  assert.equal(draft.revision, 0);
  assert.deepEqual(draft.sources, {});
  assert.equal(draft.answers.offering, '');
  assert.equal(draft.answers.sector, '');
  assert.equal(quoteProjectSchema.safeParse(draft).success, true);
});

test('contact, approver and privacy choices never enter the project or preview', () => {
  const values = { ...quoteDefaults, name: 'Private person', email: 'private@example.test',
    phone: '+51900000001', approver: 'Private approver', privacyAcknowledged: true, marketingConsent: true };
  const project = createQuoteProject(values, id);
  const serialized = serializeQuoteProject(project);
  for (const secret of [values.name, values.email, values.phone, values.approver, 'marketingConsent', 'privacyAcknowledged'])
    assert.equal(serialized.includes(secret), false, secret);
  const changed = { ...values, budget: '1000+' as const, paymentPreference: 'monthly' as const };
  assert.deepEqual(draw(createQuoteProject(changed, id)), draw(project));
});

test('every project type and its preview survive a JSON round trip', () => {
  for (const projectType of ['landing', 'business', 'catalog', 'store', 'system', 'redesign'] as const) {
    const project = createQuoteProject({ ...quoteDefaults, projectType, businessName: 'Café del Bosque',
      sector: 'food', offering: 'Café, postres', colorsLiked: '#123abc',
      stylePreference: 'elegant', firstImpression: 'Cerca de ti', features: ['information', 'whatsapp', 'catalog'] }, id);
    const restored = parseQuoteProject(serializeQuoteProject(project));
    assert.deepEqual(restored, project);
    assert.deepEqual(draw(restored), draw(project));
  }
});

test('visual changes preserve requirements, scope, pricing input and the estimate', () => {
  const before = original();
  const after = changeQuoteProject(before, { visual: { colorsLiked: 'verde', colorsDisliked: 'rojo',
    stylePreference: 'elegant', firstImpression: 'Una idea con personalidad' } });
  assert.deepEqual(after.present.answers, before.present.answers);
  assert.deepEqual(projectRequirements(after.present), projectRequirements(before.present));
  assert.deepEqual(projectPricingInput(after.present), projectPricingInput(before.present));
  assert.deepEqual(estimateQuote(projectPricingInput(after.present)), estimateQuote(projectPricingInput(before.present)));
  assert.notDeepEqual(draw(after.present), draw(before.present));
  assert.throws(() => projectChangeSchema.parse({ visual: { features: ['payments'] } }));
  assert.throws(() => projectChangeSchema.parse({ visual: { design: 'premium' } }));
});

test('undo and redo restore choices while revisions continue to increase', () => {
  const before = original();
  const changed = changeQuoteProject(before, { visual: { colorsLiked: 'azul' } });
  const undone = undoProject(changed), redone = redoProject(undone);
  assert.deepEqual(draw(undone.present), draw(before.present));
  assert.deepEqual(draw(redone.present), draw(changed.present));
  assert.deepEqual([before.present.revision, changed.present.revision, undone.present.revision, redone.present.revision], [0, 1, 2, 3]);
  assert.equal(undoProject(before), before);
  assert.equal(redoProject(before), before);
});

test('history restores form choices without reverting contacts or consent', () => {
  const changed = recordProjectForm(original(), { ...quoteDefaults, businessName: 'Mi restaurante',
    projectType: 'catalog', features: ['catalog', 'whatsapp'] });
  const current = { ...quoteDefaults, name: 'Current contact', email: 'new@example.test', phone: '900000001',
    approver: 'Current approver', privacyAcknowledged: true, marketingConsent: true };
  const restored = projectToForm(undoProject(changed).present, current);
  for (const key of ['name', 'email', 'phone', 'approver', 'privacyAcknowledged', 'marketingConsent'] as const)
    assert.equal(restored[key], current[key], key);
  assert.equal(restored.businessName, '');
  assert.equal(restored.projectType, 'landing');
  assert.deepEqual(restoreProjectStart(changed).present.answers, original().present.answers);
});

test('a new branch clears redo and same content is a no-op', () => {
  const first = changeQuoteProject(original(), { visual: { colorsLiked: 'azul' } });
  assert.equal(changeQuoteProject(first, { visual: { colorsLiked: 'azul' } }), first);
  const second = changeQuoteProject(first, { visual: { stylePreference: 'elegant' } });
  const branch = changeQuoteProject(undoProject(second), { visual: { colorsLiked: 'verde' } });
  assert.equal(branch.future.length, 0);
  assert.equal(redoProject(branch), branch);
  assert.equal(first.present.visual.stylePreference, 'modern');
});

test('typing groups undo as a response and explicit selections stay separate', () => {
  let state = original();
  for (const offering of ['C', 'Ca', 'Café'])
    state = recordProjectForm(state, { ...quoteDefaults, offering }, { origin: 'written', group: 'typing:offering:1' });
  assert.equal(state.past.length, 1);
  assert.equal(state.present.sources.offering, 'written');
  const selected = changeQuoteProject(state, { visual: { colorsLiked: 'verde' } });
  assert.equal(selected.past.length, 2);
  assert.equal(undoProject(selected).present.answers.offering, 'Café');
  assert.equal(undoProject(state).present.answers.offering, '');
});

test('history is bounded and owns snapshots instead of retaining mutable form arrays', () => {
  let state = original();
  for (let index = 0; index < 80; index++)
    state = changeQuoteProject(state, { visual: { firstImpression: `Propuesta ${index}` } });
  assert.equal(state.past.length, PROJECT_HISTORY_LIMIT);
  for (let index = 0; index < 80; index++) state = undoProject(state);
  assert.equal(state.future.length, PROJECT_HISTORY_LIMIT);
  const features: typeof quoteDefaults.features = ['gallery'];
  const changed = recordProjectForm(original(), { ...quoteDefaults, features });
  features.push('payments');
  assert.deepEqual(changed.present.answers.features, ['gallery']);
  assert.deepEqual(original().present.answers.features, quoteDefaults.features);
});

test('a proposal does not apply until accepted and only applies to its exact revision', () => {
  const state = original();
  const proposal = projectSuggestionSchema.parse({ id: suggestionId, projectId: id, baseRevision: 0,
    reason: 'El cliente pidió una galería.', evidenceFields: ['otherFunctions'], change: { answers: { features: ['gallery'] } } });
  assert.deepEqual(state.present.answers.features, quoteDefaults.features);
  const accepted = acceptProjectSuggestion(state, proposal);
  assert.deepEqual(accepted.present.answers.features, ['gallery']);
  assert.equal(accepted.present.sources.features, 'suggested');
  assert.equal(accepted.past.length, 1);
  assert.throws(() => acceptProjectSuggestion(accepted, proposal), StaleProjectRevisionError);
  assert.throws(() => acceptProjectSuggestion(undoProject(accepted), proposal), StaleProjectRevisionError);
  assert.throws(() => acceptProjectSuggestion(state, { ...proposal, projectId: suggestionId }), StaleProjectRevisionError);
});

test('stale writes, unsupported functions and attempts to override prices or identity are rejected', () => {
  const state = changeQuoteProject(original(), { visual: { colorsLiked: 'azul' } });
  assert.throws(() => changeQuoteProject(state, { visual: { colorsLiked: 'verde' } }, { expectedRevision: 0 }), StaleProjectRevisionError);
  for (const input of [{ total: 1 }, { answers: { features: ['arbitrary-function'] } },
    { answers: { email: 'private@example.test' } }, { id: suggestionId }, { visual: { stylePreference: 'javascript' } }])
    assert.equal(projectChangeSchema.safeParse(input).success, false);
});

test('malformed, oversized and unsupported serialized versions are rejected', () => {
  const project = original().present;
  for (const value of [{ ...project, schemaVersion: 999 }, { ...project, revision: -1 },
    { ...project, total: 1 }, { ...project, answers: { ...project.answers, email: 'private@example.test' } },
    { ...project, sources: { arbitrary: 'written' } }])
    assert.throws(() => parseQuoteProject(JSON.stringify(value)));
  assert.throws(() => parseQuoteProject('{broken'));
  assert.throws(() => parseQuoteProject(' '.repeat(64_001)));
});

test('restore-start is one undoable operation and retains the project identity', () => {
  const changed = changeQuoteProject(changeQuoteProject(original(), { answers: { offering: 'Servicios de prueba' } }),
    { visual: { colorsLiked: 'verde' } });
  const reset = restoreProjectStart(changed);
  assert.equal(reset.present.id, changed.present.id);
  assert.deepEqual(draw(reset.present), draw(original().present));
  assert.deepEqual(undoProject(reset).present.answers, changed.present.answers);
  assert.deepEqual(undoProject(reset).present.visual, changed.present.visual);
  assert.equal(restoreProjectStart(original()).present.revision, 0);
});
