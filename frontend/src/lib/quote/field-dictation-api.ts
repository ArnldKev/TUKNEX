'use client';
import {billingBase} from '../billing/api';
import {audioTranscriptSchema} from './audio';
import {DICTATION_POLICY_VERSION,dictationConfigSchema,dictationFieldSchema,type DictationField} from './dictation';

async function readResponse(response:Response){
 if(!response.ok){
  const body=await response.json().catch(()=>null);
  throw Error(typeof body?.message==='string'?body.message:'No pudimos transcribir. Tus respuestas se mantienen; puedes escribir o volver a intentarlo.');
 }
 return response.json();
}
export async function getDictationConfig(signal:AbortSignal){
 return dictationConfigSchema.parse(await readResponse(await fetch(billingBase+'/api/quote-ai/audio/dictation-config',{
  signal,credentials:'include',cache:'no-store',
 })));
}
export async function transcribeField(blob:Blob,field:DictationField,signal:AbortSignal){
 dictationFieldSchema.parse(field);
 const body=new FormData();body.append('file',blob,'respuesta');body.append('field',field);
 body.append('consent','true');body.append('policyVersion',DICTATION_POLICY_VERSION);
 return audioTranscriptSchema.parse(await readResponse(await fetch(billingBase+'/api/quote-ai/audio/dictate',{
  method:'POST',body,signal,credentials:'include',cache:'no-store',
 })));
}
