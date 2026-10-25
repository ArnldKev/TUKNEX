import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptFileError, RECEIPT_MAX_BYTES, receiptMethods } from './receipts';
test('receipt selection permits images and PDF within the upload limit and rejects unusable files',()=>{
  for(const type of ['image/png','image/jpeg','application/pdf',''])assert.equal(receiptFileError({size:1000,type}),'');
  assert.match(receiptFileError({size:0,type:'image/png'}),/vacío/);
  assert.match(receiptFileError({size:RECEIPT_MAX_BYTES+1,type:'image/png'}),/5 MB/);
  assert.match(receiptFileError({size:1000,type:'image/svg+xml'}),/PNG o JPEG/);
  assert.equal(receiptFileError({size:RECEIPT_MAX_BYTES,type:'image/png'}),'');
  assert.match(receiptMethods.yape.proof,/Yape/);assert.match(receiptMethods.efectivo.proof,/recibo/);
});
