import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordsForClient} from './client-records';
import type {SavedQuoteRequest} from '../quote/requests';
import type {BillingQuote,Contract} from './types';
test('requests assigned by staff appear independently of formal quotes',()=>{const requests=[{id:'own',clientId:'client',createdByRole:'admin'},{id:'unlinked',clientId:null},{id:'other',clientId:'other'}] as SavedQuoteRequest[];const result=recordsForClient('client',requests,[],[]);assert.deepEqual(result.requests.map(r=>r.id),['own']);assert.equal(result.quotes.length,0);});
test('document ownership uses client IDs; names and contact do not link records',()=>{const result=recordsForClient('client',[],[{id:'q1',clientId:'client'},{id:'q2',clientId:'other'}] as BillingQuote[],[{id:'c1',clientId:'other'},{id:'c2',clientId:'client'}] as Contract[]);assert.deepEqual(result.quotes.map(r=>r.id),['q1']);assert.deepEqual(result.contracts.map(r=>r.id),['c2']);});
