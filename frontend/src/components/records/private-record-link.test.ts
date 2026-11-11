import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedRecord,privateRecordTarget} from './private-record-link';
const id='25dcefd3-5cf9-4243-9f65-d6771b2a8fc5',other='e749a951-d8dd-426c-af95-30cfb3142d7e';
test('private record links accept exactly one UUID for the chosen parameter',()=>{
 assert.deepEqual(privateRecordTarget('?cotizacion='+id,'cotizacion'),{kind:'record',id});
 assert.deepEqual(privateRecordTarget('?cotizacion='+id.toUpperCase(),'cotizacion'),{kind:'record',id});
 for(const search of ['?cotizacion=','?cotizacion=../admin','?cotizacion='+id+'&cotizacion='+other,'?cotizacion=https://example.test','?cotizacion=%3Cscript%3E'])assert.deepEqual(privateRecordTarget(search,'cotizacion'),{kind:'invalid'});
 assert.deepEqual(privateRecordTarget('?solicitud='+id,'cotizacion'),{kind:'none'});
});
test('a link can select only an existing authorized record and never fabricates data',()=>{
 const own={id,title:'Proyecto visible'},foreign={id:other,title:'Otro proyecto'},records=[own];
 assert.equal(linkedRecord(records,privateRecordTarget('?proyecto='+id,'proyecto')),own);
 assert.equal(linkedRecord(records,privateRecordTarget('?proyecto='+foreign.id,'proyecto')),undefined);
 assert.equal(linkedRecord([],privateRecordTarget('?proyecto='+id,'proyecto')),undefined);
 assert.equal(linkedRecord(records,{kind:'invalid'}),undefined);
 assert.deepEqual(records,[own]);
});
