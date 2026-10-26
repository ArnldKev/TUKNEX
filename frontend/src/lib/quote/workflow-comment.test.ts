import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
import {initialQuoteFlow,parseQuoteRecovery,serializeQuoteRecovery} from './workflow';
test('over-limit preview comment remains locally recoverable until edited',()=>{
 const raw=serializeQuoteRecovery({...quoteDefaults,previewComment:'x'.repeat(601)},initialQuoteFlow(),1000);
 assert.equal(parseQuoteRecovery(raw,2000)?.values.previewComment?.length,601);
});
