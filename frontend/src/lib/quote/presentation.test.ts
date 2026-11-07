import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteDefaults} from './form';
import {quoteAnswers,quoteProposalText} from './presentation';
import {estimateQuote} from '../pricing';

test('optional commercial consent is accurately described in real proposals and defaults to not granted',()=>{
  const values={...quoteDefaults,offering:'Café de prueba',sector:'food' as const,problem:'Mostrar la carta',privacyAcknowledged:true};
  const consent=(enabled:boolean)=>quoteAnswers({...values,marketingConsent:enabled}).find(answer=>answer.question==='Consentimiento comercial opcional')?.value;
  assert.equal(consent(false),'No otorgado');
  assert.equal(consent(true),'Autorizado para contacto comercial sobre este proyecto');
  const estimate=estimateQuote(values);
  const proposal=quoteProposalText({...values,marketingConsent:true},{...estimate,category:values.projectType,label:'Landing page',currency:'PEN',version:'3.0',validUntil:'2026-11-20T00:00:00.000Z'});
  assert.match(proposal,/Consentimiento comercial opcional: Autorizado/);
  assert.doesNotMatch(proposal,/sesión demo/);
});
