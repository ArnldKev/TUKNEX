import assert from 'node:assert/strict';
import test from 'node:test';
import { guidedAssistantProvider, recommendationUrl } from './guided-provider';

test('restaurant menu and WhatsApp recommends a catalog, without sending or navigating', async () => {
  const reply = await guidedAssistantProvider.respond({
    message: 'Tengo un restaurante y quiero que vean el menú y pidan por WhatsApp',
    history: [],
  });
  assert.equal(reply.recommendation?.projectType, 'catalog');
  assert.equal(reply.recommendation?.features.includes('payments'), false);
  assert.match(recommendationUrl(reply.recommendation!), /^\/cotizar\?tipo=catalog/);
  assert.equal(reply.mode, 'guided-demo');
});
test('knowledge and unknown topics are honest guided responses', async () => {
  const knowledge = await guidedAssistantProvider.respond({
    message: '¿Qué es dominio y hosting?',
    history: [],
  });
  assert.equal(knowledge.intent, 'knowledge');
  assert.match(knowledge.content, /dirección/);
  const unknown = await guidedAssistantProvider.respond({
    message: 'Pronostica el clima de mañana',
    history: [],
  });
  assert.equal(unknown.intent, 'fallback');
});
test('assistant price references respect configured rules', async () => {
  const reply = await guidedAssistantProvider.respond({
    message: '¿Cuánto cuesta?',
    history: [],
    prices: { landing: 280 },
  });
  assert.match(reply.content, /280/);
});

test('explicit online payments take precedence over the restaurant catalog shortcut', async () => {
  const reply = await guidedAssistantProvider.respond({
    message: 'Tengo un restaurante, quiero mostrar el menú y cobrar online con tarjeta',
    history: [],
  });
  assert.equal(reply.recommendation?.projectType, 'store');
  const simple = await guidedAssistantProvider.respond({
    message: 'Tengo un restaurante y quiero mostrar el menú por WhatsApp, no quiero pagos online',
    history: [],
  });
  assert.equal(simple.recommendation?.projectType, 'catalog');
});

test('follow-up guidance uses session context without turning a timing question into pricing', async () => {
  const history = [{ role: 'user' as const, content: 'Tengo un restaurante y quiero mostrar el menú' }];
  const followUp = await guidedAssistantProvider.respond({ message: 'Y que pidan por WhatsApp', history });
  assert.equal(followUp.recommendation?.projectType, 'catalog');
  const time = await guidedAssistantProvider.respond({ message: '¿Cuánto tiempo demora?', history });
  assert.equal(time.intent, 'knowledge');
  assert.match(time.content, /días hábiles/);
});

test('uncertain visitors get a clarifying question and internal-process needs stay systems', async () => {
  const uncertain = await guidedAssistantProvider.respond({ message: 'No sé qué web necesito', history: [] });
  assert.equal(uncertain.recommendation, undefined);
  assert.match(uncertain.content, /¿Quieres/);
  const system = await guidedAssistantProvider.respond({
    message: 'Necesito controlar inventario y recibir avisos por WhatsApp',
    history: [],
  });
  assert.equal(system.recommendation?.projectType, 'system');
});

test('recommendation links transfer only known anonymous option IDs', () => {
  const url = recommendationUrl({
    projectType: 'catalog',
    goal: 'products',
    features: ['catalog', 'persona@example.com'],
    reason: 'Texto privado que no debe ir en la URL',
  });
  assert.equal(url.includes('persona'), false);
  assert.equal(url.includes('privado'), false);
  assert.equal(new URL(url, 'https://demo.test').searchParams.get('funciones'), 'catalog');
});
