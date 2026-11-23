import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const temp = await mkdtemp(path.join(tmpdir(), 'tuknex-user-management-'));
Object.assign(process.env, {
  NODE_ENV: 'test', BILLING_MODE: 'local-demo', DATA_DIR: temp, SEED_DEMO_DATA: 'false',
  NEXI_AI_ENABLED: 'false', NEXI_AUDIO_ENABLED: 'false', CONTACT_VERIFICATION_ENABLED: 'false',
  CORS_ORIGINS: 'http://127.0.0.1:3000', RESEND_API_KEY: '', EMAIL_FROM: '', VERIFICATION_SECRET: '',
});
const { Logger } = require('@nestjs/common');
Logger.overrideLogger(false);
const { createApp } = require('../dist/main.js');
const { Database } = require('../dist/database/database.js');
const { provisionAdmin } = require('../dist/auth/private-admin.js');
const { VerificationDelivery } = require('../dist/auth/delivery.js');
const origin = 'http://127.0.0.1:3000';
const password = 'Synthetic-users-password-2026!';
let app, base, checks = 0;
async function call(route, cookie = '', body, expected = body === undefined ? 200 : 201, method = body === undefined ? 'GET' : 'POST') {
  const res = await fetch(base + '/api/' + route, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45000),
  });
  assert.equal(res.status, expected, route + ' ' + (res.status === expected ? '' : await res.clone().text()));
  checks++;
  return { res, cookie: res.headers.get('set-cookie')?.split(';')[0] || '', data: () => res.json() };
}
const newAccount = (name, email, role = 'client', extra = {}) => ({ name, email, role, password, ...extra });
try {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const db = app.get(Database);
  const principal = await provisionAdmin(db, { name: 'Principal QA', email: 'owner-users@example.test', password });
  await assert.rejects(() => provisionAdmin(db, { name: 'Duplicate principal', email: 'other-owner-users@example.test', password }));
  checks++;
  const owner = await call('auth/login', '', { email: principal.email, password });
  const ownerUser = (await owner.data()).user;
  assert.equal(ownerUser.isOwner, true);
  checks++;

  await call('auth/users', '', undefined, 401);
  await call('auth/users', '', newAccount('Forbidden Guest', 'guest-users@example.test'), 401);
  const created = {};
  for (const role of ['client', 'subadmin', 'admin']) {
    const response = await call('auth/users', owner.cookie, newAccount('Created ' + role, role + '-users@example.test', role));
    const user = await response.data();
    assert.equal(user.role, role);
    assert.equal(user.active, true);
    assert.equal(user.isOwner, false);
    assert.equal(response.cookie, '', 'Creating an account must not replace the operator session.');
    assert.ok(!JSON.stringify(user).includes('password'));
    assert.ok(!JSON.stringify(user).includes('scrypt'));
    assert.equal(Boolean(user.clientId), role === 'client');
    const loggedIn = await call('auth/login', '', { email: user.email, password });
    assert.equal((await loggedIn.data()).user.id, user.id);
    created[role] = { ...user, cookie: loggedIn.cookie };
    checks += 8;
  }
  assert.equal((await (await call('auth/me', owner.cookie)).data()).id, principal.id);
  checks++;
  for (const role of ['client', 'subadmin', 'admin']) {
    const actor = created[role];
    await call('auth/users', actor.cookie, newAccount('Forbidden ' + role, 'forbidden-' + role + '@example.test'), 403);
    await call('auth/users/' + created.client.id + '/status', actor.cookie, { active: false }, 403, 'PATCH');
    await call('auth/users/' + created.client.id + '/invitation', actor.cookie, {}, 403);
  }
  await call('auth/users', created.client.cookie, undefined, 403);
  await call('auth/users', created.subadmin.cookie, undefined, 403);
  await call('billing/state', created.admin.cookie);
  await call('team/members', created.admin.cookie, newAccount('Forbidden staff', 'forbidden-staff@example.test', 'subadmin'), 403);

  const count = async table => (await db.query('SELECT count(*)::int AS n FROM ' + table)).rows[0].n;
  const beforeDuplicate = await count('clientes');
  await call('auth/users', owner.cookie, newAccount('Duplicate email', '  CLIENT-USERS@EXAMPLE.TEST  '), 409);
  assert.equal(await count('clientes'), beforeDuplicate, 'Duplicate account must not leave an orphan client record.');
  checks++;
  await call('auth/users', owner.cookie, newAccount('Bad role', 'bad-role@example.test', 'owner'), 400);
  await call('auth/users', owner.cookie, newAccount('Bad password', 'bad-password@example.test', 'client', { password: 'short' }), 400);
  await call('auth/users', owner.cookie, newAccount('Bad privilege', 'bad-privilege@example.test', 'admin', { isOwner: true }), 400);

  const crm = await (await call('billing/clients', owner.cookie, {
    name: 'Existing commercial customer', taxId: '', phone: '', email: 'existing-client@example.test', address: '', isDemo: false,
  })).data();
  const beforeLink = await count('clientes');
  const linked = await (await call('auth/users', owner.cookie, newAccount('Linked portal user', 'linked-user@example.test', 'client', { clientId: crm.id }))).data();
  assert.equal(linked.clientId, crm.id);
  assert.equal(await count('clientes'), beforeLink, 'Explicit linking must reuse the selected client.');
  checks += 2;
  await call('auth/users', owner.cookie, newAccount('Already linked', 'already-linked@example.test', 'client', { clientId: crm.id }), 409);
  await call('auth/users', owner.cookie, newAccount('Invalid relation', 'invalid-relation@example.test', 'admin', { clientId: crm.id }), 400);

  const publicInput = { name: 'Public privilege attempt', email: 'public-privilege@example.test', password, phone: '900000041', dni: '00000041', privacyConsent: true };
  await call('auth/register', '', { ...publicInput, role: 'admin' }, 400);
  await call('auth/register', '', { ...publicInput, isOwner: true }, 400);
  await call('auth/users/' + principal.id + '/status', owner.cookie, { active: false }, 403, 'PATCH');
  await call('auth/users/' + created.client.id + '/status', owner.cookie, { active: 'false' }, 400, 'PATCH');
  await call('auth/users/' + randomUUID() + '/status', owner.cookie, { active: false }, 404, 'PATCH');

  await call('auth/users/' + created.client.id + '/status', owner.cookie, { active: false }, 200, 'PATCH');
  assert.equal((await db.query('SELECT count(*)::int n FROM sesiones WHERE usuario_id=$1', [created.client.id])).rows[0].n, 0);
  checks++;
  await call('auth/me', created.client.cookie, undefined, 401);
  await call('auth/login', '', { email: created.client.email, password }, 401);
  await call('auth/users/' + created.client.id + '/status', owner.cookie, { active: true }, 200, 'PATCH');
  await call('auth/me', created.client.cookie, undefined, 401);
  const restored = await call('auth/login', '', { email: created.client.email, password });
  assert.equal((await restored.data()).user.id, created.client.id);
  checks++;
  await call('auth/users/' + created.subadmin.id + '/status', owner.cookie, { active: false }, 200, 'PATCH');
  await call('team/dashboard', created.subadmin.cookie, undefined, 401);

  const unavailable = await call('auth/users/' + linked.id + '/invitation', owner.cookie, {}, 503);
  assert.match((await unavailable.data()).message, /correo|configurado/i);
  assert.equal(await count('verificaciones'), 0, 'A disabled delivery provider must not pretend to send a code.');
  checks += 2;
  // Replace the delivery adapter in this isolated app: no provider network request is made.
  const delivery = app.get(VerificationDelivery);
  const sent = [];
  process.env.VERIFICATION_SECRET = 'Synthetic-verification-secret-for-users-only-2026';
  delivery.emailAvailable = () => true;
  delivery.email = async (to, code, id, recovery) => {
    sent.push({ to, code, recovery });
    return 'synthetic-provider-' + id;
  };
  const linkedSession = await call('auth/login', '', { email: linked.email, password });
  const invitation = await (await call('auth/users/' + linked.id + '/invitation', owner.cookie, {})).data();
  assert.equal(invitation.accepted, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, linked.email);
  assert.equal(sent[0].recovery, true);
  assert.match(sent[0].code, /^\d{6}$/);
  assert.ok(!JSON.stringify(invitation).includes(sent[0].code));
  const changedPassword = 'Synthetic-new-chosen-password-2026!';
  await call('auth/recovery/confirm', '', { email: linked.email, code: sent[0].code, password: changedPassword });
  await call('auth/me', linkedSession.cookie, undefined, 401);
  await call('auth/login', '', { email: linked.email, password }, 401);
  const chosenLogin = await (await call('auth/login', '', { email: linked.email, password: changedPassword })).data();
  assert.equal(chosenLogin.user.id, linked.id);
  const accessAudit = (await db.query('SELECT * FROM auditoria WHERE entidad_id=$1', [linked.id])).rows;
  assert.ok(accessAudit.some(row => row.accion === 'acceso_por_correo_solicitado' && row.actor_id === principal.id));
  assert.ok(!JSON.stringify(accessAudit).includes(sent[0].code));
  assert.ok(!JSON.stringify(accessAudit).includes(changedPassword));
  checks += 10;
  const users = await (await call('auth/users', owner.cookie)).data();
  assert.equal(users.filter(user => user.isOwner).length, 1);
  assert.equal(users.find(user => user.id === created.subadmin.id).active, false);
  assert.equal(users.find(user => user.id === linked.id).clientId, crm.id);
  assert.ok(!JSON.stringify(users).includes('password'));
  checks += 4;
  const audit = (await db.query('SELECT * FROM auditoria WHERE entidad_id=$1 ORDER BY created_at', [created.client.id])).rows;
  assert.ok(audit.length >= 3, 'Create, suspend and reactivate must be audited.');
  assert.ok(audit.every(row => row.actor_id === principal.id));
  assert.ok(!JSON.stringify(audit).includes(password));
  assert.ok(!JSON.stringify(audit).includes('scrypt'));
  checks += 4;
  console.log(JSON.stringify({ result: 'PASS', checks, realEmails: 0, realProviderCalls: 0 }));
} finally {
  if (app) await app.close();
  const resolved = path.resolve(temp);
  assert.ok(resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('tuknex-user-management-'));
  await rm(resolved, { recursive: true, force: true });
}
