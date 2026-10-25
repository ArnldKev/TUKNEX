import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteDefaults, quoteFormSchema, toAnonymousDraft } from './form';
import { buildSolutionPreview } from './preview';
import { quoteAnswers } from './presentation';
import { visualDefaults, visualPreferencesSchema, resolveVisualPreferences } from './visual';
import { createQuoteProject, createProjectHistory, recordProjectForm, projectPreviewInput,
  projectPricingInput, changeQuoteProject, undoProject, redoProject, serializeQuoteProject, parseQuoteProject } from './project';

const values = { ...quoteDefaults, offering: 'Café, postres y platos de la casa', sector: 'food' as const,
  problem: 'Organizar la carta y recibir consultas.', privacyAcknowledged: true };
const preferences = { font: 'editorial', scale: 'large', spacing: 'compact', hero: 'centered', surface: 'paper', sectionOrder: 'contact' } as const;
const draw = (project: ReturnType<typeof createQuoteProject>) => {
  const props = projectPreviewInput(project);
  return buildSolutionPreview(props.input, props.businessName, props.context);
};
test('presentation and feedback survive form validation, serialization and undo without changing price', () => {
  const initial = createProjectHistory(createQuoteProject(values));
  const changed = recordProjectForm(initial, { ...values, visualPreferences: preferences,
    previewFeedback: 'changes', previewComment: 'Conservar el color y agrandar el título.' });
  assert.deepEqual(draw(changed.present).presentation, preferences);
  assert.deepEqual(projectPricingInput(changed.present), projectPricingInput(initial.present));
  assert.deepEqual(draw(undoProject(changed).present), draw(initial.present));
  assert.deepEqual(draw(redoProject(undoProject(changed)).present), draw(changed.present));
  assert.deepEqual(parseQuoteProject(serializeQuoteProject(changed.present)), changed.present);
  const parsed = quoteFormSchema.parse({ ...values, visualPreferences: preferences, previewFeedback: 'changes', previewComment: 'Conservar el color.' });
  const answers = quoteAnswers(parsed);
  assert.ok(answers.some(a => a.value.includes('Editorial, con serifas')));
  assert.ok(answers.some(a => a.value === 'Quiero algunos cambios'));
  assert.ok(answers.some(a => a.value === 'Conservar el color.'));
});
test('legacy form and project version 1 receive safe visual defaults without losing their identity', () => {
  const legacyForm = { ...values };
  delete legacyForm.visualPreferences; delete legacyForm.previewFeedback; delete legacyForm.previewComment;
  assert.equal(quoteFormSchema.safeParse(legacyForm).success, true);
  const legacyAnswers = quoteAnswers(legacyForm);
  assert.ok(legacyAnswers.some(a => a.value === 'Sin preferencias adicionales registradas'));
  assert.ok(legacyAnswers.some(a => a.value === 'Sin valoración registrada'));
  assert.deepEqual(draw(createQuoteProject(legacyForm)).presentation, visualDefaults);
  const project = createQuoteProject(values);
  const { visualPreferences: _preferences, previewFeedback: _feedback, previewComment: _comment, ...visual } = project.visual;
  const legacy = { ...project, visual, schemaVersion: 1 };
  const restored = parseQuoteProject(JSON.stringify(legacy));
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.id, project.id);
  assert.equal(restored.revision, project.revision);
  assert.deepEqual(restored.visual.visualPreferences, visualDefaults);
  assert.deepEqual(restored.answers, project.answers);
  assert.throws(() => parseQuoteProject(JSON.stringify({ ...legacy, visual: { ...visual, arbitraryCss: 'url(example)' } })));
});
test('only approved visual choices are accepted and free feedback never enters anonymous local drafts', () => {
  for (const bad of [{ ...visualDefaults, font: 'url(example)' }, { ...visualDefaults, arbitraryCss: 'red' },
    { ...visualDefaults, scale: '999px' }]) assert.equal(visualPreferencesSchema.safeParse(bad).success, false);
  assert.deepEqual(resolveVisualPreferences({ font: 'invalid' }), visualDefaults);
  assert.equal(quoteFormSchema.safeParse({ ...values, previewComment: 'x'.repeat(601) }).success, false);
  const draft = toAnonymousDraft({ ...values, visualPreferences: preferences, previewComment: 'Private draft text', previewFeedback: 'guidance' });
  assert.equal('previewComment' in draft, false);
  assert.equal('visualPreferences' in draft, false);
  assert.equal('previewFeedback' in draft, false);
});
test('navigation reorders only selected sections while preserving demo interaction identity and modules', () => {
  const base = { projectType: 'landing' as const, design: 'essential' as const, features: ['information', 'contact'] };
  const original = buildSolutionPreview(base);
  const reordered = buildSolutionPreview(base, '', { visualPreferences: preferences });
  assert.deepEqual(reordered.sections.map(s => s.id), ['inicio', 'contact', 'services']);
  assert.equal(original.key, reordered.key);
  const without = buildSolutionPreview({ ...base, features: ['information'] }, '', { visualPreferences: preferences });
  assert.equal(without.sections.some(s => s.id === 'contact'), false);
  const system = buildSolutionPreview({ ...base, projectType: 'system', features: ['clients', 'reports'] }, '', { visualPreferences: preferences });
  assert.deepEqual(system.sections.map(s => s.id), ['clients', 'reports']);
  assert.deepEqual(system.featureLabels, buildSolutionPreview({ ...base, projectType: 'system', features: ['clients', 'reports'] }).featureLabels);
});

test('partial suggestions preserve all untouched visual decisions and feedback', () => {
  const state = createProjectHistory(createQuoteProject({ ...values, visualPreferences: preferences,
    previewFeedback: 'changes', previewComment: 'Mantener tipografía.' }));
  const changed = changeQuoteProject(state, { visual: { colorsLiked: 'verde' } });
  assert.deepEqual(changed.present.visual.visualPreferences, preferences);
  assert.equal(changed.present.visual.previewFeedback, 'changes');
  assert.equal(changed.present.visual.previewComment, 'Mantener tipografía.');
});
