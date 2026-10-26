import { DEMO_MODE } from '../../config/environment';
import { billingRequest } from '../billing/api';
import type { SavedQuoteRequest } from './requests';
import { billingBase } from '../billing/api';
import { estimateQuote, PROJECT_TYPES } from '../pricing';
import { platformRepository } from '../platform/repository';
import type { QuoteService } from './contracts';
import { toMinimalEstimateInput } from './estimate-input';

export const quoteService: QuoteService = {
  async calculate(input, overrides = {}) {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(billingBase + '/api/public/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toMinimalEstimateInput(input)),
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) return await response.json();
      } catch {
        /* The existing local estimator remains available offline. */
      }
    }
    const estimate = estimateQuote(input, overrides);
    const validUntil = new Date(Date.now() + estimate.validityDays * 86400000).toISOString();
    return {
      ...estimate,
      category: input.projectType,
      label: PROJECT_TYPES.find((item) => item.id === input.projectType)?.name ?? 'Proyecto web',
      currency: 'PEN',
      version: '3.0',
      validUntil,
    };
  },
  async request({ input, result, contact, answers, demoClientId, idempotencyKey }) {
    if (!DEMO_MODE) {
      const saved=await billingRequest<SavedQuoteRequest>('account/quote-requests',{method:'POST',body:JSON.stringify({values:input,idempotencyKey:idempotencyKey || crypto.randomUUID()})});
      if(typeof window!=='undefined') window.dispatchEvent(new Event('billing-change'));
      return {id:saved.id,number:saved.number,result:saved.result,mode:'persistent'};
    }
    const quote = platformRepository.createQuote(
      {
        name: contact.name || 'Invitado demo',
        business: contact.business || 'Negocio por definir',
        email: contact.email,
        phone: contact.phone,
        marketingConsent: contact.marketingConsent,
        projectType: input.projectType,
        project: result.label,
        features: input.features,
        amount: result.custom ? null : result.total,
        estimate: result,
        answers,
      },
      demoClientId,
    );
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('tuknex-data'));
    return { id: quote.id, mode: 'memory-demo' };
  },
};
