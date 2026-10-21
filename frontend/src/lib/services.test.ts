import assert from 'node:assert/strict';
import test from 'node:test';
import { serviceFromSearch } from '../data/services';

test('service links accept known service IDs without allowing arbitrary query content', () => {
  assert.equal(serviceFromSearch('?servicio=catalog'), 'catalog');
  assert.equal(serviceFromSearch('?servicio=system&otro=valor'), 'system');
  assert.equal(serviceFromSearch('?servicio=unknown'), null);
  assert.equal(serviceFromSearch('?servicio=%3Cscript%3E'), null);
  assert.equal(serviceFromSearch(''), null);
});
