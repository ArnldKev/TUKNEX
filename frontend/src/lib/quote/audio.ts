import {z} from 'zod';
import {changeQuoteProject,recordProjectForm,StaleProjectRevisionError,type ProjectHistory} from './project';
import type {QuoteFormValues} from './form';
export const AUDIO_POLICY_VERSION='2026-10-25-audio-v1';
export const AUDIO_MAX_SECONDS=60,AUDIO_MAX_BYTES=4*1024*1024;
export const AUDIO_FIELDS={offering:{label:'Qué ofreces',max:300},problem:{label:'Qué quieres mejorar',max:1000},otherFunctions:{label:'Otras funciones',max:1000},firstImpression:{label:'Primera impresión y diseño',max:300}} as const;
export const audioFieldSchema=z.enum(['offering','problem','otherFunctions','firstImpression']);
export type AudioField=z.infer<typeof audioFieldSchema>;
export const audioPermissionSchema=z.strictObject({field:audioFieldSchema,consent:z.literal('true'),policyVersion:z.literal(AUDIO_POLICY_VERSION)});
export const audioTextRequestSchema=z.strictObject({field:audioFieldSchema,text:z.string().trim().min(1).max(3000),consent:z.literal(true),policyVersion:z.literal(AUDIO_POLICY_VERSION)});
export const audioTranscriptSchema=z.strictObject({text:z.string().trim().min(1).max(3000),duration:z.number().positive().max(AUDIO_MAX_SECONDS)});
export const audioRewriteSchema=z.strictObject({text:z.string().trim().min(1).max(1000),warnings:z.array(z.string().min(1).max(200)).max(4)});
export const audioConfigSchema=z.strictObject({enabled:z.boolean(),policyVersion:z.literal(AUDIO_POLICY_VERSION),maxSeconds:z.literal(AUDIO_MAX_SECONDS),maxBytes:z.literal(AUDIO_MAX_BYTES),perVisitorDailyLimit:z.literal(5)});
export type AudioTranscript=z.infer<typeof audioTranscriptSchema>;
export type AudioRewrite=z.infer<typeof audioRewriteSchema>;
export function validateAudioRewrite(raw:unknown,field:AudioField){
 const result=audioRewriteSchema.parse(raw);z.string().max(AUDIO_FIELDS[field].max).parse(result.text);return result;
}
const answerSchema=z.strictObject({projectId:z.uuid(),baseRevision:z.number().int().nonnegative(),field:audioFieldSchema,text:z.string().trim().min(1),organized:z.boolean()});
export type AudioAnswer=z.infer<typeof answerSchema>;
export function acceptAudioAnswer(history:ProjectHistory,values:QuoteFormValues,raw:unknown){
 const input=answerSchema.parse(raw);
 z.string().max(AUDIO_FIELDS[input.field].max).parse(input.text);
 const synchronized=recordProjectForm(history,values);
 if(synchronized.present.id!==input.projectId)throw new StaleProjectRevisionError();
 return changeQuoteProject(synchronized,input.field==='firstImpression'?{visual:{firstImpression:input.text}}:{answers:{[input.field]:input.text}},{expectedRevision:input.baseRevision,origin:input.organized?'suggested':'transcribed'});
}

