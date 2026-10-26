'use client';

import React,{createContext,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {useFormContext,useWatch} from 'react-hook-form';
import {Mic,Square,Undo2} from 'lucide-react';
import type {QuoteFormValues} from '@/lib/quote/form';
import {AUDIO_MAX_SECONDS} from '@/lib/quote/audio';
import {AudioCapture,canRecordAudio,type CaptureState} from '@/lib/quote/audio-capture';
import {getDictationConfig,transcribeField} from '@/lib/quote/field-dictation-api';
import {DICTATION_FIELDS,FieldDictationSession,type DictationField,type DictationTicket,type DictationInsertion} from '@/lib/quote/dictation';

type Phase='idle'|'requesting'|'recording'|'transcribing'|'failed';
interface DictationState{
 field:DictationField|null;phase:Phase;message:string;error:string;elapsed:number;undo:DictationInsertion|null;
}
interface ActiveRun{ticket:DictationTicket;scopeKey:string;blob:Blob|null;}
interface ContextValue{
 state:DictationState;enabled:boolean|null;configError:string;supported:boolean;disabled:boolean;
 start(field:DictationField):void;stop():void;cancel():void;release(field:DictationField):void;retry():void;undo():void;retryConfig():void;
}
const Context=createContext<ContextValue|null>(null);
const emptyState=():DictationState=>({field:null,phase:'idle',message:'',error:'',elapsed:0,undo:null});
const messageOf=(error:unknown)=>error instanceof Error?error.message:'No pudimos transcribir. Puedes seguir escribiendo.';

export function QuoteDictationProvider({children,scopeKey,disabled=false,onTranscribed}:{
 children:ReactNode;scopeKey:string;disabled?:boolean;onTranscribed?:(field:DictationField)=>void;
}){
 const form=useFormContext<QuoteFormValues>();
 const [state,setState]=useState<DictationState>(emptyState);
 const [enabled,setEnabled]=useState<boolean|null>(null),[configError,setConfigError]=useState(''),[supported,setSupported]=useState(false);
 const session=useRef(new FieldDictationSession()),capture=useRef<AudioCapture|null>(null),active=useRef<ActiveRun|null>(null);
 const request=useRef<AbortController|null>(null),configRequest=useRef<AbortController|null>(null),mounted=useRef(false);
 const latest=useRef({scopeKey,disabled,form,onTranscribed});latest.current={scopeKey,disabled,form,onTranscribed};

 function isCurrent(run:ActiveRun){
  return mounted.current&&active.current===run&&run.scopeKey===latest.current.scopeKey&&!latest.current.disabled;
 }
 function cancel(message='Dictado cancelado. Tus respuestas se mantienen.',reset=false){
  session.current.cancel();active.current=null;request.current?.abort();request.current=null;
  capture.current?.cancel(false);
  if(reset)session.current.reset();
  if(mounted.current)setState(value=>reset?emptyState():{...value,phase:'idle',error:'',message});
 }
 function read(field:DictationField){return latest.current.form.getValues(field);}
 function write(field:DictationField,value:string){
  latest.current.form.setValue(field,value,{shouldDirty:true,shouldTouch:true,shouldValidate:true});
 }
 async function transcribe(run:ActiveRun){
  if(!isCurrent(run)||!run.blob||request.current)return;
  const controller=new AbortController();request.current=controller;
  const timer=setTimeout(()=>controller.abort(),30000);
  setState(value=>({...value,phase:'transcribing',error:'',message:'Transcribiendo; puedes seguir escribiendo.'}));
  try{
   const result=await transcribeField(run.blob,run.ticket.field,controller.signal);
   if(!isCurrent(run)||request.current!==controller)return;
   if(controller.signal.aborted)throw Error('timeout');
   const insertion=session.current.apply(run.ticket,result.text,read,(field,value)=>{
    latest.current.onTranscribed?.(field);
    write(field,value);
   });
   if(!insertion)return;
   run.blob=null;active.current=null;
   const max=DICTATION_FIELDS[insertion.field].max;
   setState(value=>({...value,phase:'idle',error:'',undo:insertion,
    message:max!==null&&insertion.after.trim().length>max
     ?'Dictado añadido completo. La respuesta supera el límite; puedes editarla sin perder el texto.'
     :'Dictado añadido a tu respuesta. Puedes editarlo o deshacer esta inserción.'}));
  }catch(error){
   if(isCurrent(run)&&request.current===controller)setState(value=>({...value,phase:'failed',
    error:controller.signal.aborted?'Se agotó el tiempo. Tus respuestas se mantienen; puedes reintentar este audio.':messageOf(error),
    message:'El audio queda solo en memoria para un reintento explícito o hasta que lo canceles o salgas del paso.'}));
  }finally{
   clearTimeout(timer);if(request.current===controller)request.current=null;
  }
 }
 const callbacks=useRef<{ready(blob:Blob):void;state(value:CaptureState):void;error(message:string):void}>({ready:()=>{},state:()=>{},error:()=>{}});
 callbacks.current={
  ready:blob=>{const run=active.current;if(run&&isCurrent(run)){run.blob=blob;void transcribe(run);}},
  state:value=>{
   if(!active.current||!isCurrent(active.current))return;
   if(value==='requesting'||value==='recording')setState(current=>({...current,phase:value}));
  },
  error:message=>{
   if(!active.current||!isCurrent(active.current))return;
   session.current.cancel();active.current=null;
   setState(value=>({...value,phase:'idle',error:message,message:'Puedes volver a dictar o escribir tu respuesta.'}));
  },
 };
 async function loadConfig(){
  configRequest.current?.abort();
  const controller=new AbortController();configRequest.current=controller;
  const timer=setTimeout(()=>controller.abort(),8000);setEnabled(null);setConfigError('');
  try{
   const config=await getDictationConfig(controller.signal);
   if(mounted.current&&configRequest.current===controller&&!controller.signal.aborted)setEnabled(config.enabled);
  }catch{
   if(mounted.current&&configRequest.current===controller)setConfigError('No pudimos comprobar el dictado. Puedes seguir escribiendo.');
  }finally{clearTimeout(timer);if(configRequest.current===controller)configRequest.current=null;}
 }
 const lifecycle=useRef({cancel,loadConfig});lifecycle.current={cancel,loadConfig};
 useEffect(()=>{
  mounted.current=true;setSupported(canRecordAudio());
  capture.current=new AudioCapture({onReady:blob=>callbacks.current.ready(blob),onState:value=>callbacks.current.state(value),onError:message=>callbacks.current.error(message)});
  void lifecycle.current.loadConfig();
  const hidden=()=>{if(document.hidden)lifecycle.current.cancel('Dictado cancelado al ocultar la página. Tus respuestas se mantienen.');};
  document.addEventListener('visibilitychange',hidden);
  return()=>{
   mounted.current=false;session.current.reset();active.current=null;
   request.current?.abort();configRequest.current?.abort();capture.current?.dispose();
   document.removeEventListener('visibilitychange',hidden);
  };
 },[]);
 useEffect(()=>{lifecycle.current.cancel('',true);},[scopeKey,disabled]);
 useEffect(()=>{
  if(state.phase!=='recording')return;
  const started=Date.now(),timer=setInterval(()=>setState(value=>({...value,elapsed:Math.min(AUDIO_MAX_SECONDS,Math.floor((Date.now()-started)/1000))})),500);
  return()=>clearInterval(timer);
 },[state.phase]);

 function start(field:DictationField){
  if(disabled||!enabled||!supported)return;
  cancel('');
  const run:ActiveRun={ticket:session.current.begin(field),scopeKey:latest.current.scopeKey,blob:null};active.current=run;
  setState(value=>({...value,field,phase:'requesting',elapsed:0,error:'',message:'Esperando permiso del micrófono…'}));
  void capture.current?.start();
 }
 function retry(){
  const run=active.current;if(!run?.blob||!isCurrent(run)||state.phase!=='failed')return;
  void transcribe(run);
 }
 function undo(){
  if(disabled)return;
  if(session.current.undo(read,write))setState(value=>({...value,undo:null,error:'',message:'Se deshizo la última inserción de dictado.'}));
 }
 return <Context.Provider value={{state,enabled,configError,supported,disabled,start,
  stop:()=>capture.current?.stop(),cancel:()=>cancel(),
  release:field=>{if(session.current.cancelField(field))cancel('Dictado cancelado al ocultar esta respuesta. Tus respuestas se mantienen.');},
  retry,undo,retryConfig:()=>void loadConfig()}}>
  {children}
 </Context.Provider>;
}

export function QuoteDictationNotice(){
 const value=useContext(Context);if(!value)return null;
 return <div className="qfd-notice" id="quote-dictation-notice">
  <p>Escribe o usa el micrófono de cada respuesta. Al dictar, envías tu voz a Groq para transcribirla y añadirla al campo sin borrar lo escrito. TUKNEX no guarda la grabación.</p>
  <details><summary>Límites y uso de tu voz</summary><p>Hasta 60 segundos y 4 MB. Puedes detener o cancelar. No dictes contraseñas, DNI ni datos de otras personas. Revisa nombres, cifras y contactos: la voz no se anonimiza. No enviamos el texto previo ni usamos una segunda IA para reformularlo. <a href="/privacidad">Cómo usamos tus datos</a>.</p><p>Hasta 20 intentos al día y 4 por minuto por conexión. Los intentos fallidos o cancelados pueden consumir cuota. No hay reintentos automáticos.</p></details>
  {value.enabled===null&&!value.configError&&<p role="status">Comprobando disponibilidad del dictado…</p>}
  {value.enabled===false&&<p role="status">El dictado no está activado. Puedes responder por escrito.</p>}
  {value.configError&&<p role="alert">{value.configError} <button type="button" onClick={value.retryConfig}>Volver a comprobar dictado</button></p>}
  {value.enabled&&!value.supported&&<p>Este navegador no permite grabar aquí. Puedes escribir tu respuesta.</p>}

 </div>;
}

export function QuoteFieldDictation({field,label}:{field:DictationField;label:string}){
 const value=useContext(Context);
 return value?<FieldDictationControl value={value} field={field} label={label}/>:null;
}
function FieldDictationControl({value,field,label}:{value:ContextValue;field:DictationField;label:string}){
 const id=useId(),{control}=useFormContext<QuoteFormValues>();
 const current=useWatch({control,name:field,exact:true});
 const element=useRef<HTMLDivElement|null>(null),lifecycle=useRef(value);lifecycle.current=value;
 useEffect(()=>{
  const cleanup:(()=>void)[]=[];
  let ancestor=element.current?.parentElement??null;
  while(ancestor){
   if(ancestor instanceof HTMLDetailsElement){
    const details=ancestor,hidden=()=>{if(!details.open)lifecycle.current.release(field);};
    details.addEventListener('toggle',hidden);cleanup.push(()=>details.removeEventListener('toggle',hidden));
   }
   ancestor=ancestor.parentElement;
  }
  return()=>{cleanup.forEach(remove=>remove());lifecycle.current.release(field);};
 },[field]);
 const {state}=value,owns=state.field===field;
 const busy=state.phase==='requesting'||state.phase==='recording'||state.phase==='transcribing';
 const recording=owns&&state.phase==='recording',waiting=owns&&state.phase==='requesting';
 const undo=value.state.undo?.field===field?value.state.undo:null;
 const noticeId='qfd-'+id+'-notice',statusId='qfd-'+id+'-status';
 const max=DICTATION_FIELDS[field].max,tooLong=max!==null&&(current??'').trim().length>max;
 return <div ref={element} className="qfd-control" data-dictation-field={field}>
  <span id={noticeId} className="sr-only">El dictado envía tu voz a Groq y añade el texto a este campo. Puedes editarlo.</span>
  <div className="qfd-actions">
   <button type="button" className="qfd-mic" aria-label={recording?'Detener dictado de '+label:'Dictar '+label}
    aria-pressed={recording||waiting} aria-describedby={noticeId+' '+statusId}
    disabled={value.disabled||!value.enabled||!value.supported||busy&&!recording}
    onClick={()=>recording?value.stop():value.start(field)}>
    {recording?<Square size={16} aria-hidden="true"/>:<Mic size={16} aria-hidden="true"/>}
    {recording?'Detener':waiting?'Permiso…':'Dictar'}
   </button>
   {owns&&busy&&<button type="button" className="qfd-cancel" onClick={value.cancel}>Cancelar dictado</button>}
   {owns&&state.phase==='failed'&&<><button type="button" onClick={value.retry} disabled={value.disabled}>Reintentar este audio</button><button type="button" onClick={value.cancel}>Descartar audio</button></>}
   {undo&&<button type="button" className="qfd-undo" onClick={value.undo} disabled={value.disabled||current!==undo.after}>
    <Undo2 size={15} aria-hidden="true"/>Deshacer dictado
   </button>}
  </div>
  <p id={statusId} className="qfd-status" role="status" aria-live="polite">
   {owns&&(state.phase==='recording'?'Grabando · '+state.elapsed+' / 60 segundos':state.phase==='transcribing'?'Transcribiendo…':state.message)}
  </p>
  {owns&&state.error&&<p className="qfd-error" role="alert">{state.error}</p>}
  {tooLong&&<small className="qfd-length" role="alert">La respuesta tiene {(current??'').trim().length} caracteres; el máximo es {max}. Conservamos todo el texto para que puedas editarlo.</small>}
 </div>;
}
