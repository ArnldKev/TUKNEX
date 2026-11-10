import type {AiEnvelope} from '../quote/ai';
import {aiSuggestionLabel} from '../quote/ai';
import type {SavedQuoteRequest} from '../quote/requests';
import {paymentPreferenceLabels} from '../quote/form';
import {FEATURES} from '../pricing';
import {type BillingQuote,type PlanInput} from './types';

/** Editor seed, never a persisted or accepted contract. */
export interface ContractDraft {
 clientId:string;projectId?:string;teamProjectId?:string;quoteId?:string;
 sourceRequestId?:string;sourceRequestRevision?:number;sourceQuoteId?:string;sourceQuoteVersion?:number;
 projectName:string;service:string;scope:string;conditions:string;observations:string;
 baseCents?:number;plan?:PlanInput;delivery?:string;isDemo:boolean;signatureMode?:'physical'|'online';
 source:{kind:'request'|'formal';id:string;number:string;revision:number};
 analysis?:AiEnvelope;warnings:string[];
}
function section(title:string,items:(string|undefined)[]){const lines=items.filter((value):value is string=>!!value?.trim());return lines.length?title+'\n'+lines.join('\n'):'';}
function bullets(items:string[]){return items.map(value=>'• '+value);}
function text(value:unknown){return typeof value==='string'?value.trim():'';}
function currentAnalysis(analysis:AiEnvelope|undefined,id:string){
 if(analysis&&(analysis.projectId!==id||analysis.baseRevision!==0))throw Error('El análisis no corresponde a esta revisión. Solicita uno nuevo antes de preparar el contrato.');
 return analysis;
}
function clipped(value:string,max:number,label:string,warnings:string[]){
 if(value.length<=max)return value;
 warnings.push(label+' supera el espacio del contrato. Revisa y completa su contenido antes de guardar; el análisis completo sigue disponible en esta pantalla.');
 const marker='\n[Contenido reducido: revisar]';let head=value.slice(0,max-marker.length);if(/[\uD800-\uDBFF]$/.test(head))head=head.slice(0,-1);return head+marker;
}
function finish(draft:ContractDraft):ContractDraft{
 const warnings=[...draft.warnings];
 return {...draft,projectName:clipped(draft.projectName,200,'El nombre del proyecto',warnings),scope:clipped(draft.scope,8000,'El alcance',warnings),conditions:clipped(draft.conditions,5000,'Las condiciones',warnings),observations:clipped(draft.observations,3000,'Las observaciones',warnings),warnings};
}
function analysisConditions(analysis?:AiEnvelope){if(!analysis)return '';const report=analysis.report;return [section('Exclusiones propuestas por NEXI · revisar',bullets(report.exclusions)),section('Criterios propuestos para revisar la entrega',bullets(report.acceptanceCriteria))].filter(Boolean).join('\n\n');}
function analysisObservations(analysis?:AiEnvelope){if(!analysis)return '';const report=analysis.report;return [section('Dirección visual propuesta por NEXI · revisar',[report.visualDirection]),section('Preguntas pendientes de acordar',bullets(report.questions)),section('Dependencias y riesgos por revisar',bullets(report.risks)),section('Ideas propuestas, todavía sin aprobar',report.suggestions.map(item=>'• '+aiSuggestionLabel(item)+'. '+item.reason))].filter(Boolean).join('\n\n');}

export function draftFromRequest(request:SavedQuoteRequest,rawAnalysis?:AiEnvelope):ContractDraft{
 if(!request.clientId)throw Error('Asigna primero una cuenta de cliente a esta cotización.');
 if(!request.revision||!Number.isInteger(request.revision)||request.revision<1)throw Error('Actualiza la solicitud para preparar un contrato de su versión actual.');
 const analysis=currentAnalysis(rawAnalysis,request.id),values=request.values,report=analysis?.report;
 const selected=(values.features||[]).map(id=>FEATURES.find(feature=>feature.id===id)?.name||id);
 const scope=[section('Necesidad declarada por el cliente',[text(values.offering)]),section('Objetivo y necesidad de mejora',[text(values.problem)]),section('Otras necesidades y restricciones indicadas',[text(values.otherFunctions)]),section('Público y proceso indicados',[text(values.customers),text(values.salesProcess)]),section('Funciones seleccionadas',bullets(selected)),section('Alcance preliminar registrado',bullets(request.result.scope||[])),section('Resumen propuesto por NEXI · revisar',[report?.summary]),section('Alcance propuesto por NEXI · revisar',report?bullets(report.scope):[])].filter(Boolean).join('\n\n');
 const conditions=[text(request.result.conditions),section('Exclusiones de la estimación preliminar',bullets(request.result.exclusions||[])),analysisConditions(analysis)].filter(Boolean).join('\n\n');
 const observations=[`Origen: solicitud ${request.number}, revisión ${request.revision}.`,section('Preferencias visuales indicadas',[values.colorsLiked?'Colores: '+values.colorsLiked:undefined,values.colorsDisliked?'Evitar: '+values.colorsDisliked:undefined,values.stylePreference!=='unsure'?'Estilo: '+({modern:'Moderno',elegant:'Elegante',minimal:'Sencillo',corporate:'Profesional',bold:'Llamativo'}[values.stylePreference]):undefined,values.references?'Referencias aportadas: '+values.references:undefined,values.previewComment?'Comentario sobre el boceto: '+values.previewComment:undefined]),'Frecuencia de pago orientativa: '+paymentPreferenceLabels[values.paymentPreference||'unsure']+'. Importe y fechas por acordar.',analysisObservations(analysis)].filter(Boolean).join('\n\n');
 const min=request.result.min;const baseCents=!request.result.custom&&Number.isFinite(min)&&min>0?Math.round(min*100):undefined;
 return finish({clientId:request.clientId,teamProjectId:request.teamProjectId||undefined,sourceRequestId:request.id,sourceRequestRevision:request.revision,projectName:values.businessName||request.result.label,service:values.projectType,scope,conditions,observations,baseCents,delivery:request.result.duration,isDemo:false,source:{kind:'request',id:request.id,number:request.number,revision:request.revision},analysis,warnings:[baseCents===undefined?'Esta solicitud requiere un precio personalizado. Indica y confirma el importe acordado.':'El importe viene de una estimación preliminar; confirma el precio y el plan acordados antes de guardar.']});
}

export function draftFromQuote(quote:BillingQuote,rawAnalysis?:AiEnvelope):ContractDraft{
 const analysis=currentAnalysis(rawAnalysis,quote.id),report=analysis?.report;
 const canonical=quote.status==='accepted'&&!analysis;
 return finish({clientId:quote.clientId,projectId:quote.projectId,quoteId:canonical?quote.id:undefined,sourceQuoteId:quote.id,sourceQuoteVersion:quote.version,projectName:quote.projectName,service:quote.service,scope:[quote.scope,section('Resumen propuesto por NEXI · revisar',[report?.summary]),section('Alcance propuesto por NEXI · revisar',report?bullets(report.scope):[])].filter(Boolean).join('\n\n'),conditions:[quote.conditions,analysisConditions(analysis)].filter(Boolean).join('\n\n'),observations:[quote.observations,`Origen: cotización ${quote.number}, versión ${quote.version}.`,'Plazo indicado: '+quote.delivery+'. Confirmar las fechas antes de enviar.',analysisObservations(analysis)].filter(Boolean).join('\n\n'),baseCents:quote.baseCents,plan:structuredClone(quote.plan),delivery:quote.delivery,isDemo:quote.isDemo,source:{kind:'formal',id:quote.id,number:quote.number,revision:quote.version},analysis,warnings:[canonical?'Se conservan los términos de la cotización aceptada.':'Preparar este borrador no acepta ni cambia el estado de la cotización de origen.','Revisa alcance, condiciones, importe, fechas y modalidad antes de guardar.']});
}

export {projectFromFormalQuote} from './formal-quote-analysis';
