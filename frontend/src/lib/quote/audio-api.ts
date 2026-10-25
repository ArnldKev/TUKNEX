'use client';
import {billingBase} from '../billing/api';
import {audioConfigSchema,audioTranscriptSchema,AUDIO_POLICY_VERSION,validateAudioRewrite,type AudioField} from './audio';
async function response(res:Response){
 if(!res.ok){const data=await res.json().catch(()=>null);throw Error(typeof data?.message==='string'?data.message:'No pudimos procesar la respuesta. Puedes seguir escribiendo.');}
 return res.json();
}
export async function getAudioConfig(signal:AbortSignal){return audioConfigSchema.parse(await response(await fetch(billingBase+'/api/quote-ai/audio/config',{signal,credentials:'include',cache:'no-store'})));}
export async function transcribeAnswer(blob:Blob,field:AudioField,signal:AbortSignal){
 const form=new FormData();form.append('file',blob,'respuesta');form.append('field',field);form.append('consent','true');form.append('policyVersion',AUDIO_POLICY_VERSION);
 return audioTranscriptSchema.parse(await response(await fetch(billingBase+'/api/quote-ai/audio/transcribe',{method:'POST',body:form,signal,credentials:'include',cache:'no-store'})));
}
export async function organizeAnswer(text:string,field:AudioField,signal:AbortSignal){
 return validateAudioRewrite(await response(await fetch(billingBase+'/api/quote-ai/audio/organize',{method:'POST',signal,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({field,text,consent:true,policyVersion:AUDIO_POLICY_VERSION})})),field);
}

