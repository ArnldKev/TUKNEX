'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {getAiConfig} from '@/lib/quote/ai-api';
import {aiOrganizedEnvelopeSchema,AI_POLICY_VERSION,aiSuggestionLabel,redactAiText,type AiConfig,type AiOrganizedEnvelope} from '@/lib/quote/ai';
import {ideaOriginal,protectedIdeaDetails,type OrganizedIdea,type IdeaOriginal} from '@/lib/quote/idea';
import {organizedIdeaSuggestion} from '@/lib/quote/idea-actions';
import {billingBase} from '@/lib/billing/api';
import {useQuoteProjectSession} from './project-session';
import './nexi-ai.css';
const groups=[['requirements','Lo que necesitas'],['exclusions','Lo que no debe incluir'],['questions','Lo que falta confirmar']] as const;
export function NexiIdeaOrganizer({disabled=false}:{disabled?:boolean}){
 const {history,acceptSuggestion,undo,error:historyError}=useQuoteProjectSession(),project=history.present,id=useId();
 const [config,setConfig]=useState<AiConfig|null>(null),[checking,setChecking]=useState(true),[attempt,setAttempt]=useState(0),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [resultOriginal,setResultOriginal]=useState<IdeaOriginal|null>(null);
 const [result,setResult]=useState<AiOrganizedEnvelope|null>(null),[reviewed,setReviewed]=useState<OrganizedIdea|null>(null),[selected,setSelected]=useState<number[]>([]),[confirmed,setConfirmed]=useState(false),[appliedRevision,setAppliedRevision]=useState<number|null>(null);
 const request=useRef<AbortController|null>(null),sequence=useRef(0),latest=useRef('');
 const key=project.id+':'+project.revision;latest.current=key;const current=!!result&&result.projectId===project.id&&result.baseRevision===project.revision;
 useEffect(()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let active=true;setChecking(true);void getAiConfig(controller.signal).then(next=>{if(active)setConfig(next);}).catch(()=>{if(active)setError('No pudimos comprobar la IA. Puedes seguir escribiendo y reintentar.');}).finally(()=>{clearTimeout(timer);if(active)setChecking(false);});return()=>{active=false;controller.abort();clearTimeout(timer);};},[attempt]);
 useEffect(()=>{if(request.current){sequence.current++;request.current.abort();request.current=null;setBusy(false);setNotice('Tu idea cambió. Solicita otra interpretación para esta versión.');}setConsent(false);setConfirmed(false);},[key]);
 useEffect(()=>()=>{sequence.current++;request.current?.abort();},[]);
 function cancel(){sequence.current++;request.current?.abort();request.current=null;setBusy(false);setConsent(false);setNotice('Consulta cancelada. El texto original se conserva; puede haberse consumido una consulta de IA.');}
 async function organize(){
  if(!consent||!config?.enabled||busy||disabled||historyError)return;
  const controller=new AbortController(),run=++sequence.current,captured=key,timer=setTimeout(()=>controller.abort(),25000);request.current=controller;setBusy(true);setError('');setNotice('');setConfirmed(false);
  try{
   const res=await fetch(billingBase+'/api/quote-ai/organize',{method:'POST',credentials:'include',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({project,consent:true,policyVersion:AI_POLICY_VERSION})});
   if(!res.ok){const body=await res.json().catch(()=>null);throw Error(typeof body?.message==='string'?body.message:'No pudimos ordenar la idea. Puedes continuar sin IA.');}
   const envelope=aiOrganizedEnvelopeSchema.parse(await res.json());
   if(run!==sequence.current||controller.signal.aborted||captured!==latest.current)return;
   if(envelope.projectId!==project.id||envelope.baseRevision!==project.revision)throw Error('La interpretación no corresponde a esta versión.');
   setResult(envelope);setResultOriginal(ideaOriginal(project.answers));const {suggestions:_,...text}=envelope.report;void _;setReviewed(text);setSelected([]);setNotice('Interpretación lista para comparar y editar. Todavía no se aplicó.');
  }catch(e){if(run===sequence.current)setError(controller.signal.aborted?'NEXI agotó el tiempo. Tus respuestas se conservan.':e instanceof Error?e.message:'No pudimos interpretar la idea.');}
  finally{clearTimeout(timer);if(run===sequence.current){setBusy(false);request.current=null;setConsent(false);}}
 }
 function apply(){if(!result||!reviewed||!current||!confirmed||busy||disabled)return;try{if(acceptSuggestion(organizedIdeaSuggestion(project,result,{...reviewed,...Object.fromEntries(groups.map(([field])=>[field,reviewed[field].map(line=>line.trim()).filter(Boolean)]))},selected))){setAppliedRevision(project.revision+1);setResult(null);setResultOriginal(null);setReviewed(null);setNotice('Interpretación aprobada. Tus respuestas originales siguen intactas y solo se aplicaron las opciones marcadas. Puedes deshacer.');setConfirmed(false);}}catch(e){setError(e instanceof Error&&e.name!=='ZodError'?e.message:'Revisa la longitud del texto y el número de líneas antes de aprobar.');}}
 const approved=project.answers.approvedIdea;
 const original=ideaOriginal(project.answers),displayOriginal=resultOriginal||original,protectedDetails=protectedIdeaDetails(displayOriginal),originalChanged=approved&&JSON.stringify(approved.original)!==JSON.stringify(Object.fromEntries(Object.entries(original).map(([key,value])=>[key,redactAiText(value)])));
 return <details className="nexi-ai nai-organizer"><summary><span><strong>NEXI · ordenar mi idea</strong><small>Texto o dictado, más claro y sin perder lo que pediste</small></span><span className="nai-tag">Tú decides</span></summary><div className="nai-body">
  <p>Organizamos tus respuestas como una narración, necesidades y preguntas pendientes. El texto escrito o dictado se conserva; la IA propone una interpretación separada.</p>
  {checking&&<p role="status">Comprobando NEXI…</p>}
  {!checking&&!config&&<button type="button" onClick={()=>{setError('');setAttempt(n=>n+1);}}>Reintentar conexión</button>}
  {config&&!config.enabled&&<p className="nai-note">La IA todavía no está activada. Puedes continuar con el cuestionario y el boceto.</p>}
  {config?.enabled&&<><div className="nai-privacy"><p>Al consultar se envía a Groq una selección de respuestas del proyecto. Se omiten campos de cuenta, correo, teléfono y DNI; revisa que el texto libre no incluya datos personales o confidenciales. La interpretación queda en esta pestaña y se guardará con tu solicitud únicamente si la apruebas y envías la cotización.</p><label htmlFor={id}><input id={id} type="checkbox" checked={consent} disabled={busy||disabled} onChange={e=>setConsent(e.target.checked)}/>Autorizo esta consulta para ordenar mi idea.</label><a href="/privacidad" target="_blank" rel="noreferrer">Uso de las respuestas</a></div><div className="nai-actions"><button className="nai-primary" type="button" disabled={!consent||busy||disabled||!!historyError||(!project.answers.offering.trim()&&!project.answers.problem.trim())} onClick={()=>void organize()}>{busy?'Ordenando…':'Ordenar mi idea'}</button>{busy&&<button type="button" onClick={cancel}>Cancelar consulta</button>}</div><p className="nai-note">Comparte el mismo cupo de NEXI: hasta {config.perVisitorDailyLimit} consultas diarias por conexión. Puedes continuar sin IA.</p></>}
  {notice&&<p role="status" className="nai-note">{notice}</p>}{error&&<p role="alert" className="nai-error">{error}</p>}
  {approved&&<section className="nai-approved"><strong>Interpretación aprobada guardada en tu avance</strong><p>{approved.reviewed.narrative}</p>{originalChanged&&<p className="nai-stale">Cambiaste respuestas después de aprobarla. Revisa la interpretación o genera otra antes de enviar.</p>}{appliedRevision===project.revision&&<button type="button" disabled={disabled||busy} onClick={()=>{undo();setAppliedRevision(null);setNotice('Aprobación deshecha. Tus respuestas originales se mantienen.');}}>Deshacer aprobación</button>}</section>}
  {result&&reviewed&&<section className="nai-result"><header><h4>Compara antes de aprobar</h4><span className="nai-tag">{current?'Propuesta editable · sin aplicar':'Versión anterior'}</span></header>{!current&&<p className="nai-stale">La idea cambió. Esta interpretación no se puede aplicar a la nueva versión.</p>}
   <div className="nai-comparison"><section><h5>Lo que escribiste o dictaste</h5>{Object.entries(displayOriginal).map(([field,value])=>value&&<p key={field}>{value}</p>)}{protectedDetails.length>0&&<><strong>Cantidades y restricciones originales</strong><ul>{protectedDetails.map((text,i)=><li key={i}>{text}</li>)}</ul></>}</section><section><label>Narración organizada<textarea maxLength={1600} value={reviewed.narrative} disabled={!current||busy||disabled} onChange={e=>{setReviewed({...reviewed,narrative:e.target.value});setConfirmed(false);}}/></label>{groups.map(([field,label])=><label key={field}>{label} · una idea por línea<textarea value={reviewed[field].join('\n')} disabled={!current||busy||disabled} onChange={e=>{setReviewed({...reviewed,[field]:e.target.value.split('\n')});setConfirmed(false);}}/></label>)}</section></div>
   {!!result.report.suggestions.length&&<section><h5>Opciones para el boceto · solo se aplican las que marques</h5>{result.report.suggestions.map((item,index)=><label className="nai-check" key={index}><input type="checkbox" checked={selected.includes(index)} disabled={!current||busy||disabled} onChange={e=>{setSelected(values=>e.target.checked?[...values,index]:values.filter(i=>i!==index));setConfirmed(false);}}/><span><strong>{aiSuggestionLabel(item)}</strong> · {item.reason}</span></label>)}</section>}
   <label className="nai-check"><input type="checkbox" checked={confirmed} disabled={!current||busy||disabled} onChange={e=>setConfirmed(e.target.checked)}/>Comparé el original, sus cantidades y restricciones. Apruebo esta interpretación y las opciones marcadas.</label>
   <div className="nai-actions"><button type="button" className="nai-primary" disabled={!confirmed||!current||busy||disabled} onClick={apply}>Aplicar interpretación revisada</button><button type="button" disabled={busy} onClick={()=>{setResult(null);setResultOriginal(null);setReviewed(null);setConfirmed(false);setNotice('Interpretación descartada. No modificamos tus respuestas.');}}>Descartar propuesta</button></div>
  </section>}
 </div></details>;
}
