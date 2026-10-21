import test from 'node:test';
import assert from 'node:assert/strict';
import {canSaveQuote,type VerificationStatus} from './verification';
const base:VerificationStatus={emailRequired:true,phoneRequired:false,emailAvailable:true,phoneAvailable:false,emailVerified:false,phoneVerified:false,profileComplete:true,email:'qa@example.test',phone:'+51900000001',dniMasked:'••••0001',identityVerified:false};
test('required contact verification gates saving while optional SMS stays optional',()=>{
  assert.equal(canSaveQuote(base),false);
  assert.equal(canSaveQuote({...base,emailVerified:true}),true);
  assert.equal(canSaveQuote({...base,emailVerified:true,phoneRequired:true}),false);
  assert.equal(canSaveQuote({...base,emailVerified:true,phoneRequired:true,phoneVerified:true}),true);
  assert.equal(canSaveQuote({...base,emailVerified:true,profileComplete:false}),false);
});
test('local integration preparation does not claim verification or require unavailable providers',()=>{
  assert.equal(canSaveQuote({...base,emailRequired:false,emailAvailable:false,profileComplete:false}),true);
  assert.equal(base.identityVerified,false);
});
