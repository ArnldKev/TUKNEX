import {quoteDefaults} from '../quote/form';
import {createQuoteProject} from '../quote/project';
import {serviceLabels,type BillingQuote} from './types';

/** Compact canonical analysis snapshot; complete reviewed terms travel separately on the server. */
export function projectFromFormalQuote(quote:BillingQuote){
 const type=['landing','business','catalog','store','system','redesign'].includes(quote.service)?quote.service as typeof quoteDefaults.projectType:'business';
 return createQuoteProject({...quoteDefaults,projectType:type,businessName:quote.projectName.slice(0,100),offering:((serviceLabels[quote.service]||'Servicio web')+': '+quote.projectName).slice(0,300),problem:quote.scope.slice(0,1000),otherFunctions:quote.conditions.slice(0,1000),sector:'services',features:[]},quote.id);
}
