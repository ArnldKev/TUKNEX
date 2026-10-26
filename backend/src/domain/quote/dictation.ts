// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
// Direct dictation only transcribes audio. It never rewrites or sends existing form text.
import {z} from 'zod';
import {AUDIO_MAX_BYTES,AUDIO_MAX_SECONDS} from './audio';

export const DICTATION_POLICY_VERSION='2026-10-25-field-dictation-v1';
export const DICTATION_FIELDS={
 businessName:{label:'Nombre del negocio',max:100},
 offering:{label:'Qué vendes u ofreces',max:300},
 city:{label:'Ciudad o zona de atención',max:120},
 website:{label:'Web o red social actual',max:300},
 customers:{label:'A quiénes atiendes',max:300},
 salesProcess:{label:'Cómo gestionas las ventas o reservas',max:600},
 problem:{label:'Qué te gustaría hacer más fácil',max:1000},
 otherFunctions:{label:'Otras funciones',max:1000},
 colorsLiked:{label:'Colores que te gustan',max:150},
 colorsDisliked:{label:'Colores que quieres evitar',max:150},
 references:{label:'Webs o estilos de referencia',max:500},
 competitor:{label:'Marca o competencia de referencia',max:200},
 firstImpression:{label:'Mensaje principal',max:300},
 previewComment:{label:'Tu opinión del boceto',max:600},
 deadlineReason:{label:'Fecha límite y motivo',max:300},
 existingDomain:{label:'Tu dominio actual',max:200},
 approver:{label:'Quién aprueba el proyecto',max:120},
 name:{label:'Tu nombre',max:120},
 email:{label:'Correo electrónico',max:null},
 phone:{label:'WhatsApp',max:20},
} as const;
export type DictationField=keyof typeof DICTATION_FIELDS;
export function isDictationField(value:string):value is DictationField{return Object.hasOwn(DICTATION_FIELDS,value);}
export const dictationFieldSchema=z.enum(Object.keys(DICTATION_FIELDS) as [DictationField,...DictationField[]]);
export const dictationPermissionSchema=z.strictObject({
 field:dictationFieldSchema,consent:z.literal('true'),policyVersion:z.literal(DICTATION_POLICY_VERSION),
});
export const dictationConfigSchema=z.strictObject({
 enabled:z.boolean(),policyVersion:z.literal(DICTATION_POLICY_VERSION),
 maxSeconds:z.literal(AUDIO_MAX_SECONDS),maxBytes:z.literal(AUDIO_MAX_BYTES),
 perConnectionDailyLimit:z.literal(20),perConnectionMinuteLimit:z.literal(4),
});
export type DictationConfig=z.infer<typeof dictationConfigSchema>;
const transcriptText=z.string().trim().min(1).max(3000);

// Keep every existing character and the full ASR output, even above the form limit.
// Names, addresses, email and numbers receive no spelling or generative correction.
export function appendDictation(current:string,text:string):string{
 const recognized=transcriptText.parse(text);
 return current+(current&&!/\s$/.test(current)?' ':'')+recognized;
}
export interface DictationTicket{readonly field:DictationField;}
export interface DictationInsertion{field:DictationField;before:string;after:string;}
type ReadField=(field:DictationField)=>string|undefined;
type WriteField=(field:DictationField,value:string)=>void;

// A provider owns one instance. Ticket identity rejects cancellation and late/duplicate results.
export class FieldDictationSession{
 private active:DictationTicket|null=null;
 private insertion:DictationInsertion|null=null;
 begin(field:DictationField):DictationTicket{
  this.active={field:dictationFieldSchema.parse(field)};return this.active;
 }
 cancel(){this.active=null;}
 cancelField(field:DictationField){
  if(this.active?.field!==field)return false;this.cancel();return true;
 }
 reset(){this.cancel();this.insertion=null;}
 apply(ticket:DictationTicket,text:string,read:ReadField,write:WriteField):DictationInsertion|null{
  if(this.active!==ticket)return null;
  const before=read(ticket.field)??'',after=appendDictation(before,text);
  this.active=null;
  write(ticket.field,after);
  this.insertion={field:ticket.field,before,after};return this.insertion;
 }
 canUndo(read:ReadField){return this.insertion!==null&&read(this.insertion.field)===this.insertion.after;}
 undo(read:ReadField,write:WriteField):boolean{
  const insertion=this.insertion;
  if(!insertion||!this.canUndo(read))return false;
  write(insertion.field,insertion.before);this.insertion=null;return true;
 }
}
