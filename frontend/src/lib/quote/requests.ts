import type {QuoteFormValues} from '../quote/form';
import type {QuoteResult} from '../quote/contracts';
export const requestStatusLabels={pending:'Recibida',reviewing:'En revisión',quoted:'Cotizada',closed:'Cerrada'} as const;
export interface SavedQuoteRequest {
  id:string;number:string;userId:string;clientId:string;
  values:QuoteFormValues;result:QuoteResult;
  status:keyof typeof requestStatusLabels;
  createdAt:string;updatedAt:string;
}
