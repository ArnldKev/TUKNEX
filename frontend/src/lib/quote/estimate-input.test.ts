import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { quoteService } from './service';
import { quoteDefaults } from './form';
import { estimateQuote } from '../pricing';

test('browser estimate sends only pricing choices and presence of extra requirements', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); });
  let sent: unknown;
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, options?: RequestInit) => {
    sent = JSON.parse(String(options?.body));
    return Response.json({ ...estimateQuote(quoteDefaults), currency: 'PEN', version: '3.0' });
  });
  const values = { ...quoteDefaults, name: 'Persona privada', email: 'privado@example.test', phone: '999888777', offering: 'Texto confidencial', otherFunctions: 'Integrar sistema secreto' };
  await quoteService.calculate(values);
  assert.deepEqual(sent, { projectType: 'landing', features: ['information', 'whatsapp', 'contact'], design: 'essential', timeline: 'standard', productsRange: '1-20', userRange: '1-2', hasOtherFunctions: true });
});

test('minimal estimate rejects identity, free text, arbitrary fields and invalid choices', async () => {
  const { minimalEstimateSchema, toMinimalEstimateInput } = await import('./estimate-input');
  const valid = toMinimalEstimateInput(quoteDefaults);
  for (const field of ['name', 'email', 'phone', 'offering', 'otherFunctions', 'project', 'price', 'budget', 'paymentPreference']) {
    assert.equal(minimalEstimateSchema.safeParse({ ...valid, [field]: 'private' }).success, false, field);
  }
  for (const patch of [{ features: ['free text'] }, { projectType: 'private' }, { productsRange: 'private' }, { userRange: 'private' }, { hasOtherFunctions: 'true' }]) {
    assert.equal(minimalEstimateSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});

test('minimal estimate preserves complete pricing results across packages and complexity rules', async () => {
  const { toMinimalEstimateInput, estimateInputToPricing } = await import('./estimate-input');
  const types = ['landing', 'business', 'catalog', 'store', 'system', 'redesign'] as const;
  const featureSets = [[], ['gallery'], ['catalog', 'search', 'variations'], ['clients', 'inventory'], ['clients', 'inventory', 'reports'], ['payments', 'roles', 'integrations']] as const;
  for (const projectType of types) for (const features of featureSets) for (const design of ['essential', 'custom', 'premium'] as const) for (const timeline of ['standard', 'urgent'] as const) for (const productsRange of ['none', '1-20', '100+'] as const) for (const userRange of ['1-2', '6+'] as const) for (const otherFunctions of ['', '   ', 'Necesidad privada']) {
    const input = { ...quoteDefaults, projectType, features: [...features], design, timeline, productsRange, userRange, otherFunctions };
    const overrides: Record<string, number>[] = [{}, { landing: 275, system: 900, 'urgent-percent': 35, 'limit-system': 1200 }];
    for (const prices of overrides) {
      assert.deepEqual(estimateQuote(estimateInputToPricing(toMinimalEstimateInput(input)), prices), estimateQuote(input, prices));
    }
  }
  const basic = estimateQuote(estimateInputToPricing(toMinimalEstimateInput(quoteDefaults)));
  assert.deepEqual([basic.min, basic.max, basic.custom], [200, 240, false]);
  const urgent = estimateQuote(estimateInputToPricing(toMinimalEstimateInput({ ...quoteDefaults, features: ['gallery'], design: 'custom', timeline: 'urgent' })));
  assert.deepEqual([urgent.total, urgent.custom], [420, true]);
});

test('minimal estimate modules stay identical across browser and server', async () => {
  const [frontend, backend] = await Promise.all([
    readFile(new URL('./estimate-input.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../../backend/src/domain/quote/estimate-input.ts', import.meta.url), 'utf8'),
  ]);
  assert.equal(frontend, backend);
});


