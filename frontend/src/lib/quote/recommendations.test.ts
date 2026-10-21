import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateQuote } from '../pricing';
import { defaultFeatures, goalRecommendations, quoteDefaults, quoteFormSchema } from './form';

test('everyday product goals lead to a catalog without adding online payments', () => {
  const recommendation = goalRecommendations.products!;
  const values = {
    ...quoteDefaults,
    goal: 'products' as const,
    projectType: recommendation.type,
    features: [...defaultFeatures[recommendation.type]],
    offering: 'Menú de restaurante',
    sector: 'food' as const,
    problem: 'Mostrar el menú y recibir consultas',
    privacyAcknowledged: true,
  };
  assert.equal(quoteFormSchema.safeParse(values).success, true);
  assert.equal(values.email, '');
  assert.equal(values.phone, '');
  assert.equal(values.features.includes('payments'), false);
  const estimate = estimateQuote(values);
  assert.equal(estimate.custom, false);
  assert.equal(estimate.total, 450);
});

test('collecting online payments still requires a responsible manual review', () => {
  const recommendation = goalRecommendations.sales!;
  const estimate = estimateQuote({
    ...quoteDefaults,
    projectType: recommendation.type,
    features: [...defaultFeatures[recommendation.type]],
  });
  assert.equal(recommendation.type, 'store');
  assert.equal(estimate.custom, true);
  assert.equal(estimate.rulesApplied.includes('commerce-scope'), true);
  assert.equal(goalRecommendations.unsure, null);
});
