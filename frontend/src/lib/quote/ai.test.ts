import assert from 'node:assert/strict';
import test from 'node:test';
import {createQuoteProject,createProjectHistory,acceptProjectSuggestion,undoProject} from './project';
import {quoteDefaults} from './form';
test('AI contract',async t=>{
 const api=await import('./ai').catch(()=>null);assert.ok(api,'Falta el contrato seguro de IA');
 const p=createQuoteProject({...quoteDefaults,offering:'Comida para llevar',problem:'No quiero pagos online; quiero pedidos por WhatsApp',sector:'food'});
 const report: import('./ai').AiReport={summary:'Una carta para recibir pedidos por WhatsApp.',scope:['Carta de platos'],exclusions:['No incluye pagos online'],questions:['¿Cuántos platos ofrecerás?'],risks:['Confirmar disponibilidad de fotos'],acceptanceCriteria:['El botón abre WhatsApp con el pedido'],visualDirection:'Fotos grandes y texto legible',suggestions:[{title:'Mostrar la carta',reason:'Permite elegir antes de contactar',evidenceFields:['problem'],target:'addFeature',value:'catalog'}]};
 await t.test('AI request requires separate explicit permission and rejects contact fields',()=>{assert.equal(api.aiRequestSchema.safeParse({project:p,consent:false,policyVersion:api.AI_POLICY_VERSION}).success,false);assert.equal(api.aiRequestSchema.safeParse({project:p,consent:true,policyVersion:api.AI_POLICY_VERSION,email:'a@example.test'}).success,false);});
 await t.test('provider context omits identity and redacts recognized contacts',()=>{const context=api.aiContext({...p,answers:{...p.answers,businessName:'Private name',website:'https://private.test',offering:'Contacta a private@example.test o +51 934631664, DNI 12345678'}});const text=JSON.stringify(context);for(const value of ['Private name','private.test','private@example.test','934631664','12345678',p.id])assert.equal(text.includes(value),false,value);assert.equal(context.problem,p.answers.problem);});
 await t.test('provider cannot add prices, HTML targets or unknown features',()=>{assert.equal(api.aiReportSchema.safeParse({...report,price:3}).success,false);assert.equal(api.aiReportSchema.safeParse({...report,suggestions:[{...report.suggestions[0],target:'html',value:'<script/>'}]}).success,false);assert.throws(()=>api.aiSuggestion(p,{...report.suggestions[0],value:'secret_admin'}));assert.throws(()=>api.aiSuggestion(p,{...report.suggestions[0],target:'palette',value:'url(javascript:alert(1))'}));});
 await t.test('evidence must be present, without identities',()=>{assert.throws(()=>api.validateAiReport({...report,suggestions:[{...report.suggestions[0],evidenceFields:['email']}]},p));assert.throws(()=>api.validateAiReport({...report,suggestions:[{...report.suggestions[0],evidenceFields:['otherFunctions']}]},p));});
 await t.test('features stay proposed until accepted and undo or stale checks work',()=>{const suggestion=api.aiSuggestion(p,report.suggestions[0]);const history=createProjectHistory(p);assert.equal(history.present.answers.features.includes('catalog'),false);const accepted=acceptProjectSuggestion(history,suggestion);assert.equal(accepted.present.answers.features.includes('catalog'),true);assert.deepEqual(undoProject(accepted).present.answers.features,p.answers.features);assert.throws(()=>acceptProjectSuggestion(accepted,suggestion));});
 await t.test('visual suggestion preserves other choices and all price inputs',()=>{const s=api.aiSuggestion(p,{...report.suggestions[0],target:'hero',value:'centered'});const next=acceptProjectSuggestion(createProjectHistory(p),s).present;assert.equal(next.visual.visualPreferences.hero,'centered');assert.equal(next.visual.visualPreferences.font,p.visual.visualPreferences.font);assert.deepEqual(next.answers,p.answers);});
 await t.test('negated requests remain intact and cannot automatically add a feature',()=>{assert.equal(api.aiContext(p).problem,'No quiero pagos online; quiero pedidos por WhatsApp');assert.equal(p.answers.features.includes('payments'),false);});
 await t.test('model envelope binds results to project and revision',()=>{const result=api.aiEnvelopeSchema.parse({id:crypto.randomUUID(),projectId:p.id,baseRevision:p.revision,provider:'groq',model:'openai/gpt-oss-120b',generatedAt:new Date().toISOString(),report});assert.equal(api.isCurrentAiResult(result,p),true);assert.equal(api.isCurrentAiResult(result,{...p,revision:1}),false);assert.equal(api.isCurrentAiResult(result,{...p,id:crypto.randomUUID()}),false);});

 await t.test('invalid text remains in the form when applying an AI proposal',async()=>{
  const domain=await import('./project');assert.equal(typeof domain.acceptProjectSuggestionFromForm,'function','Falta validar el formulario actual antes de aplicar IA');
  const tooLong={...quoteDefaults,...p.answers,offering:'X'.repeat(301)};
  const original=createProjectHistory(p),proposal=api.aiSuggestion(p,report.suggestions[0]);
  assert.throws(()=>domain.acceptProjectSuggestionFromForm(original,tooLong,proposal));
  assert.equal(tooLong.offering.length,301);assert.equal(original.present.answers.offering,'Comida para llevar');
  const valid=domain.acceptProjectSuggestionFromForm(original,{...quoteDefaults,...p.answers,...p.visual},proposal);
  assert.equal(valid.present.answers.features.includes('catalog'),true);
 });
});

