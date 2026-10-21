import type { QuoteEstimate, QuoteInput } from '../pricing';

export type { PricingRule, QuoteInput } from '../pricing';
export interface QuoteResult extends QuoteEstimate {
  category: string;
  label: string;
  currency: 'PEN';
  version: '3.0';
  validUntil: string;
}
export interface QuoteContact {
  name: string;
  business: string;
  email?: string;
  phone?: string;
  marketingConsent: boolean;
}
export interface QuoteAnswer {
  question: string;
  value: string;
}
export interface QuoteRequest {
  input: QuoteInput;
  result: QuoteResult;
  contact: QuoteContact;
  answers: QuoteAnswer[];
  demoClientId?: string;
  idempotencyKey?: string;
}
export interface QuoteService {
  calculate(input: QuoteInput, overrides?: Record<string, number>): Promise<QuoteResult>;
  request(request: QuoteRequest): Promise<{ id: string; number?: string; result?: QuoteResult; mode: 'memory-demo' | 'persistent' }>;
}
