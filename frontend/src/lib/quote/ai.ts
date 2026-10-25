// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
import {z} from 'zod';
import {FEATURES} from '../pricing';
import {quoteProjectSchema,projectSuggestionSchema,type QuoteProject,type ProjectSuggestion,type ProjectChange,type ProjectField} from './project';
import {visualOptions} from './visual';

export const AI_POLICY_VERSION='2026-10-25-v1';
export const AI_MAX_INPUT_BYTES=12288;
export const AI_EVIDENCE_LABELS={
 goal:'Objetivo',offering:'Qué ofreces',sector:'Rubro',customers:'Tus clientes',problem:'Qué quieres mejorar',
 features:'Funciones elegidas',otherFunctions:'Otras necesidades',materials:'Material disponible',
 stylePreference:'Estilo',colorsLiked:'Colores preferidos',colorsDisliked:'Colores a evitar',firstImpression:'Primera impresión',
 visualPreferences:'Decisiones visuales',
} as const;
export const AI_FIELDS=Object.keys(AI_EVIDENCE_LABELS) as [keyof typeof AI_EVIDENCE_LABELS,...(keyof typeof AI_EVIDENCE_LABELS)[]];
export const aiRequestSchema=z.object({project:quoteProjectSchema,consent:z.literal(true),policyVersion:z.literal(AI_POLICY_VERSION)}).strict();
export const aiAdminRequestSchema=z.object({version:z.number().int().positive(),consent:z.literal(true),policyVersion:z.literal(AI_POLICY_VERSION)}).strict();
export const aiSuggestionItemSchema=z.object({
 title:z.string().trim().min(1).max(100),reason:z.string().trim().min(1).max(450),
 evidenceFields:z.array(z.enum(AI_FIELDS)).min(1).max(4),
 target:z.enum(['addFeature','removeFeature','palette','style','font','scale','spacing','hero','surface','sectionOrder']),
 value:z.string().trim().min(1).max(60),
}).strict();
const list=z.array(z.string().trim().min(1).max(400)).max(6);
export const aiReportSchema=z.object({
 summary:z.string().trim().min(1).max(700),scope:list,exclusions:list,questions:list,risks:list,acceptanceCriteria:list,
 visualDirection:z.string().trim().min(1).max(500),suggestions:z.array(aiSuggestionItemSchema).max(4),
}).strict();
export const aiEnvelopeSchema=z.object({
 id:z.uuid(),projectId:z.uuid(),baseRevision:z.number().int().nonnegative(),provider:z.literal('groq'),model:z.string().min(1).max(100),
 generatedAt:z.iso.datetime(),report:aiReportSchema,
}).strict();
export type AiReport=z.infer<typeof aiReportSchema>;
export type AiSuggestionItem=z.infer<typeof aiSuggestionItemSchema>;
export type AiEnvelope=z.infer<typeof aiEnvelopeSchema>;
export interface AiConfig{enabled:boolean;provider:'groq';model:string;policyVersion:typeof AI_POLICY_VERSION;dailyLimit:number;perVisitorDailyLimit:number}

export function redactAiText(value:string){
 return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[correo omitido]')
  .replace(/https?:\/\/\S+|www\.\S+/gi,'[enlace omitido]')
  .replace(/(?:\+?\d[\d\s().-]{5,}\d)/g,match=>match.replace(/\D/g,'').length>=7?'[número omitido]':match);
}
export function aiContext(project:QuoteProject){
 const result:Record<string,unknown>={};
 for(const field of AI_FIELDS){
  const value=field in project.answers?(project.answers as Record<string,unknown>)[field]:(project.visual as Record<string,unknown>)[field];
  result[field]=typeof value==='string'?redactAiText(value):value;
 }
 result.sources=Object.fromEntries(AI_FIELDS.filter(field=>project.sources[field]).map(field=>[field,project.sources[field]]));
 return result;
}
export function isCurrentAiResult(result:AiEnvelope,project:QuoteProject){
 return result.projectId===project.id&&result.baseRevision===project.revision;
}
export function aiSuggestion(project:QuoteProject,raw:AiSuggestionItem):ProjectSuggestion{
 const item=aiSuggestionItemSchema.parse(raw), context=aiContext(project);
 for(const field of item.evidenceFields){
  const value=context[field];if(value===''||value===undefined||value===null||(Array.isArray(value)&&!value.length))throw Error('La evidencia de la propuesta no está disponible.');
 }
 let change:ProjectChange;
 if(item.target==='addFeature'||item.target==='removeFeature'){
  const feature=FEATURES.find(f=>f.id===item.value);if(!feature)throw Error('Función fuera del catálogo.');
  change={answers:{features:item.target==='addFeature'?[...new Set([...project.answers.features,feature.id])]:project.answers.features.filter(id=>id!==feature.id)}};
 }else if(item.target==='palette'){
  if(!['turquesa','azul','verde','naranja','rojo','morado','dorado','rosa'].includes(item.value))throw Error('Paleta fuera de las opciones permitidas.');
  change={visual:{colorsLiked:item.value}};
 }else if(item.target==='style'){
  if(!['modern','minimal','elegant','corporate','bold'].includes(item.value))throw Error('Estilo no permitido.');
  change={visual:{stylePreference:item.value as QuoteProject['visual']['stylePreference']}};
 }else{
  const key=item.target;
  if(!Object.hasOwn(visualOptions[key].choices,item.value))throw Error('Decisión visual no permitida.');
  change={visual:{visualPreferences:{...project.visual.visualPreferences,[key]:item.value}}};
 }
 return projectSuggestionSchema.parse({id:crypto.randomUUID(),projectId:project.id,baseRevision:project.revision,reason:item.reason,evidenceFields:item.evidenceFields as ProjectField[],change});
}
export function validateAiReport(raw:unknown,project:QuoteProject):AiReport{
 const report=aiReportSchema.parse(raw);
 // Validate the entire response before exposing any proposal to the caller.
 for(const item of report.suggestions)aiSuggestion(project,item);
 return report;
}
export function aiSuggestionLabel(item:AiSuggestionItem){
 if(item.target==='addFeature'||item.target==='removeFeature')return (item.target==='addFeature'?'Añadir: ':'Quitar: ')+(FEATURES.find(f=>f.id===item.value)?.name??item.value);
 if(item.target==='palette')return 'Paleta: '+item.value;
 if(item.target==='style')return 'Estilo: '+({modern:'Moderno',minimal:'Minimalista',elegant:'Elegante',corporate:'Corporativo',bold:'Llamativo'}[item.value]??item.value);
 const option=visualOptions[item.target];return option.label+': '+(option.choices as Record<string,string>)[item.value];
}

