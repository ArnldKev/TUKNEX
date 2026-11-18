import assert from 'node:assert/strict';
import test from 'node:test';
import { displayedNexiReport, generateNexiReport, listNexiReports, type SavedNexiReport } from './nexi-reports';

const source = { kind: 'request', id: crypto.randomUUID(), revision: 3 } as const;
const createdAt = new Date().toISOString();
const original = {
  summary: 'Catálogo para tres sedes', visualDirection: 'Fotografías amplias',
  scope: ['Carta web'], exclusions: ['Pagos en línea'], questions: ['Cómo actualizar precios'],
  risks: [], acceptanceCriteria: [], suggestions: [],
};

function record(sourceRevision: number): SavedNexiReport {
  const id = crypto.randomUUID();
  return {
    id, sourceKind: source.kind, sourceId: source.id, sourceRevision, createdAt, reviews: [],
    envelope: { id, projectId: source.id, baseRevision: 0, provider: 'groq', model: 'synthetic', generatedAt: createdAt, report: original },
  };
}

test('opens the newest report for the current source revision and its approved scope', () => {
  const older = record(2);
  const saved = record(3);
  const reviewed = { ...original, scope: ['Carta por sede y acceso por WhatsApp'] };
  saved.reviews.push({ id: crypto.randomUUID(), version: 1, reviewed, approved: true, internalNote: 'Solo para el equipo', createdAt });
  const opened = displayedNexiReport({ sourceRevision: 3, reports: [older, saved] }, source);
  assert.equal(opened?.record.id, saved.id);
  assert.equal(opened?.current, true);
  assert.deepEqual(opened?.envelope.report.scope, reviewed.scope);
  assert.deepEqual(saved.envelope.report.scope, original.scope);
});

test('keeps older scope readable and a draft separate from the original report', () => {
  const saved = record(3);
  saved.reviews.push({ id: crypto.randomUUID(), version: 1, reviewed: { ...original, summary: 'Revisión en preparación' }, approved: false, internalNote: '', createdAt });
  const amended = { ...source, revision: 4 };
  const opened = displayedNexiReport({ sourceRevision: 4, reports: [saved] }, amended);
  assert.equal(opened?.current, false);
  assert.equal(opened?.envelope.report.summary, original.summary);
  assert.equal(opened?.review?.reviewed.summary, 'Revisión en preparación');
  assert.equal(displayedNexiReport({ sourceRevision: 4, reports: [record(4)] }, source)?.current, false);
  assert.equal(displayedNexiReport({ sourceRevision: 4, reports: [] }, amended), null);
});

test('reopening reads history with a GET and rejects reports bound to another quotation', async () => {
  const saved = record(3);
  const calls: { url: string; options?: RequestInit }[] = [];
  const realFetch = globalThis.fetch;
  let response: unknown = { sourceRevision: 3, reports: [saved] };
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    return Response.json(response);
  };

  const signal = new AbortController().signal;
  try {
    assert.deepEqual(await listNexiReports(source, signal), response);
    assert.equal(calls[0].options?.method ?? 'GET', 'GET');
    assert.equal(calls[0].options?.credentials, 'include');
    assert.equal(calls[0].options?.body, undefined);
    assert.ok(calls[0].url.endsWith('/api/nexi-reports/request/' + source.id));

    response = { sourceRevision: 3, reports: [{ ...saved, envelope: { ...saved.envelope, projectId: crypto.randomUUID() } }] };
    await assert.rejects(() => listNexiReports(source, signal), /no corresponde/);

    response = saved;
    assert.equal((await generateNexiReport(source, signal)).id, saved.id);
    assert.equal(calls[2].options?.method, 'POST');
    assert.deepEqual(Object.keys(JSON.parse(String(calls[2].options?.body))).sort(), ['consent', 'policyVersion', 'version']);
    assert.equal(JSON.parse(String(calls[2].options?.body)).version, source.revision);
  } finally {
    globalThis.fetch = realFetch;
  }
});
