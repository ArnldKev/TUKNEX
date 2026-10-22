import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteDefaults, quoteFormSchema, paymentPreferenceLabels } from './form';
import { quoteAnswers } from './presentation';
import { estimateQuote } from '../pricing';

test('payment frequency is a stored preference and never changes the public estimate',()=>{
  const base={...quoteDefaults,offering:'Productos de prueba',sector:'commerce',problem:'Mostrar mis productos.',privacyAcknowledged:true};
  const expected=estimateQuote(base);
  for(const preference of Object.keys(paymentPreferenceLabels)) {
    const parsed=quoteFormSchema.parse({...base,paymentPreference:preference});
    assert.equal(parsed.paymentPreference,preference);
    assert.deepEqual(estimateQuote(parsed),expected);
    assert.equal(quoteAnswers(parsed).find(answer=>answer.question==='Frecuencia de pago preferida')?.value,paymentPreferenceLabels[preference as keyof typeof paymentPreferenceLabels]);
  }
  const {paymentPreference: _old,...legacy}=base;
  assert.equal(quoteFormSchema.parse(legacy).paymentPreference,undefined);
  assert.equal(quoteFormSchema.safeParse({...base,paymentPreference:'invented'}).success,false);
});
