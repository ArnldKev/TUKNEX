import type {SavedQuoteRequest} from './requests';

export type QuoteRequestOrigin = 'all' | 'client' | 'mine';

/** Assignment changes the recipient, never the original creator. */
export function matchesQuoteRequestOrigin(request:SavedQuoteRequest, origin:QuoteRequestOrigin, actorId?:string):boolean {
  if(origin==='mine') return !!actorId && request.createdById===actorId;
  if(origin==='client') return request.createdByRole==='client';
  return true;
}
