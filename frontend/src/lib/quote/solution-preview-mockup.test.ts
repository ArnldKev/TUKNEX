import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SolutionPreviewMockup } from '../../components/quote/solution-preview-mockup';
import { buildSolutionPreview, initialPreviewInteraction } from './preview';

const input = { projectType: 'catalog' as const, features: ['catalog', 'whatsapp', 'bookings', 'gallery'], design: 'essential' as const };
const model = buildSolutionPreview(input, 'Café Prado', { sector: 'food', offering: 'Café, postres, desayunos', stylePreference: 'elegant' });
function render(section: string, expanded = true) {
  return renderToStaticMarkup(createElement(SolutionPreviewMockup, { model, state: { ...initialPreviewInteraction(), section }, onAction: () => {}, expanded }));
}

test('preview destinations render distinct content, with a full home and a separate interactive catalog', () => {
  const home = render('inicio'), catalog = render('products'), business = render('about'), contact = render('contact'), bookings = render('bookings');
  assert.match(home, /lp-home-offering/);
  assert.match(home, /lp-home-about/);
  assert.match(home, /lp-home-next/);
  assert.doesNotMatch(home, /lp-product-actions/);
  assert.match(catalog, /lp-product-actions/);
  assert.doesNotMatch(catalog, /lp-home-offering/);
  assert.match(business, /lp-brand-card/);
  assert.match(business, /Café Prado/);
  assert.match(business, /lp-gallery-page/);
  assert.match(contact, /Probar acceso a WhatsApp/);
  assert.doesNotMatch(contact, /<form|<input/);
  assert.match(bookings, /Calendario de demostración/);
  assert.equal([home, catalog, business, contact, bookings].every(markup => !/Iniciar sesión|Pagar ahora|<form/.test(markup)), true);
});

test('removed or unknown destinations resolve to the current home rather than exposing unselected features', () => {
  const minimal = buildSolutionPreview({ ...input, features: ['catalog'] });
  for (const section of ['bookings', 'contact', 'gallery', 'payments', 'unknown']) {
    const markup = renderToStaticMarkup(createElement(SolutionPreviewMockup, { model: minimal, state: { ...initialPreviewInteraction(), section }, onAction: () => {}, expanded: true }));
    assert.match(markup, /lp-web-hero/);
    assert.doesNotMatch(markup, /lp-calendar-days|lp-contact-example|lp-gallery-page/);
  }
});

test('the PDF and browser derive the same canonical preview model', () => {
  const browser = readFileSync(new URL('./preview.ts', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../../../../backend/src/domain/quote/preview.ts', import.meta.url), 'utf8');
  assert.equal(server, browser);
});
