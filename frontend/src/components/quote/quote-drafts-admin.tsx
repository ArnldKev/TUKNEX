'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { billingRequest } from '@/lib/billing/api';
import { useDemoAuth } from '@/lib/platform/auth';
import type { DraftPage, DraftSummary, DraftRevision, RemoteDraft } from '@/lib/quote/drafts';
import { quoteDefaults } from '@/lib/quote/form';
import { projectToForm, projectPreviewInput, quoteProjectSchema, type QuoteProject } from '@/lib/quote/project';
import { quoteAnswers } from '@/lib/quote/presentation';
import { LiveSolutionPreview } from './live-solution-preview';
import './quote-drafts-admin.css';

type Detail=RemoteDraft&{revisions:DraftRevision[]};
export function QuoteDraftsAdminPanel(){
  const {user,ready}=useDemoAuth();
  const [items,setItems]=useState<DraftSummary[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState('');
  const [loading,setLoading]=useState(false),[detail,setDetail]=useState<Detail|null>(null),[snapshot,setSnapshot]=useState<{project:QuoteProject;version:number;step:number}|null>(null),[opening,setOpening]=useState(false);
  const epoch=useRef(0),selection=useRef(0);
  const load=useCallback(async(after?:string)=>{
    if(!ready||user?.role!=='admin')return;
    const run=++epoch.current;setLoading(true);
    try{const page=await billingRequest<DraftPage>('billing/quote-drafts'+(after?'?cursor='+encodeURIComponent(after):''));
      if(run!==epoch.current)return;
      setItems(previous=>after?[...previous,...page.items.filter(item=>!previous.some(old=>old.id===item.id))]:page.items);setCursor(page.nextCursor);setError('');
    }catch(e){if(run===epoch.current)setError(e instanceof Error?e.message:'No se pudieron consultar los borradores.');}
    finally{if(run===epoch.current)setLoading(false);}
  },[ready,user?.id,user?.role]);
  useEffect(()=>{setItems([]);setDetail(null);setSnapshot(null);void load();return()=>{epoch.current++;selection.current++;};},[load]);
  async function open(id:string){const run=++selection.current;setOpening(true);setError('');try{
    const next=await billingRequest<Detail>('billing/quote-drafts/'+id);next.project=quoteProjectSchema.parse(next.project);
    if(run===selection.current){setDetail(next);setSnapshot({project:next.project,version:next.version,step:next.step});}
  }catch(e){if(run===selection.current){setDetail(null);setSnapshot(null);setError(e instanceof Error?e.message:'Borrador no disponible.');}}
  finally{if(run===selection.current)setOpening(false);}}
  async function revision(version:string){if(!detail)return;const run=++selection.current;setOpening(true);setError('');try{
    const next=await billingRequest<{project:QuoteProject;version:number;step:number}>('billing/quote-drafts/'+detail.id+'/versions/'+version);
    next.project=quoteProjectSchema.parse(next.project);if(run===selection.current)setSnapshot(next);
  }catch(e){if(run===selection.current)setError(e instanceof Error?e.message:'Revisión no disponible.');}finally{if(run===selection.current)setOpening(false);}}
  const preview=snapshot?projectPreviewInput(snapshot.project):null;
  return <section className="portal-panel quote-drafts-admin" aria-label="Avances compartidos del cotizador">
    <header className="qda-heading"><div><p className="platform-kicker">ANTES DEL ENVÍO FORMAL</p><h2>Avances compartidos</h2><p>Ideas que sus propietarios autorizaron a compartir. Consulta sus respuestas y el boceto sin modificar el original.</p></div><button className="platform-secondary" type="button" disabled={loading} onClick={()=>void load()}>Actualizar avances</button></header>
    <p className="qda-note">Son borradores, no solicitudes ni contratos. Pueden coexistir con una cotización guardada y no generan avisos por correo. «Datos esenciales» mide respuestas disponibles, no el avance del desarrollo.</p>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {!items.length&&!loading&&!error&&<p>No hay borradores compartidos activos. Solo aparecen después de la autorización del visitante o cliente.</p>}
    {loading&&<p role="status">Consultando avances…</p>}
    <div className="qda-grid">{items.map(item=><article key={item.id} className="qda-card">
      <span className="qda-badge">Borrador compartido · v{item.version}</span><h3>{item.title}</h3>
      <p>{item.owner?<><strong>{item.owner.name}</strong><br/>{item.owner.email}</>:'Visitante sin identificar'}</p>
      <dl><div><dt>Paso del cuestionario</dt><dd>{item.step+1} de 6</dd></div><div><dt>Datos esenciales</dt><dd>{item.progress}%</dd></div><div><dt>Última actualización</dt><dd>{new Date(item.updatedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</dd></div><div><dt>Caduca el</dt><dd>{new Date(item.expiresAt).toLocaleDateString('es-PE',{timeZone:'America/Lima'})}</dd></div></dl>
      <button className="platform-secondary" type="button" disabled={opening} onClick={()=>void open(item.id)}>Ver avance: {item.title}</button>
    </article>)}</div>
    {cursor&&<button className="platform-secondary" type="button" disabled={loading} onClick={()=>void load(cursor)}>Cargar más avances</button>}
    {detail&&snapshot&&preview&&<section className="qda-detail" aria-label="Detalle del borrador compartido">
      <div className="qda-heading"><div><h3>{detail.title}</h3><p>Revisión consultada: {snapshot.version}. Solo lectura.</p></div><button className="platform-secondary" type="button" disabled={opening} onClick={()=>void open(detail.id)}>Actualizar este borrador</button><button className="platform-secondary" type="button" onClick={()=>{selection.current++;setDetail(null);setSnapshot(null);setOpening(false);}}>Cerrar detalle</button></div>
      {items.some(item=>item.id===detail.id&&item.version!==detail.version)&&<p className="qda-note">Hay una versión más reciente. Actualiza este borrador para consultarla.</p>}
      <label className="qda-version">Revisiones conservadas<select value={snapshot.version} disabled={opening} onChange={event=>void revision(event.target.value)}>{detail.revisions.map(item=><option value={item.version} key={item.version}>Versión {item.version} · paso {item.step+1} · {new Date(item.createdAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</option>)}</select></label>
      <div className="qda-detail-grid"><div><h4>Respuestas preliminares</h4><dl>{quoteAnswers(projectToForm(snapshot.project,quoteDefaults)).filter(answer=>!['Responsable de aprobar','Consentimiento comercial opcional'].includes(answer.question)).map(answer=><div key={answer.question}><dt>{answer.question}</dt><dd>{answer.value||'Sin indicar'}</dd></div>)}</dl></div><LiveSolutionPreview {...preview}/></div>
    </section>}
  </section>;
}
