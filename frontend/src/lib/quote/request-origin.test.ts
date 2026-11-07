import test from 'node:test';
import assert from 'node:assert/strict';
import type {SavedQuoteRequest} from './requests';
import {matchesQuoteRequestOrigin} from './request-origin';
const request=(createdById:string,createdByRole:'admin'|'subadmin'|'client',recipient:string|null=null)=>({createdById,createdByRole,userId:recipient,clientId:recipient,assigneeId:'developer'}) as SavedQuoteRequest;

test('my quotes remain mine after assigning a client, without absorbing client or colleague requests',()=>{
 const own=request('owner','admin'),linked={...own,userId:'client-account',clientId:'client-record'};
 const incoming=request('client-account','client','client-account'),colleague=request('developer','subadmin');
 assert.deepEqual([own,linked,incoming,colleague].filter(item=>matchesQuoteRequestOrigin(item,'mine','owner')),[own,linked]);
 assert.deepEqual([own,linked,incoming,colleague].filter(item=>matchesQuoteRequestOrigin(item,'client','owner')),[incoming]);
 assert.equal(matchesQuoteRequestOrigin(incoming,'mine','developer'),false,'being assigned to a developer does not change authorship');
});

test('subadministrator mine scope uses original creator and never invents a match without identity',()=>{
 const own=request('developer','subadmin','client-account'),other=request('other-developer','subadmin');
 assert.equal(matchesQuoteRequestOrigin(own,'mine','developer'),true);
 assert.equal(matchesQuoteRequestOrigin(other,'mine','developer'),false);
 assert.equal(matchesQuoteRequestOrigin(own,'mine'),false);
 assert.equal(matchesQuoteRequestOrigin(own,'all','developer'),true);
 assert.equal(matchesQuoteRequestOrigin(own,'client','developer'),false);
});
