'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Sparkles,Check,X,RefreshCw,ChevronDown} from 'lucide-react';
import {AI_EVIDENCE_LABELS,aiSuggestion,aiSuggestionLabel,isCurrentAiResult,type AiConfig,type AiEnvelope} from '@/lib/quote/ai';
import {getAiConfig,analyzeAiProject} from '@/lib/quote/ai-api';
import {createQuoteProject,type QuoteProject,type ProjectSuggestion} from '@/lib/quote/project';
import type {QuoteFormValues} from '@/lib/quote/form';
import {useQuoteProjectSession} from './project-session';
import './nexi-ai.css';

export function QuoteNexiAi({disabled=false}:{disabled?:boolean}){
 const {history,acceptSuggestion,error}=useQuoteProjectSession();
 return <NexiAiPanel project={history.present} disabled={disabled||!!error} onAccept={acceptSuggestion}/>;
}
export function QuoteRequestNexiAi({id,values,disabled=false}:{id:string;values:QuoteFormValues;disabled?:boolean}){
 const project=useMemo(()=>createQuoteProject(values,id),[id,values]);
 return <NexiAiPanel project={project} draft={{id,version:1,source:'request'}} disabled={disabled}/>;
}
export function NexiAiPanel({project,draft,disabled=false,onAccept}:{
 project:QuoteProject;draft?:{id:string;version:number;source?:'request'};disabled?:boolean;onAccept?:(suggestion:ProjectSuggestion)=>boolean;
}){
 const id=useId(),[config,setConfig]=useState<AiConfig|null>(null),[configError,setConfigError]=useState(''),[checking,setChecking]=useState(true);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [result,setResult]=useState<AiEnvelope|null>(null),[dismissed,setDismissed]=useState<number[]>([]),[configAttempt,setConfigAttempt]=useState(0);
 const run=useRef(0),request=useRef<AbortController|null>(null),timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const key=project.id+':'+project.revision+':'+(draft?.version??'client'),latest=useRef(key);latest.current=key;
 const current=!!result&&isCurrentAiResult(result,project);
 useEffect(()=>{
  let active=true;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);setChecking(true);
  void getAiConfig(controller.signal).then(value=>{if(active&&!controller.signal.aborted){setConfig(value);setConfigError('');}})
   .catch(()=>{if(active)setConfigError('No pudimos comprobar NEXI. Puedes continuar con el cuestionario y volver a comprobar.');})
   .finally(()=>{clearTimeout(timer);if(active)setChecking(false);});
  return()=>{active=false;controller.abort();clearTimeout(timer);};
 },[configAttempt]);
 useEffect(()=>{
  if(request.current){if(timeout.current)clearTimeout(timeout.current);run.current++;request.current.abort();request.current=null;setBusy(false);setConsent(false);setNotice('Tu idea cambió. Solicita un análisis de esta versión.');}
 },[key]);
 useEffect(()=>()=>{run.current++;request.current?.abort();if(timeout.current)clearTimeout(timeout.current);},[]);
 function cancel(){
  run.current++;request.current?.abort();request.current=null;if(timeout.current)clearTimeout(timeout.current);
  setBusy(false);setConsent(false);setNotice('Consulta cancelada. Tus respuestas no cambiaron. La consulta puede haber consumido cuota.');setError('');
 }
 async function analyze(){
  if(!config?.enabled||!consent||busy||disabled)return;
  const captured=key,sequence=++run.current,controller=new AbortController();request.current=controller;
  timeout.current=setTimeout(()=>controller.abort(),25000);setBusy(true);setError('');setNotice('');setDismissed([]);
  try{
   const next=await analyzeAiProject(project,controller.signal,draft);
   if(run.current!==sequence||controller.signal.aborted||latest.current!==captured)return;
   setResult(next);setNotice(draft?'Análisis listo para revisión interna. La idea original no cambió.':'Análisis listo. Revisa las sugerencias antes de aplicarlas.');
  }catch(e){
   if(run.current===sequence)setError(controller.signal.aborted?'NEXI agotó el tiempo de espera. Puedes continuar sin IA y volver a intentarlo.':e instanceof Error?e.message:'No pudimos analizar la idea.');
  }finally{if(run.current===sequence){if(timeout.current)clearTimeout(timeout.current);request.current=null;setBusy(false);setConsent(false);}}
 }
 function accept(index:number){
  if(!result||!current||!onAccept||disabled)return;
  try{
   const suggestion=aiSuggestion(project,result.report.suggestions[index]);
   if(onAccept(suggestion))setNotice('Sugerencia aplicada. El boceto y el historial se actualizaron; puedes deshacerla. Solicita otro análisis para seguir.');
   else setError('Tu idea cambió antes de aplicar la sugerencia. Solicita un análisis nuevo.');
  }catch{setError('No se pudo aplicar esta sugerencia. Conservamos tus decisiones.');}
 }
 const report=result?.report;
 const groups=report?[
  {title:'Alcance propuesto',items:report.scope},{title:'Fuera del alcance o por confirmar',items:report.exclusions},
  {title:'Preguntas por resolver',items:report.questions},{title:'Dependencias y riesgos',items:report.risks},
  {title:'Cómo comprobar el resultado',items:report.acceptanceCriteria},
 ]:[];
 return <details className="nexi-ai" open={draft&&draft.source!=='request'?true:undefined}>
  <summary><Sparkles size={20} aria-hidden="true"/><span><strong>{draft?'NEXI · análisis para el equipo':'NEXI · dale forma a tu idea'}</strong><small>{draft?'Alcance y decisiones para revisar':'Sugerencias opcionales con IA'}</small></span><span className="nai-tag">IA opcional</span><ChevronDown className="nai-chevron" size={18} aria-hidden="true"/></summary>
  <div className="nai-body">
   <p>{draft?'Analiza esta revisión sin modificar la idea original. El resultado es una propuesta interna para revisar.':'Cuéntanos qué ofreces o qué quieres mejorar. NEXI puede ordenar tu idea y sugerir funciones y decisiones visuales; tú eliges cuáles aplicar.'}</p>
   {checking&&<p role="status">Comprobando disponibilidad de NEXI…</p>}
   {configError&&<p className="nai-error" role="alert">{configError} <button type="button" onClick={()=>setConfigAttempt(v=>v+1)}>Volver a comprobar</button></p>}
   {config&&!config.enabled&&<p className="nai-note">La IA aún no está activada. Puedes usar las preguntas, el boceto y las ideas locales mientras tanto.</p>}
   {config?.enabled&&<>
    <div className="nai-privacy"><p>Esta consulta envía a Groq una selección de respuestas y preferencias visuales. No enviamos los campos de cuenta, correo, móvil ni DNI. Ocultamos contactos reconocibles en el texto; revisa que no hayas escrito información personal o confidencial.</p>
     <label htmlFor={id+'-consent'}><input id={id+'-consent'} type="checkbox" checked={consent} disabled={busy||disabled} onChange={event=>setConsent(event.target.checked)}/><span>Autorizo esta consulta de IA para revisar la idea. Es independiente del guardado y no autoriza publicidad.</span></label>
     <a href="/privacidad" target="_blank" rel="noreferrer">Cómo se usan las respuestas</a>
    </div>
    <div className="nai-actions"><button type="button" className="nai-primary" disabled={!consent||busy||disabled||(!project.answers.offering.trim()&&!project.answers.problem.trim())} onClick={()=>void analyze()}><Sparkles size={17} aria-hidden="true"/>{busy?'Analizando…':draft?'Analizar esta revisión':result?'Actualizar análisis':'Analizar mi idea'}</button>
     {busy&&<button type="button" onClick={cancel}><X size={17} aria-hidden="true"/>Cancelar consulta</button>}
    </div>
    <p className="nai-note">Prueba gratuita con cupo limitado: hasta {config.perVisitorDailyLimit} consultas al día por conexión y {config.dailyLimit} para la aplicación. El proveedor puede limitar antes. Puedes continuar sin IA.</p>
   </>}
   <div aria-live="polite" aria-atomic="true">{busy&&<p className="nai-pending">NEXI está preparando ideas para esta versión…</p>}{notice&&<p className="nai-note">{notice}</p>}</div>
   {error&&<p role="alert" className="nai-error">{error} Tus respuestas se conservan.</p>}
   {result&&report&&<section className="nai-result" aria-label="Análisis de NEXI">
    <header><div><span className="nai-tag">{current?'Sugerencias por revisar':'Análisis anterior'}</span><h4>Una dirección para tu proyecto</h4></div><small>Versión del boceto {result.baseRevision+1} · Groq</small></header>
    {!current&&<p className="nai-stale" role="status">Tus respuestas cambiaron. Este análisis ya no se puede aplicar; solicita uno nuevo.</p>}
    <p className="nai-summary">{report.summary}</p>
    <p className="nai-note">Propuesta generada por IA. No confirma viabilidad, precio, plazo ni contrato.</p>
    <div className="nai-direction"><strong>Dirección visual sugerida</strong><p>{report.visualDirection}</p></div>
    {onAccept&&<div className="nai-suggestions"><h4>Decisiones que puedes probar</h4>
     {!report.suggestions.length&&<p>NEXI no propuso cambios concretos. Revisa las preguntas para precisar tu idea.</p>}
     {report.suggestions.map((item,index)=>!dismissed.includes(index)&&<article key={index}>
      <span className="nai-tag">Sugerencia · no aplicada</span><h5>{item.title}</h5><p>{item.reason}</p><strong>{aiSuggestionLabel(item)}</strong>
      <p className="nai-evidence">Se apoya en: {item.evidenceFields.map(field=>AI_EVIDENCE_LABELS[field]).join(', ')}.</p>
      <div className="nai-actions"><button type="button" disabled={!current||busy||disabled} onClick={()=>accept(index)}><Check size={16} aria-hidden="true"/>Aplicar sugerencia</button><button type="button" disabled={busy} onClick={()=>setDismissed(values=>[...values,index])}><X size={16} aria-hidden="true"/>Descartar sugerencia</button></div>
     </article>)}
    </div>}
    <div className="nai-report">{groups.map(group=><section key={group.title}><h5>{group.title}</h5>{group.items.length?<ul>{group.items.map((text,index)=><li key={index}>{text}</li>)}</ul>:<p>Sin definir en este análisis.</p>}</section>)}</div>
    {draft&&report.suggestions.length>0&&<section><h5>Ideas visuales y funcionales por revisar</h5><ul>{report.suggestions.map((item,index)=><li key={index}><strong>{aiSuggestionLabel(item)}.</strong> {item.reason} <span className="nai-evidence">Base: {item.evidenceFields.map(field=>AI_EVIDENCE_LABELS[field]).join(', ')}.</span></li>)}</ul></section>}
    <p className="nai-note">Este análisis se mantiene en esta pantalla; no se guarda como informe ni se envía al cliente. {onAccept?'Solo las sugerencias que apliques pasan al historial del proyecto.':'No modifica el borrador, la cotización ni el contrato.'}</p>
   </section>}
   {!config&& !checking&&!configError&&<button type="button" onClick={()=>setConfigAttempt(v=>v+1)}><RefreshCw size={16}/>Comprobar NEXI</button>}
  </div>
 </details>;
}

