import assert from 'node:assert/strict';
import test from 'node:test';
import { readAiRequestError } from './ai-errors';

const reference = 'fb9c2d05-ef22-4adc-aa01-70050fa32d21';
const headers = { 'X-Nexi-Reference': reference, 'Retry-After': '90' };

test('NEXI muestra una referencia válida y respeta el tiempo de espera del servicio', async () => {
  const error = await readAiRequestError(Response.json({ message: 'NEXI está ocupado.' }, { status: 429, headers }), 'Error');
  assert.equal(error.message, 'NEXI está ocupado. Referencia: ' + reference + '.');
  assert.equal(error.retryAfterSeconds, 90);
});

test('NEXI limita las esperas e ignora cabeceras mal formadas', async () => {
  const error = await readAiRequestError(new Response('<html/>', { status: 503, headers: { 'X-Nexi-Reference': '<private>', 'Retry-After': '99999' } }), 'Inténtalo más tarde.');
  assert.equal(error.message, 'Inténtalo más tarde.');
  assert.equal(error.retryAfterSeconds, 86400);
});

test('NEXI conserva el mensaje y descarta esperas ajenas a fallos transitorios', async () => {
  const error = await readAiRequestError(Response.json({ message: 'Inicia sesión.' }, { status: 401, headers: { 'Retry-After': '90' } }), 'Error');
  assert.equal(error.message, 'Inicia sesión.');
  assert.equal(error.retryAfterSeconds, 0);
});
