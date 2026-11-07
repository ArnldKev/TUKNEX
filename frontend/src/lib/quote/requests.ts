import type {QuoteFormValues} from './form';
import type {QuoteResult} from './contracts';
export const requestStatusLabels={pending:'Recibida',reviewing:'En revisión',quoted:'Cotizada',closed:'Cerrada'} as const;
export interface SavedQuoteRequest {
  id:string;number:string;userId:string|null;clientId:string|null;
  values:QuoteFormValues;result:QuoteResult;
  status:keyof typeof requestStatusLabels;
  createdAt:string;updatedAt:string;
  createdById?:string|null;createdByName?:string|null;createdByRole?:'admin'|'subadmin'|'client'|null;
  teamProjectId?:string|null;assigneeId?:string|null;assigneeName?:string|null;
  clientName?:string|null;clientEmail?:string|null;
  revision?:number;linkedAt?:string|null;linkedById?:string|null;
}
export interface QuoteClientAccount {userId:string;clientId:string;name:string;email:string;dni?:string|null;}
