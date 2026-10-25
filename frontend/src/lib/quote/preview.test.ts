import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSolutionPreview,
  filterPreviewProducts,
  initialPreviewInteraction,
  previewContrast,
  previewInteractionReducer,
  resolvePreviewPalette,
} from './preview';

const base = {
  projectType: 'landing' as const,
  features: ['information', 'whatsapp', 'contact'],
  design: 'essential' as const,
};

test('preview reflects business, sector, offering, headline, style and color without mutating answers', () => {
  const input = { ...base, features: [...base.features] };
  const before = JSON.stringify(input);
  const context = {
    sector: 'food',
    offering: 'Café, postres, desayunos',
    goal: 'orders',
    stylePreference: 'elegant',
    colorsLiked: 'verde',
    firstImpression: 'Un café para tus buenos momentos.',
  };
  const model = buildSolutionPreview(input, '  Café del Bosque  ', context);
  assert.equal(model.businessName, 'Café del Bosque');
  assert.equal(model.sector, 'food');
  assert.equal(model.hero.title, context.firstImpression);
  assert.equal(model.hero.description, context.offering);
  assert.equal(model.hero.cta, 'Preparar una consulta');
  assert.equal(model.style, 'elegant');
  assert.equal(model.palette.name, 'Verde');
  assert.deepEqual(model.offerings, ['Café', 'postres', 'desayunos']);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(buildSolutionPreview(input, '  Café del Bosque  ', context), model);
});

test('switching project type produces a different structure and only selected system modules', () => {
  const website = buildSolutionPreview(base);
  const catalog = buildSolutionPreview(
    { ...base, projectType: 'catalog', features: ['catalog', 'search'] },
    'Tienda Activa',
    { offering: 'Ropa deportiva y zapatillas' },
  );
  const system = buildSolutionPreview({
    ...base,
    projectType: 'system',
    features: ['login', 'admin', 'clients', 'inventory', 'clients', 'unknown'],
  });
  assert.equal(website.kind, 'web');
  assert.equal(catalog.kind, 'catalog');
  assert.equal(catalog.sector, 'sports');
  assert.ok(catalog.products.some((product) => /deportiva|Zapatilla/.test(product.name)));
  assert.equal(system.kind, 'system');
  assert.deepEqual(
    system.modules.map((module) => module.id),
    ['clients', 'inventory'],
  );
  assert.equal(system.featureLabels.length, 4);
  assert.equal(system.featureLabels.includes('unknown'), false);
  assert.match(system.disclaimer, /orientativa/);
});

test('palettes accept semantic names and hex while keeping readable text and rejecting CSS values', () => {
  for (const color of [
    'turquesa',
    'azul',
    'verde',
    'cálido',
    '#fff',
    '#000000',
    '#777777',
    '#ffff00',
    '#123abc',
  ]) {
    const palette = resolvePreviewPalette(color);
    assert.match(palette.accent, /^#[0-9a-f]{6}$/);
    assert.ok(previewContrast(palette.accent, palette.onAccent) >= 4.5, color);
    assert.ok(previewContrast(palette.accentText, '#ffffff') >= 4.5, color);
    assert.ok(previewContrast(palette.accentText, palette.surface) >= 4.5, color);
    assert.ok(previewContrast(palette.accentText, '#fffdf9') >= 4.5, color);
  }
  assert.equal(resolvePreviewPalette('#ABC').accent, '#aabbcc');
  assert.equal(resolvePreviewPalette('url(javascript:example)').accent, resolvePreviewPalette().accent);
  assert.equal(resolvePreviewPalette('#1234567').accent, resolvePreviewPalette().accent);
});

test('preview uses safe placeholders, bounded copy and no contact or pricing data', () => {
  const input = { ...base, email: 'private@example.com', phone: '+51 987654321', budget: '1000+' };
  const model = buildSolutionPreview(input, ' ', { sector: 'toString', firstImpression: 'x'.repeat(300) });
  assert.equal(model.businessName, 'Tu negocio');
  assert.equal(model.sector, 'other');
  assert.ok(model.hero.title.length <= 100);
  const serialized = JSON.stringify(model);
  assert.equal(serialized.includes(input.email), false);
  assert.equal(serialized.includes(input.phone), false);
  assert.equal(serialized.includes(input.budget), false);
});

test('catalog search supports accents and categories and respects the selected search feature', () => {
  const model = buildSolutionPreview(
    { ...base, projectType: 'catalog', features: ['catalog', 'search'] },
    '',
    { sector: 'food' },
  );
  assert.deepEqual(
    filterPreviewProducts(model, 'CAFE').map((product) => product.name),
    ['Café de especialidad'],
  );
  assert.equal(filterPreviewProducts(model, '', 'Más opciones').length, 2);
  assert.equal(filterPreviewProducts(model, 'no existe').length, 0);
  const basic = buildSolutionPreview({ ...base, projectType: 'catalog', features: ['catalog'] });
  assert.equal(filterPreviewProducts(basic, 'ignored query').length, 4);
});

test('prototype interactions change only local demo state and remain bounded', () => {
  const initial = initialPreviewInteraction();
  let state = previewInteractionReducer(initial, { type: 'quantity', id: 'food-0', delta: 50 });
  assert.equal(state.selection['food-0'], 9);
  state = previewInteractionReducer(state, { type: 'quantity', id: 'food-0', delta: -50 });
  assert.equal(state.selection['food-0'], 0);
  state = previewInteractionReducer(state, { type: 'day', value: 14 });
  assert.equal(state.day, 14);
  assert.match(state.notice, /No se realiza una reserva/);
  state = previewInteractionReducer(state, { type: 'row', id: 'row-1' });
  assert.ok(state.reviewed.includes('row-1'));
  state = previewInteractionReducer(state, { type: 'row', id: 'row-1' });
  assert.equal(state.reviewed.length, 0);
  for (let i = 0; i < 8; i++) state = previewInteractionReducer(state, { type: 'create' });
  assert.equal(state.created, 4);
  assert.deepEqual(previewInteractionReducer(state, { type: 'reset' }), initial);
  assert.equal(initial.created, 0);
});

test('interaction identity resets for structural changes while text and theme preserve demo state', () => {
  const initial = buildSolutionPreview({ ...base, features: ['contact', 'bookings'] }, 'Uno', {
    sector: 'food',
  });
  const edited = buildSolutionPreview({ ...base, features: ['bookings', 'contact'] }, 'Dos', {
    sector: 'food',
    colorsLiked: 'azul',
    firstImpression: 'Nuevo titular',
  });
  const removedBooking = buildSolutionPreview({ ...base, features: ['contact'] }, 'Uno', { sector: 'food' });
  const changedType = buildSolutionPreview(
    { ...base, projectType: 'business', features: ['contact', 'bookings'] },
    'Uno',
    { sector: 'food' },
  );
  assert.equal(initial.key, edited.key);
  assert.notEqual(initial.key, removedBooking.key);
  assert.notEqual(initial.key, changedType.key);
});
