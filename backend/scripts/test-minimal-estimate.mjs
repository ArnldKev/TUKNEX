import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PublicController } = require('../dist/billing/billing.controller.js');
const { quoteDefaults } = require('../dist/domain/quote/form.js');
const { estimateQuote } = require('../dist/domain/pricing.js');
const prices = { landing: 275, 'urgent-percent': 30 };
const controller = new PublicController({ settings: async () => ({ prices }) }, {});
const minimal = { projectType: 'landing', features: ['information', 'gallery'], design: 'custom', timeline: 'urgent', productsRange: '1-20', userRange: '1-2', hasOtherFunctions: true };

test('public estimate accepts minimal choices without contacts or project text', async () => {
  const result = await controller.estimate(minimal);
  const original = estimateQuote({ ...minimal, otherFunctions: 'Necesidad privada' }, prices);
  for (const key of Object.keys(original)) assert.deepEqual(result[key], original[key]);
  assert.deepEqual([result.total, result.currency, result.category, result.version], [553, 'PEN', 'landing', '3.0']);
});

test('public estimate keeps the legacy full form compatible', async () => {
  const values = { ...quoteDefaults, offering: 'Productos de prueba', sector: 'commerce', problem: 'Mejorar el proceso comercial', privacyAcknowledged: true, otherFunctions: 'Necesidad privada' };
  const result = await controller.estimate(values);
  const original = estimateQuote(values, prices);
  for (const key of Object.keys(original)) assert.deepEqual(result[key], original[key]);
});

test('minimal estimate rejects extra fields without reinterpreting them as a legacy form', async () => {
  for (const extra of [{ email: 'private@example.test' }, { otherFunctions: 'private' }, { amount: 1 }, { offering: 'private' }]) {
    await assert.rejects(controller.estimate({ ...minimal, ...extra }), error => error.getStatus() === 400);
  }
  await assert.rejects(controller.estimate({ ...quoteDefaults, ...minimal, offering: 'Productos', sector: 'commerce', problem: 'Problema descrito', privacyAcknowledged: true }), error => error.getStatus() === 400);
});
