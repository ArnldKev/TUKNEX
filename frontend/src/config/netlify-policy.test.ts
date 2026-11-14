import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('netlify.toml', 'utf8');
const rules = config.split('[[headers]]').slice(1).map(block => ({
  path: block.match(/^\s*for\s*=\s*"([^"]+)"/m)?.[1],
  values: Object.fromEntries([...block.matchAll(/^\s*"([^"]+)"\s*=\s*"([^"]*)"/gm)].map(match => [match[1],match[2]])),
}));
const general = rules.find(rule => rule.path === '/*')?.values;
const assets = rules.find(rule => rule.path === '/_next/static/*')?.values;

test('static HTML protection starts with a compatible report-only CSP and an embedding defense', () => {
  assert.ok(general);
  assert.equal(general['Content-Security-Policy'], undefined, 'do not prematurely enforce an unvalidated full policy');
  assert.equal(general['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(general['X-Content-Type-Options'], 'nosniff');
  assert.equal(general['Referrer-Policy'], 'strict-origin-when-cross-origin');
  const csp = general['Content-Security-Policy-Report-Only'];
  assert.ok(csp);
  const directives = Object.fromEntries(csp.split(';').map(value => value.trim().split(/\s+/)).map(([key,...values])=>[key,values]));
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'self'"]);
  assert.deepEqual(directives['frame-src'], ["'self'", 'blob:', 'https://el-gringo-jym.netlify.app', 'https://corry-sport.netlify.app']);
  assert.ok(directives['script-src'].includes("'unsafe-inline'"), 'Next static hydration remains available during report-only evaluation');
  assert.deepEqual(directives['font-src'], ["'self'"]);
  assert.ok(directives['media-src'].includes('blob:'), 'local audio preview remains available');
  assert.ok(directives['connect-src'].includes('https://tuknex-backend.onrender.com'));
  assert.ok(!csp.includes('https://api.groq.com'), 'the browser does not call Groq with credentials');
  assert.ok(!csp.includes('*'), 'avoid blanket external origins');
});

test('microphone remains available to same-origin dictation without granting camera or location', () => {
  assert.ok(general);
  assert.match(general['Permissions-Policy'], /microphone=\(self\)/);
  for (const feature of ['camera','geolocation','payment']) assert.ok(general['Permissions-Policy'].includes(feature+'=()'));
});

test('only versioned Next assets get public immutable caching; API and HTML are not made public-cacheable', () => {
  assert.equal(assets?.['Cache-Control'], 'public,max-age=31536000,immutable');
  assert.equal(general?.['Cache-Control'], undefined);
  const cached = rules.filter(rule=>rule.values['Cache-Control']);
  assert.deepEqual(cached.map(rule=>rule.path), ['/_next/static/*']);
  assert.match(config, /from = "\/api\/\*"[\s\S]*?to = "https:\/\/tuknex-backend\.onrender\.com\/api\/:splat"[\s\S]*?status = 200[\s\S]*?force = true/);
});
