import assert from 'node:assert/strict';
import test from 'node:test';
import { registrationConfirmationIssue, registrationPasswordHelp, registrationPasswordIssue } from './registration-password';

test('registration reports the current password limits and accepts both boundaries', () => {
  assert.equal(registrationPasswordHelp, 'Usa entre 12 y 128 caracteres.');
  assert.equal(registrationPasswordIssue(''), 'Escribe una contraseña.');
  assert.equal(registrationPasswordIssue('a'.repeat(11)), 'Usa al menos 12 caracteres.');
  assert.equal(registrationPasswordIssue('a'.repeat(12)), undefined);
  assert.equal(registrationPasswordIssue('a'.repeat(128)), undefined);
  assert.equal(registrationPasswordIssue('a'.repeat(129)), 'Usa como máximo 128 caracteres.');
  assert.equal(registrationPasswordIssue('  contraseña  '), undefined);
});

test('registration requires an exact confirmation', () => {
  assert.equal(registrationConfirmationIssue('ejemplo válido', ''), 'Confirma tu contraseña.');
  assert.equal(registrationConfirmationIssue('ejemplo válido', 'ejemplo distinto'), 'Las contraseñas no coinciden.');
  assert.equal(registrationConfirmationIssue(' contraseña válida', 'contraseña válida'), 'Las contraseñas no coinciden.');
  assert.equal(registrationConfirmationIssue(' contraseña válida', ' contraseña válida'), undefined);
});
