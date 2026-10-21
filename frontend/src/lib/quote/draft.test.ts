import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anonymousDraftSchema,
  firstInvalidQuoteStep,
  quoteDefaults,
  quoteFormSchema,
  quotePrefillFromSearch,
  restoreAnonymousDraft,
  toAnonymousDraft,
} from './form';

test('anonymous draft explicitly excludes all personal and free-text answers', () => {
  const draft = toAnonymousDraft({
    ...quoteDefaults,
    name: 'Persona de prueba',
    businessName: 'Empresa de prueba',
    email: 'persona@example.com',
    phone: '999888777',
    city: 'Dirección particular',
    problem: 'Texto personal',
    offering: 'Mi negocio personal',
    references: 'Perfil privado',
    marketingConsent: true,
  });
  const serialized = JSON.stringify(draft);
  for (const value of [
    'Persona',
    'Empresa',
    'persona@example',
    '999888777',
    'Dirección',
    'Texto personal',
    'Perfil privado',
    'marketingConsent',
  ])
    assert.equal(serialized.includes(value), false);
  assert.equal(draft.projectType, 'landing');
});
test('tampered drafts cannot smuggle arbitrary text inside option fields', () => {
  assert.equal(
    anonymousDraftSchema.safeParse({
      ...toAnonymousDraft(quoteDefaults),
      features: ['mi-correo@example.com'],
    }).success,
    false,
  );
  assert.equal(
    anonymousDraftSchema.safeParse({ ...toAnonymousDraft(quoteDefaults), budget: 'mi teléfono' }).success,
    false,
  );
});

test('recovering anonymous choices keeps current session text and removes inapplicable features', () => {
  const current = { ...quoteDefaults, businessName: 'Texto de la sesión', offering: 'Productos naturales' };
  const draft = {
    ...toAnonymousDraft(quoteDefaults),
    features: ['information', 'inventory'] as typeof quoteDefaults.features,
  };
  const restored = restoreAnonymousDraft(current, draft);
  assert.equal(restored.businessName, current.businessName);
  assert.equal(restored.offering, current.offering);
  assert.deepEqual(restored.features, ['information']);
  assert.equal(JSON.stringify(toAnonymousDraft(restored)).includes(current.businessName), false);
});

test('full-form validation identifies the earlier step that needs correction', () => {
  const valid = {
    ...quoteDefaults,
    offering: 'Menú del día',
    sector: 'food' as const,
    problem: 'Mostrar el menú',
    privacyAcknowledged: true,
  };
  const edited = quoteFormSchema.safeParse({ ...valid, offering: '' });
  assert.equal(edited.success, false);
  if (!edited.success) assert.equal(firstInvalidQuoteStep(edited.error.flatten().fieldErrors), 1);
  const contact = quoteFormSchema.safeParse({ ...valid, email: 'correo inválido' });
  if (!contact.success) assert.equal(firstInvalidQuoteStep(contact.error.flatten().fieldErrors), 5);
  assert.equal(firstInvalidQuoteStep({}), null);
});

test('confirmed assistant recommendations prefill only compatible anonymous choices', () => {
  const prefill = quotePrefillFromSearch(
    'tipo=catalog&objetivo=products&sector=food&funciones=catalog,whatsapp,inventory,persona@example.com&name=Persona',
  );
  assert.equal(prefill.projectType, 'catalog');
  assert.equal(prefill.sector, 'food');
  assert.deepEqual(prefill.features, ['whatsapp', 'catalog']);
  assert.equal('name' in prefill, false);
  assert.deepEqual(quotePrefillFromSearch('tipo=desconocido&sector=privado&objetivo=telefono'), {});
});
