import type {SavedQuoteRequest} from '../quote/requests';
import type {BillingQuote,Contract} from './types';
export function recordsForClient(clientId:string,requests:SavedQuoteRequest[],quotes:BillingQuote[],contracts:Contract[]){
 return {requests:requests.filter(item=>item.clientId===clientId),quotes:quotes.filter(item=>item.clientId===clientId),contracts:contracts.filter(item=>item.clientId===clientId)};
}
