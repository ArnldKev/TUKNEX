import {z} from 'zod';
import {quoteDefaults,quoteFormSchema,QUOTE_STEP_FIELDS,type QuoteFormValues} from './form';
import {projectAnswersSchema,projectVisualSchema} from './project';
export const QUOTE_RECOVERY_KEY='tuknex-quote-progress-v2';
const DAY=86400000,MAX_BYTES=96000;
const flowSchema=z.strictObject({step:z.number().int().min(0).max(5),completed:z.array(z.number().int().min(0).max(5)).max(6),goalChosen:z.boolean()});
export type QuoteFlowState=z.infer<typeof flowSchema>;
export function initialQuoteFlow():QuoteFlowState{return {step:0,completed:[],goalChosen:false};}
export function stageIsValid(index:number,values:QuoteFormValues,goalChosen:boolean){
 if(index===0&&!goalChosen)return false;
 if(index<0||index>5)return false;
 return QUOTE_STEP_FIELDS[index].every(key=>quoteFormSchema.shape[key].safeParse(values[key]).success);
}
export function advanceQuoteFlow(flow:QuoteFlowState,values:QuoteFormValues):QuoteFlowState{
 if(!stageIsValid(flow.step,values,flow.goalChosen))throw Error('Revisa las respuestas de esta etapa.');
 return {...flow,step:Math.min(5,flow.step+1),completed:[...new Set([...flow.completed,flow.step])]};
}
export function completeQuoteFlow(flow:QuoteFlowState,values:QuoteFormValues):QuoteFlowState{
 if(!flow.goalChosen||!quoteFormSchema.safeParse(values).success)throw Error('Revisa la información antes de enviar.');
 return {...flow,step:5,completed:[0,1,2,3,4,5]};
}
export function quoteProgress(flow:QuoteFlowState,values:QuoteFormValues){
 const completed=[...new Set(flow.completed)].filter(index=>stageIsValid(index,values,flow.goalChosen));
 return Math.round(completed.length/6*100);
}
// Recovery is local to this tab. Dedicated identity/contact/consent fields never enter storage.
const recoveryShape={...projectAnswersSchema.shape,...projectVisualSchema.shape};
function recoveryField(schema:z.ZodType):z.ZodType {
 let inner=schema;
 while(inner instanceof z.ZodDefault||inner instanceof z.ZodOptional)inner=inner.unwrap() as z.ZodType;
 return inner instanceof z.ZodString?z.string().max(4000):schema;
}
const relaxedShape=Object.fromEntries(Object.entries(recoveryShape).map(([key,schema])=>[key,recoveryField(schema)]));
const recoveryValuesSchema=z.strictObject(relaxedShape);
const recoverySchema=z.strictObject({version:z.literal(1),expiresAt:z.number().int().positive(),flow:flowSchema,values:recoveryValuesSchema});
export function serializeQuoteRecovery(values:QuoteFormValues,flow:QuoteFlowState,now=Date.now()){
 const selected=Object.fromEntries(Object.keys(recoveryShape).map(key=>[key,values[key as keyof QuoteFormValues]]));
 const snapshot=recoverySchema.parse({version:1,expiresAt:now+DAY,flow,values:selected});
 const text=JSON.stringify(snapshot);if(text.length>MAX_BYTES)throw Error('Avance demasiado extenso para recuperar en esta pestaña.');return text;
}
export function parseQuoteRecovery(raw:string|null,now=Date.now()):{flow:QuoteFlowState;values:QuoteFormValues}|null{
 if(!raw||raw.length>MAX_BYTES)return null;
 try{
  const parsed=recoverySchema.parse(JSON.parse(raw));
  if(parsed.expiresAt<=now||parsed.expiresAt>now+DAY)return null;
  return {flow:{...parsed.flow,completed:parsed.flow.completed.filter(index=>index<5)},values:{...quoteDefaults,...parsed.values,privacyAcknowledged:false,marketingConsent:false} as QuoteFormValues};
 }catch{return null;}
}

