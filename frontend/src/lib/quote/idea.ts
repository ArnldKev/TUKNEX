import {z} from 'zod';
// Only plain, bounded prose is accepted. Original questionnaire answers remain authoritative.
const prose=z.string().trim().min(1).refine(value=>!/<\/?[a-z][^>]*>|```|https?:\/\//i.test(value),'Usa texto simple, sin código ni enlaces.');
export const organizedIdeaSchema=z.object({narrative:prose.max(1600),requirements:z.array(prose.max(400)).max(6),exclusions:z.array(prose.max(400)).max(6),questions:z.array(prose.max(400)).max(6)}).strict();
export const ideaOriginalSchema=z.object({offering:z.string().max(300),problem:z.string().max(1000),otherFunctions:z.string().max(1000),customers:z.string().max(300)}).strict();
export const approvedIdeaSchema=z.object({id:z.uuid(),sourceProjectId:z.uuid(),sourceRevision:z.number().int().nonnegative(),approvedAt:z.iso.datetime(),original:ideaOriginalSchema,reviewed:organizedIdeaSchema,protectedDetails:z.array(z.string().max(1000)).max(20)}).strict().superRefine((value,ctx)=>{try{validateOrganizedIdea(value.reviewed,value.original);}catch(error){ctx.addIssue({code:'custom',path:['reviewed'],message:error instanceof Error?error.message:'Revisa las restricciones y cantidades originales.'});}});
export type OrganizedIdea=z.infer<typeof organizedIdeaSchema>;
export type ApprovedIdea=z.infer<typeof approvedIdeaSchema>;
export type IdeaOriginal=z.infer<typeof ideaOriginalSchema>;
export function ideaOriginal(answers:IdeaOriginal):IdeaOriginal{return ideaOriginalSchema.parse({offering:answers.offering,problem:answers.problem,otherFunctions:answers.otherFunctions,customers:answers.customers});}
export function protectedIdeaDetails(original:IdeaOriginal){
 const text=Object.values(original).join('\n');
 const negatives=text.split(/(?<=[.!?;])\s+|\n/).map(s=>s.trim()).filter(s=>/\b(no|nunca|sin|ni|tampoco)\b/i.test(s));
 const numbers=[...text.matchAll(/(?<!\w)[+-]?\d+(?:[.,]\d+)?\b/g)].map(match=>match[0]);
 return [...new Set([...negatives,...numbers.map(value=>'Cantidad original: '+value)])].slice(0,20);
}
export function validateOrganizedIdea(raw:unknown,original:IdeaOriginal):OrganizedIdea{
 const result=organizedIdeaSchema.parse(raw),text=[result.narrative,...result.requirements,...result.exclusions,...result.questions].join('\n');
 // Conservative check: a rephrasing that drops a number is never presented for approval.
 for(const number of [...Object.values(original).join(' ').matchAll(/(?<!\w)[+-]?\d+(?:[.,]\d+)?\b/g)].map(m=>m[0]))
  if(!new Set([...text.matchAll(/(?<!\w)[+-]?\d+(?:[.,]\d+)?\b/g)].map(m=>m[0])).has(number))throw Error('La interpretación perdió una cantidad original.');
 const originalNumbers=new Set([...Object.values(original).join(' ').matchAll(/(?<!\w)[+-]?\d+(?:[.,]\d+)?\b/g)].map(m=>m[0]));
 for(const number of [...text.matchAll(/(?<!\w)[+-]?\d+(?:[.,]\d+)?\b/g)].map(m=>m[0]))if(!originalNumbers.has(number))throw Error('La interpretación añadió una cantidad que no figura en el original.');
 const normalized=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').replace(/[.;!?]$/,'').trim();
 for(const clause of protectedIdeaDetails(original).filter(value=>!value.startsWith('Cantidad original: ')))
  if(!normalized(text).includes(normalized(clause)))throw Error('Conserva literalmente las restricciones originales en la narración o las exclusiones.');
 return result;
}
