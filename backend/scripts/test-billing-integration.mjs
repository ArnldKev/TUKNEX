import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve('.local-data'),
  temporary = path.join(root, 'billing-test-' + randomUUID());
process.env.BILLING_MODE = 'local-demo';
process.env.SEED_DEMO_DATA = 'true';
process.env.ADMIN_SETUP_TOKEN = 'integration-setup-key-for-temporary-database';
process.env.DATA_DIR = temporary;
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
await mkdir(root, { recursive: true });
const { Logger } = require('@nestjs/common');
Logger.overrideLogger(false);
const { createApp } = require('../dist/main.js');
const { PDFDocument, PDFName } = require('pdf-lib');
const { Database } = require('../dist/database/database.js');
const { quoteDefaults } = require('../dist/domain/quote/form.js');
let app,
  token = '',
  base = '',
  checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
async function call(route, body, expected = 200, method = body === undefined ? 'GET' : 'POST', auth = true) {
  const response = await fetch(base + '/api/' + route, {
    signal: AbortSignal.timeout(30000),
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status !== expected)
    throw new Error(
      route + ': expected ' + expected + ', got ' + response.status + ' ' + (await response.text()),
    );
  const sessionCookie = response.headers.get('set-cookie')?.match(/tuknex_session=([^;]+)/)?.[1];
  if (sessionCookie) token = sessionCookie;
  checks++;
  if (process.env.QA_VERBOSE) console.log(method, route, response.status);
  return response;
}
async function state() {
  return (await call('billing/state')).json();
}
const clientBody = {
  name: 'Cliente QA · Demo',
  taxId: '00000000',
  phone: '',
  email: '',
  address: 'Dirección de ejemplo',
  isDemo: true,
};
try {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  check((await (await fetch(base + '/health')).json()).status === 'ok', 'health check');
  await call('auth/setup-admin', {name:'Administrador QA',email:'admin@demo.tuknex',password:'QA-Demo123!-secure',setupToken:process.env.ADMIN_SETUP_TOKEN},201);
  token = '';
  await call('billing/state', undefined, 401, 'GET', false);
  await call('auth/login', { email: 'admin@demo.tuknex', password: 'incorrecta' }, 401);
  await call('auth/login', { email: 'admin@demo.tuknex', password: 'QA-Demo123!-secure' }, 201);
  let data = await state();
  check(data.clients.length === 2 && data.quotes.length === 2, 'seed is idempotent');
  await call('billing/clients', { ...clientBody, taxId: '123' }, 400);
  const client = await (await call('billing/clients', clientBody, 201)).json();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const quoteBody = {
    clientId: client.id,
    projectName: 'Proyecto QA',
    service: 'catalog',
    scope: 'Catálogo y contacto, datos de prueba.',
    observations: 'Sin efecto comercial.',
    conditions: 'Acuerdo de prueba.',
    delivery: '15 días',
    baseCents: 25000,
    plan: { mode: 'weekly', rate: 8, count: 6, firstDueDate: '2026-01-31' },
    status: 'draft',
    issuedDate: today,
    validUntil: '2099-01-31',
    isDemo: true,
  };
  const quote = await (await call('billing/quotes', quoteBody, 201)).json();
  check(quote.totalCents === 27000, 'single surcharge');
  await call('billing/quotes/' + quote.id + '/contract', {}, 409);
  const otherClient = await (
    await call('billing/clients', { ...clientBody, name: 'Otro cliente QA · Demo' }, 201)
  ).json();
  await call('billing/quotes/' + quote.id, { ...quoteBody, clientId: otherClient.id }, 200, 'PATCH');
  check(
    (await app.get(Database).query('SELECT cliente_id FROM cotizaciones WHERE id=$1', [quote.id])).rows[0]
      .cliente_id === otherClient.id,
    'quote edit updates relational client foreign key',
  );
  await call('billing/quotes/' + quote.id, quoteBody, 200, 'PATCH');
  await call('billing/quotes/' + quote.id + '/accept', {}, 201);
  const contract = await (await call('billing/quotes/' + quote.id + '/contract', {}, 201)).json();
  const again = await (await call('billing/quotes/' + quote.id + '/contract', {}, 201)).json();
  check(contract.id === again.id, 'conversion is idempotent');
  data = await state();
  let items = data.installments.filter((i) => i.contractId === contract.id);
  check(
    items.length === 6 && items.reduce((s, i) => s + i.amountCents, 0) === 27000,
    'installments sum exactly',
  );
  check(
    items.every((i) => i.status === 'vencida'),
    'overdue dates are derived',
  );
  const payBody = {
    installmentId: items[0].id,
    amountCents: 1000,
    date: today,
    method: 'efectivo',
    reference: 'QA-1',
    observation: 'Prueba parcial',
    idempotencyKey: randomUUID(),
  };
  const parallel = await Promise.all([
    call('billing/contracts/' + contract.id + '/payments', payBody, 201),
    call('billing/contracts/' + contract.id + '/payments', payBody, 201),
  ]);
  const responses = await Promise.all(parallel.map((r) => r.json()));
  check(responses[0].id === responses[1].id, 'concurrent retry creates only one payment');
  const payment = responses[0];
  const replay = await (await call('billing/contracts/' + contract.id + '/payments', payBody, 201)).json();
  check(payment.id === replay.id && replay.replayed, 'payment retry cannot double charge');
  await call('billing/contracts/' + contract.id + '/payments', { ...payBody, amountCents: 2000 }, 409);
  await call(
    'billing/contracts/' + contract.id + '/payments',
    { ...payBody, amountCents: 999999, idempotencyKey: randomUUID() },
    400,
  );
  await call(
    'billing/contracts/' + contract.id + '/payments',
    { ...payBody, date: '2099-01-01', idempotencyKey: randomUUID() },
    400,
  );
  await call(
    'billing/contracts/' + contract.id + '/payments',
    { ...payBody, installmentId: randomUUID(), idempotencyKey: randomUUID() },
    400,
  );
  data = await state();
  items = data.installments.filter((i) => i.contractId === contract.id);
  check(items[0].paidCents === 1000 && items[0].remainingCents === 3500, 'partial payment balance');
  const contractBody = {
    clientId: client.id,
    quoteId: quote.id,
    projectId: contract.projectId,
    projectName: contract.projectName,
    service: contract.service,
    scope: contract.scope,
    observations: contract.observations,
    conditions: contract.conditions,
    issuedDate: contract.issuedDate,
    startDate: contract.startDate,
    deliveryDate: contract.deliveryDate,
    baseCents: contract.baseCents,
    plan: contract.plan,
    isDemo: true,
    version: contract.version,
  };
  await call('billing/contracts/' + contract.id, contractBody, 409, 'PATCH');
  await call(
    'billing/payments/' + payment.id + '/void',
    { reason: 'Corrección del registro de prueba' },
    201,
  );
  data = await state();
  check(
    data.installments.filter((i) => i.contractId === contract.id).every((i) => i.paidCents === 0),
    'void restores balance while preserving history',
  );
  check(
    data.payments.some((p) => p.id === payment.id && p.voided),
    'void is audited instead of deletion',
  );
  await call('billing/contracts/' + contract.id, contractBody, 409, 'PATCH');
  const invalidUpload = new FormData();
  invalidUpload.append('file', new Blob(['not a PDF'], { type: 'application/pdf' }), 'falso.pdf');
  const upload = await fetch(base + '/api/billing/receipts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: invalidUpload,
  });
  check(upload.status === 400, 'receipt signature validation');
  const receiptPdf = await PDFDocument.create();
  receiptPdf.addPage([200, 200]);
  const receiptBytes = await receiptPdf.save();
  const validUpload = new FormData();
  validUpload.append('file', new Blob([receiptBytes], { type: 'application/pdf' }), 'comprobante-demo.pdf');
  const receiptResponse = await fetch(base + '/api/billing/receipts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: validUpload,
  });
  check(receiptResponse.status === 201, 'valid receipt upload');
  const receipt = await receiptResponse.json();
  const receiptFile = await call('billing/receipts/' + receipt.id);
  check(
    Buffer.from(await receiptFile.arrayBuffer()).equals(Buffer.from(receiptBytes)),
    'receipt preserves exact bytes',
  );
  await call('billing/receipts/' + receipt.id, undefined, 401, 'GET', false);
  await call('billing/contracts/' + contract.id + '/status', { status: 'activo', version: 1 }, 409);
  let c = await (
    await call('billing/contracts/' + contract.id + '/status', { status: 'enviado', version: 1 }, 201)
  ).json();
  c = await (
    await call(
      'billing/contracts/' + contract.id + '/status',
      { status: 'firmado_cliente', version: c.version },
      201,
    )
  ).json();
  await call('billing/contracts/' + contract.id + '/status', { status: 'activo', version: c.version }, 409);
  c = await (
    await call(
      'billing/contracts/' + contract.id + '/status',
      { status: 'firmado_tuknex', version: c.version },
      201,
    )
  ).json();
  c = await (
    await call('billing/contracts/' + contract.id + '/status', { status: 'activo', version: c.version }, 201)
  ).json();
  await call(
    'billing/contracts/' + contract.id + '/status',
    { status: 'finalizado', version: c.version },
    409,
  );
  await call(
    'billing/contracts/' + contract.id + '/payments',
    {
      amountCents: 27000,
      date: today,
      method: 'transferencia',
      reference: 'QA-TOTAL',
      receiptId: receipt.id,
      observation: 'Liquidación de prueba',
      idempotencyKey: randomUUID(),
    },
    201,
  );
  data = await state();
  check(
    data.installments.filter((i) => i.contractId === contract.id).every((i) => i.status === 'pagada'),
    'automatic oldest-first allocation',
  );
  c = await (
    await call(
      'billing/contracts/' + contract.id + '/status',
      { status: 'finalizado', version: c.version },
      201,
    )
  ).json();
  check(c.status === 'finalizado', 'completion requires fully paid balance');
  for (const [kind, id] of [
    ['quotes', quote.id],
    ['contracts', contract.id],
  ]) {
    const response = await call('billing/' + kind + '/' + id + '/pdf');
    check(response.headers.get('content-type').includes('application/pdf'), 'real PDF response');
    const bytes = new Uint8Array(await response.arrayBuffer()),
      pdf = await PDFDocument.load(bytes);
    check(pdf.getPageCount() >= 2, 'pagination');
    check(
      pdf.getPages()[0].node.Resources()?.get(PDFName.of('XObject')) !== undefined,
      'embedded brand/reference images',
    );
  }
  const values = {
    ...quoteDefaults,
    offering: 'Café de prueba',
    sector: 'commerce',
    problem: 'Mostrar productos con claridad.',
    privacyAcknowledged: true,
  };
  const estimate = await (await call('public/estimate', values, 201)).json();
  check(estimate.min === 200, 'server recalculates public quote');
  const publicBody = { values, mode: 'weekly', count: 4, expectedMinCents: 20000 };
  await call('public/quote-pdf', publicBody, 201);
  await call('public/quote-pdf', { ...publicBody, expectedMinCents: 1 }, 400);
  await call('billing/prices', { landing: 225 }, 200, 'PATCH');
  const revised = await (await call('public/estimate', values, 201)).json();
  check(revised.min === 225, 'admin prices shared with PDF backend');
  await call('public/quote-pdf', publicBody, 400);
  await call('public/quote-pdf', { ...publicBody, expectedMinCents: 22500 }, 201);
  await app.close();
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  await call('auth/login', { email: 'admin@demo.tuknex', password: 'QA-Demo123!-secure' }, 201);
  data = await state();
  check(
    data.contracts.some((c) => c.id === contract.id && c.status === 'finalizado'),
    'contracts persist across restart',
  );
  check(
    data.payments.some((p) => p.id === payment.id && p.voided),
    'payment history persists across restart',
  );
  const saved = (await app.get(Database).query('SELECT id FROM documentos ORDER BY created_at DESC LIMIT 1')).rows[0];
  const savedResponse = await call('documents/' + saved.id);
  check(Buffer.from(await savedResponse.arrayBuffer()).subarray(0, 5).toString() === '%PDF-', 'stored document download remains available');
  const previousCwd = process.cwd();
  process.chdir(temporary);
  try {
    const document = await call('billing/contracts/' + contract.id + '/pdf');
    check(document.headers.get('content-type').includes('application/pdf'), 'PDF assets resolve independently of cwd');
  } finally { process.chdir(previousCwd); }
  const cors = await fetch(base + '/health', {headers:{Origin:'http://127.0.0.1:3000'}});
  check(cors.headers.get('access-control-allow-origin') === 'http://127.0.0.1:3000','allowed frontend origin');
  const blocked = await fetch(base + '/health', {headers:{Origin:'https://untrusted.example'}});
  check(!blocked.headers.has('access-control-allow-origin'),'other origins not authorized');
  await call('auth/logout', {}, 201);
  await call('billing/state', undefined, 401);
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        checks,
        storage: 'PGlite filesystem with PostgreSQL migrations',
        tests: [
          'authorization',
          'validation',
          'accepted quote conversion',
          'idempotency',
          'partial payments',
          'overpayment',
          'overdue schedules',
          'void ledger',
          'external signature states',
          'completion balance',
          'PDF images and pagination',
          'server pricing',
          'stale PDF protection',
          'persistence across restart',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (app) await app.close();
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), root);
  assert.ok(path.basename(resolved).startsWith('billing-test-'));
  await rm(resolved, { recursive: true, force: true });
}
