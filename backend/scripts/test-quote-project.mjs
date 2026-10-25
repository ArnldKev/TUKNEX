import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const model = require('../dist/domain/quote/project.js');
const { quoteDefaults, quoteFormSchema } = require('../dist/domain/quote/form.js');
const { estimateQuote } = require('../dist/domain/pricing.js');
const id = '226b85fc-d47f-4a08-9366-5d780d39598b';

test('backend validates the same incomplete project and excludes contacts', () => {
  const project = model.createQuoteProject({ ...quoteDefaults, email: 'private@example.test' }, id);
  assert.equal(quoteFormSchema.safeParse(quoteDefaults).success, false);
  assert.equal(model.quoteProjectSchema.safeParse(project).success, true);
  assert.equal(model.serializeQuoteProject(project).includes('private@example.test'), false);
  assert.deepEqual(model.parseQuoteProject(model.serializeQuoteProject(project)), project);
});

test('backend preserves price rules across visual-only changes and history traversal', () => {
  const original = model.createProjectHistory(model.createQuoteProject(quoteDefaults, id));
  const changed = model.changeQuoteProject(original, { visual: { colorsLiked: 'verde', stylePreference: 'elegant' } });
  assert.deepEqual(estimateQuote(model.projectPricingInput(changed.present)), estimateQuote(model.projectPricingInput(original.present)));
  assert.deepEqual(model.undoProject(changed).present.visual, original.present.visual);
  assert.deepEqual(model.redoProject(model.undoProject(changed)).present.visual, changed.present.visual);
});

test('backend rejects stale proposals and unapproved fields before applying them', () => {
  const original = model.createProjectHistory(model.createQuoteProject(quoteDefaults, id));
  const proposal = { id: '12b00e6a-3fb9-40ab-bc06-4b227a7989d6', projectId: id, baseRevision: 0,
    reason: 'Propuesta sintética', evidenceFields: ['offering'], change: { visual: { colorsLiked: 'verde' } } };
  const accepted = model.acceptProjectSuggestion(original, proposal);
  assert.throws(() => model.acceptProjectSuggestion(accepted, proposal), model.StaleProjectRevisionError);
  assert.equal(model.projectChangeSchema.safeParse({ answers: { role: 'admin' } }).success, false);
  assert.equal(model.projectChangeSchema.safeParse({ totalCents: 1 }).success, false);
});
