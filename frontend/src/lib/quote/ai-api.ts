'use client';
import {billingBase} from '../billing/api';
import {aiEnvelopeSchema,AI_POLICY_VERSION,type AiConfig,type AiEnvelope} from './ai';
import type {QuoteProject} from './project';

export async function getAiConfig(signal:AbortSignal):Promise<AiConfig>{
 const res=await fetch(billingBase+'/api/quote-ai/config',{signal,credentials:'include',cache:'no-store'});
 if(!res.ok)throw Error('No pudimos comprobar la disponibilidad de NEXI. Puedes continuar con el cuestionario.');
 const raw=await res.json();
 if(raw.policyVersion!==AI_POLICY_VERSION||raw.provider!=='groq'||typeof raw.enabled!=='boolean')throw Error('La configuración de NEXI no es compatible. Actualiza la página.');
 return raw;
}
export async function analyzeAiProject(project:QuoteProject,signal:AbortSignal,draft?:{id:string;version:number;source?:'request'}):Promise<AiEnvelope>{
 const res=await fetch(billingBase+'/api/'+(draft?'billing/quote-ai/'+(draft.source==='request'?'requests/':'')+encodeURIComponent(draft.id)+'/analyze':'quote-ai/analyze'),{
  method:'POST',credentials:'include',cache:'no-store',signal,headers:{'Content-Type':'application/json'},
  body:JSON.stringify(draft?{version:draft.version,consent:true,policyVersion:AI_POLICY_VERSION}:{project,consent:true,policyVersion:AI_POLICY_VERSION}),
 });
 if(!res.ok){const error=await res.json().catch(()=>null);throw Error(error?.message||'NEXI no pudo analizar la idea. Las respuestas siguen disponibles.');}
 const parsed=aiEnvelopeSchema.safeParse(await res.json());
 if(!parsed.success||parsed.data.projectId!==project.id||parsed.data.baseRevision!==project.revision)throw Error('El análisis no corresponde a esta versión. Solicita uno nuevo.');
 return parsed.data;
}

