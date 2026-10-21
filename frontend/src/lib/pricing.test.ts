import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateQuote } from './pricing';

const base = {
  projectType: 'landing' as const,
  features: ['information', 'whatsapp', 'contact'],
  design: 'essential' as const,
  timeline: 'standard' as const,
};

test('accessible base prices and included functions stay consistent', () => {
  assert.equal(estimateQuote(base).total, 200);
  assert.equal(estimateQuote({ ...base, projectType: 'business' }).total, 250);
  assert.equal(estimateQuote({ ...base, projectType: 'catalog', features: ['catalog'] }).total, 450);
  assert.equal(estimateQuote({ ...base, projectType: 'system', features: ['login'] }).total, 800);
});

test('extras, design, and urgency are itemized without duplicate charges', () => {
  const quote = estimateQuote({
    ...base,
    features: ['gallery', 'gallery'],
    design: 'custom',
    timeline: 'urgent',
  });
  assert.equal(quote.extras.length, 1);
  assert.equal(quote.designAmount, 100);
  assert.equal(quote.urgencyAmount, 70);
  assert.equal(quote.total, 420);
});

test('commerce, payment integrations, and complex systems require a human review', () => {
  assert.equal(estimateQuote({ ...base, projectType: 'store' }).custom, true);
  assert.equal(estimateQuote({ ...base, features: ['payments'] }).custom, true);
  assert.equal(estimateQuote({ ...base, features: ['integrations'] }).custom, true);
  assert.equal(estimateQuote({ ...base, features: ['login', 'inventory'] }).custom, true);
  assert.equal(
    estimateQuote({
      ...base,
      projectType: 'system',
      features: ['login', 'admin', 'inventory', 'reports', 'clients'],
    }).custom,
    true,
  );
});

test('V3 basic systems allow only one or two simple business modules', () => {
  for (const features of [
    ['login', 'clients'],
    ['login', 'admin', 'clients', 'inventory'],
  ]) {
    const quote = estimateQuote({ ...base, projectType: 'system', features });
    assert.equal(quote.custom, false);
    assert.equal(quote.min, 800);
    assert.equal(quote.max, 1000);
  }
  assert.equal(
    estimateQuote({ ...base, projectType: 'system', features: ['clients', 'inventory', 'reports'] }).custom,
    true,
  );
  assert.equal(
    estimateQuote({ ...base, projectType: 'system', features: ['clients', 'roles'] }).custom,
    true,
  );
  assert.equal(estimateQuote({ ...base, features: ['einvoice'] }).custom, true);
});

test('package limits and volume rules prevent an irresponsible fixed estimate', () => {
  assert.equal(estimateQuote({ ...base, design: 'premium' }).custom, true);
  assert.equal(estimateQuote({ ...base, projectType: 'catalog', productsRange: '100+' }).custom, true);
  assert.equal(estimateQuote({ ...base, productsRange: '100+' }).custom, false);
  assert.equal(
    estimateQuote({ ...base, otherFunctions: 'Conectar con un software que ya uso' }).custom,
    true,
  );
  const quote = estimateQuote({ ...base, design: 'premium' });
  assert.ok(quote.max >= quote.min);
  assert.ok(quote.thirdPartyCosts.some((item) => /hosting/.test(item)));
});

test('declared budget never determines the calculated price', () => {
  const low = estimateQuote({ ...base, budget: 'under300' });
  const high = estimateQuote({ ...base, budget: '1000+' });
  assert.equal(low.total, high.total);
  assert.equal(low.custom, high.custom);
});

test('configured system limits are shared by the range and the review rule', () => {
  const overrides = { system: 900, 'limit-system': 1200 };
  const basic = estimateQuote({ ...base, projectType: 'system', features: ['clients'] }, overrides);
  assert.equal(basic.min, 900);
  assert.equal(basic.max, 1200);
  const complex = estimateQuote(
    { ...base, projectType: 'system', features: ['clients', 'inventory', 'reports'] },
    overrides,
  );
  assert.match(complex.reasons.join(' '), /900/);
  assert.match(complex.reasons.join(' '), /1,200/);
  assert.equal(
    complex.scope.some((line) => /por definir/.test(line)),
    true,
  );
});

test('manual and unknown feature reviews are explicit centralized rules', () => {
  const payments = estimateQuote({ ...base, features: ['payments'] });
  assert.equal(payments.rulesApplied.includes('manual-feature-review'), true);
  const unknown = estimateQuote({ ...base, features: ['unlisted-integration'] });
  assert.equal(unknown.custom, true);
  assert.equal(unknown.rulesApplied.includes('unknown-feature-review'), true);
});

test('valid admin price overrides apply and invalid values are ignored', () => {
  assert.equal(estimateQuote(base, { landing: 300 }).total, 300);
  assert.equal(estimateQuote(base, { landing: -50 }).total, 200);
  assert.equal(estimateQuote(base, { landing: Number.NaN }).total, 200);
  assert.equal(estimateQuote(base, { landing: Number.POSITIVE_INFINITY }).total, 200);
});
