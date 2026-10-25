import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
import {createQuoteProject,createProjectHistory,recordProjectForm,undoProject} from './project';
test('Audio: permiso, límites y aplicación revisable',async t=>{
 const a=await import('./audio').catch(()=>null);assert.ok(a,'Falta el contrato de respuestas por audio');
 const p=createQuoteProject({...quoteDefaults,offering:'Carta original',problem:'Quiero una carta digital'}),h=createProjectHistory(p);
 const input={field:'problem',text:'No quiero pagos online. Quiero WhatsApp.',consent:true,policyVersion:a.AUDIO_POLICY_VERSION};
 await t.test('solo campos libres autorizados y permiso explícito',()=>{
  assert.equal(a.audioTextRequestSchema.safeParse(input).success,true);
  for(const extra of [{consent:false},{field:'email'},{policyVersion:'old'},{text:'x'.repeat(3001)},{price:5}])
   assert.equal(a.audioTextRequestSchema.safeParse({...input,...extra}).success,false);
 });
 await t.test('confirmar añade una revisión deshacible y conserva el contacto',()=>{
  const values={...quoteDefaults,...p.answers,...p.visual,email:'private@example.test'};
  const next=a.acceptAudioAnswer(h,values,{projectId:p.id,baseRevision:0,field:'problem',text:input.text,organized:false});
  assert.equal(next.present.answers.problem,input.text);assert.equal(next.present.sources.problem,'transcribed');
  assert.equal(undoProject(next).present.answers.problem,p.answers.problem);assert.equal(values.email,'private@example.test');
  assert.equal(h.present.revision,0);
 });
 await t.test('no acepta revisiones antiguas, campos de contacto ni textos excesivos',()=>{
  const base={projectId:p.id,baseRevision:0,field:'offering',text:'Carta nueva',organized:false};
  const values={...quoteDefaults,...p.answers,...p.visual};
  assert.throws(()=>a.acceptAudioAnswer(h,values,{...base,field:'email'}));
  assert.throws(()=>a.acceptAudioAnswer(h,values,{...base,text:'x'.repeat(301)}));
  assert.throws(()=>a.acceptAudioAnswer(h,values,{...base,projectId:crypto.randomUUID()}));
  assert.throws(()=>a.acceptAudioAnswer(recordProjectForm(h,{...values,problem:'Cambio reciente'}),values,base));
  assert.throws(()=>a.acceptAudioAnswer(h,{...values,offering:'x'.repeat(301)},base));
 });
 await t.test('el dictado de primera impresión modifica el diseño y se puede deshacer',()=>{
  const values={...quoteDefaults,...p.answers,...p.visual};
  const next=a.acceptAudioAnswer(h,values,{projectId:p.id,baseRevision:0,field:'firstImpression',text:'Quiero una portada cálida con títulos grandes.',organized:true});
  assert.equal(next.present.visual.firstImpression,'Quiero una portada cálida con títulos grandes.');
  assert.equal(next.present.sources.firstImpression,'suggested');
  assert.equal(undoProject(next).present.visual.firstImpression,p.visual.firstImpression);
  assert.deepEqual(next.present.answers,p.answers);
 });
 await t.test('valida duración, transcripción y texto ordenado sin precios añadidos',()=>{
  assert.equal(a.audioTranscriptSchema.safeParse({text:'Una carta',duration:10}).success,true);
  for(const value of [{text:'',duration:1},{text:'hola',duration:61},{text:'hola',duration:0}])
   assert.equal(a.audioTranscriptSchema.safeParse(value).success,false);
  assert.equal(a.validateAudioRewrite({text:'Sin pagos online.',warnings:[]},'problem').text,'Sin pagos online.');
  assert.throws(()=>a.validateAudioRewrite({text:'x'.repeat(301),warnings:[]},'offering'));
  assert.throws(()=>a.validateAudioRewrite({text:'Carta',warnings:[],price:100},'offering'));
 });
});

