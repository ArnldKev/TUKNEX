'use client';
import {useEffect,useRef,useState} from 'react';
import {aiReportSchema,type AiReport} from '@/lib/quote/ai';
import {saveNexiReview,type NexiReportHistory,type NexiReportSource,type SavedNexiReport} from '@/lib/quote/nexi-reports';
import './nexi-ai.css';
const groups=[['scope','Alcance'],['exclusions','Exclusiones'],['questions','Preguntas pendientes'],['risks','Dependencias y riesgos'],['acceptanceCriteria','Criterios de aceptación']] as const;
type HistoryView = {data:NexiReportHistory|null;loading:boolean;error:string;refresh:()=>void};
export function NexiReportsPanel({source,history,disabled=false,onOpen}:{source:NexiReportSource;history:HistoryView;disabled?:boolean;onOpen?:(id:string)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const {loading:busy,error,refresh}=history;
 const reports=history.data?.reports,serverRevision=history.data?.sourceRevision??source.revision;
 const record=reports?.find(report=>report.id===selected);
 return <section className="nai-saved" aria-label="Informes internos guardados"><header><div><h4>Informes NEXI guardados</h4><p>Solo el equipo autorizado. La generación original y cada revisión se conservan.</p></div><button type="button" disabled={busy||disabled} onClick={refresh}>{busy?'Actualizando…':'Actualizar informes'}</button></header>
  {serverRevision!==source.revision&&<p className="nai-stale">La cotización se actualizó. Actualiza su información antes de usar o revisar informes.</p>}
  {error&&<p role="alert" className="nai-error">{error}</p>}
  {!reports&&busy&&<p role="status">Cargando historial de esta cotización…</p>}
  {reports&&!reports.length&&<p>Aún no hay informes guardados. Al analizar esta cotización, NEXI conservará el resultado para poder retomarlo.</p>}
  {!!reports?.length&&<ul className="nai-saved-list">{reports.map(report=><li key={report.id}><span><strong>{report.reviews[0]?.approved?'Revisado y aprobado por el equipo':report.reviews.length?'Revisión guardada':'Generado · pendiente de revisión'}</strong><small>Fuente v{report.sourceRevision} · {new Date(report.createdAt).toLocaleString('es-PE')}{report.sourceRevision!==serverRevision?' · Versión anterior':''}</small></span><button type="button" onClick={()=>setSelected(selected===report.id?null:report.id)}>{selected===report.id?'Cerrar informe':'Ver y revisar'}</button></li>)}</ul>}
  {record&&<Review key={record.id+':'+(record.reviews[0]?.version||0)} source={{...source,revision:serverRevision}} record={record} disabled={disabled||serverRevision!==source.revision} onSaved={refresh} onOpen={onOpen}/>}
  {reports?.length===50&&<p className="nai-note">Se muestran los 50 informes más recientes de esta fuente.</p>}
 </section>;
}
function Review({source,record,disabled,onSaved,onOpen}:{source:NexiReportSource;record:SavedNexiReport;disabled:boolean;onSaved:()=>void;onOpen?: (id:string)=>void}){
 const latest=record.reviews[0],initial=latest?.reviewed||record.envelope.report;
 const [review,setReview]=useState<AiReport>(initial),[note,setNote]=useState(latest?.internalNote||''),[approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=useRef(crypto.randomUUID()),request=useRef<AbortController|null>(null),stale=record.sourceRevision!==source.revision;
 useEffect(()=>()=>request.current?.abort(),[]);
 function edit(field:keyof AiReport,value:string|string[]){setReview(old=>({...old,[field]:value}));key.current=crypto.randomUUID();setApproved(false);}
 async function save(){
  if(busy||disabled||stale)return;const cleaned={...review,...Object.fromEntries(groups.map(([field])=>[field,review[field].map(line=>line.trim()).filter(Boolean)]))};const parsed=aiReportSchema.safeParse(cleaned);if(!parsed.success){setError('Revisa el texto: cada lista admite hasta 6 líneas de 400 caracteres y el resumen hasta 700.');return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);request.current=controller;setBusy(true);setError('');
  try{await saveNexiReview(source,record,parsed.data,approved,note,key.current,controller.signal);if(!controller.signal.aborted)onSaved();}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No se guardó la revisión.');else setError('Se agotó la espera. Actualiza el historial antes de reintentar; puede haberse guardado.');}finally{clearTimeout(timer);setBusy(false);request.current=null;}
 }
 return <article className="nai-review"><h4>Revisión del informe</h4>{stale&&<p className="nai-stale">La fuente cambió. Este informe se conserva para consulta; genera uno actualizado para aprobarlo.</p>}
  <details><summary>Ver generación original sin cambios</summary><p>{record.envelope.report.summary}</p>{groups.map(([field,label])=><section key={field}><strong>{label}</strong><ul>{record.envelope.report[field].map((line,i)=><li key={i}>{line}</li>)}</ul></section>)}</details>
  <label>Resumen revisado<textarea value={review.summary} maxLength={700} disabled={busy||disabled||stale} onChange={e=>edit('summary',e.target.value)}/></label>
  <label>Dirección visual<textarea value={review.visualDirection} maxLength={500} disabled={busy||disabled||stale} onChange={e=>edit('visualDirection',e.target.value)}/></label>
  {groups.map(([field,label])=><label key={field}>{label} · una idea por línea<textarea value={review[field].join('\n')} disabled={busy||disabled||stale} onChange={e=>edit(field,e.target.value.split('\n'))}/></label>)}
  <label>Nota interna · no se muestra al cliente<textarea value={note} maxLength={2000} disabled={busy||disabled||stale} onChange={e=>{setNote(e.target.value);key.current=crypto.randomUUID();}}/></label>
  <label className="nai-check"><input type="checkbox" checked={approved} disabled={busy||disabled||stale} onChange={e=>{setApproved(e.target.checked);key.current=crypto.randomUUID();}}/>He revisado el alcance, las restricciones y la viabilidad de esta versión.</label>
  {error&&<p className="nai-error" role="alert">{error}</p>}
  <div className="nai-actions"><button type="button" className="nai-primary" disabled={busy||disabled||stale} onClick={()=>void save()}>{busy?'Guardando…':approved?'Guardar revisión aprobada':'Guardar borrador de revisión'}</button>{latest?.approved&&onOpen&&!stale&&!disabled&&<button type="button" onClick={()=>onOpen(record.id)}>Usar revisión aprobada para preparar contrato</button>}</div>
  {!!record.reviews.length&&<details><summary>Historial de revisiones humanas ({record.reviews.length})</summary>{record.reviews.map(r=><section key={r.id}><h5>Revisión {r.version} · {r.approved?'Aprobada':'Borrador'} · {new Date(r.createdAt).toLocaleString('es-PE')}</h5><p>{r.reviewed.summary}</p>{groups.map(([field,label])=><div key={field}><strong>{label}</strong><ul>{r.reviewed[field].map((line,i)=><li key={i}>{line}</li>)}</ul></div>)}<p>Dirección visual: {r.reviewed.visualDirection}</p><p>Nota interna: {r.internalNote||'Sin notas'}</p></section>)}</details>}
 </article>;
}
