'use client';
import {billingBase} from '../billing/api';
import {z} from 'zod';
import {readAiRequestError} from './ai-errors';
import {aiEnvelopeSchema,aiReportSchema,AI_POLICY_VERSION,type AiEnvelope} from './ai';
export const reportReviewSchema=z.object({id:z.uuid(),version:z.number().int().positive(),reviewed:aiReportSchema,approved:z.boolean(),internalNote:z.string().max(2000),createdAt:z.string()});
export const savedNexiReportSchema=z.object({id:z.uuid(),sourceKind:z.enum(['request','formal']),sourceId:z.uuid(),sourceRevision:z.number().int().positive(),envelope:aiEnvelopeSchema,createdAt:z.string(),reviews:z.array(reportReviewSchema)});
export type SavedNexiReport=z.infer<typeof savedNexiReportSchema>;
export type NexiReportSource={kind:'request'|'formal';id:string;revision:number};
const path=(source:NexiReportSource)=>billingBase+'/api/nexi-reports/'+source.kind+'/'+encodeURIComponent(source.id);
async function json(url:string,options:RequestInit){
 const res=await fetch(url,{...options,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
 if(!res.ok){if(res.status===401)window.dispatchEvent(new CustomEvent('account-expired',{detail:{reason:'expired'}}));throw await readAiRequestError(res,'No se pudo consultar el informe. Inténtalo de nuevo.');}
 return res.json();
}
export async function listNexiReports(source:NexiReportSource,signal:AbortSignal){return z.object({sourceRevision:z.number().int().positive(),reports:z.array(savedNexiReportSchema)}).parse(await json(path(source),{signal}));}
export async function generateNexiReport(source:NexiReportSource,signal:AbortSignal):Promise<AiEnvelope>{
 const saved=savedNexiReportSchema.parse(await json(path(source)+'/generate',{method:'POST',signal,body:JSON.stringify({version:source.revision,consent:true,policyVersion:AI_POLICY_VERSION})}));
 if(saved.sourceId!==source.id||saved.sourceKind!==source.kind||saved.sourceRevision!==source.revision)throw Error('El informe no corresponde a esta fuente. Actualiza e inténtalo de nuevo.');
 window.dispatchEvent(new CustomEvent('nexi-report-change',{detail:{sourceId:source.id}}));return saved.envelope;
}
export async function saveNexiReview(source:NexiReportSource,report:SavedNexiReport,reviewed:z.infer<typeof aiReportSchema>,approved:boolean,internalNote:string,idempotencyKey:string,signal:AbortSignal){return json(path(source)+'/'+report.id+'/reviews',{method:'POST',signal,body:JSON.stringify({expectedVersion:report.reviews[0]?.version||0,reviewed,approved,internalNote,idempotencyKey})});}
