import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pageMetadata, PUBLIC_SITE_ROUTES, ROUTE_SEO } from './seo';

const origin = 'https://tuknex.netlify.app';
test('public routes have distinct descriptive titles, descriptions and matching social cards', () => {
  const titles = new Set<string>(), descriptions = new Set<string>();
  for (const route of PUBLIC_SITE_ROUTES) {
    const meta = pageMetadata(route, origin);
    assert.equal(meta.title, ROUTE_SEO[route].title);
    assert.ok(meta.description && meta.description.length >= 60);
    assert.equal(meta.openGraph?.title, meta.title);
    assert.equal(meta.openGraph?.description, meta.description);
    assert.equal(meta.twitter?.title, meta.title);
    assert.equal(meta.twitter?.description, meta.description);
    assert.equal(meta.alternates?.canonical, new URL(route, origin).href);
    const robots = meta.robots;
    assert.ok(robots && typeof robots === 'object');
    assert.equal(robots.index, true);
    titles.add(String(meta.title));descriptions.add(meta.description);
  }
  assert.equal(titles.size, PUBLIC_SITE_ROUTES.length);
  assert.equal(descriptions.size, PUBLIC_SITE_ROUTES.length);
});

test('auth and private workspaces remain noindex and excluded from the public sitemap inventory', () => {
  for (const route of ['/acceder','/registro','/recuperar-acceso','/admin','/equipo','/mi-cuenta'] as const) {
    assert.ok(!PUBLIC_SITE_ROUTES.includes(route));
    const robots = pageMetadata(route, origin).robots;
    assert.ok(robots && typeof robots === 'object');
    assert.equal(robots.index, false);assert.equal(robots.follow, false);
  }
});

test('canonical and social URLs never carry input query strings or route-specific customer data', () => {
  const meta = pageMetadata('/cotizar', origin + '/?inicio=guiado&nombre=PersonaPrivada');
  const serialized = JSON.stringify(meta);
  assert.equal(meta.alternates?.canonical, origin + '/cotizar');
  assert.equal(meta.openGraph?.url, origin + '/cotizar');
  for (const privateValue of ['PersonaPrivada','inicio=','nombre=']) assert.ok(!serialized.includes(privateValue));
});

test('guided assistant is indexable but is not advertised as a generative chatbot', () => {
  assert.ok(PUBLIC_SITE_ROUTES.includes('/asistente'));
  assert.match(String(pageMetadata('/asistente', origin).description), /chat demostrativo responde con opciones guiadas/);
});

test('quote and projects have suitable social images backed by existing public files', () => {
  const quote = pageMetadata('/cotizar', origin), projects = pageMetadata('/proyectos', origin);
  const quotesImage = quote.openGraph?.images, projectsImage = projects.openGraph?.images;
  assert.ok(Array.isArray(quotesImage) && Array.isArray(projectsImage));
  assert.notDeepEqual(quotesImage, projectsImage);
  for (const [image] of [quotesImage, projectsImage]) {
    assert.ok(image && typeof image === 'object' && 'url' in image);
    const path = new URL(image.url).pathname;
    assert.ok(existsSync('public' + path), path);
  }
});

test('metadata does not invent a production hostname when no public site URL is configured', () => {
  const meta = pageMetadata('/cotizar', '');
  assert.equal(meta.metadataBase, undefined);assert.equal(meta.alternates, undefined);
  assert.ok(!JSON.stringify(meta).includes('localhost'));
});
