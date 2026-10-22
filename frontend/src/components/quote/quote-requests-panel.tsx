'use client';
import './quote-requests.css';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, CalendarDays, ChevronDown } from 'lucide-react';
import { billingRequest, pdfBlob, savePdf } from '@/lib/billing/api';
import { requestStatusLabels, type SavedQuoteRequest } from '@/lib/quote/requests';
import { money } from '@/lib/pricing';
import { quoteAnswers } from '@/lib/quote/presentation';
import { paymentPreferenceLabels } from '@/lib/quote/form';
import { useDemoAuth, RoleGate } from '@/lib/platform/auth';
import { AccountShell } from '@/components/auth/account-shell';
import { StatusBadge } from '@/components/ui/status-badge';
const nextSteps:Record<SavedQuoteRequest['status'],string>={
  pending:'Recibimos tu propuesta. El equipo revisará la información de tu proyecto.',
  reviewing:'Estamos revisando el alcance para preparar una propuesta para ti.',
  quoted:'Tu solicitud ya fue cotizada. Revisa las cotizaciones enviadas por TUKNEX.',
  closed:'Esta solicitud se ha cerrado. Puedes consultar aquí sus detalles y su PDF.',
};
export function QuoteRequestsPanel({admin=false,limit}:{admin?:boolean;limit?:number}) {
  const {user,ready}=useDemoAuth(),identity=user?.id,role=user?.role;
  const [items,setItems]=useState<SavedQuoteRequest[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const epoch=useRef(0),endpoint=(admin?'billing':'account')+'/quote-requests';
  const load=useCallback(async()=>{
    const run=++epoch.current;
    if(!ready||!identity||role!==(admin?'admin':'client')){setItems([]);setLoading(false);return;}
    setLoading(true);
    try {const next=await billingRequest<SavedQuoteRequest[]>(endpoint);if(run===epoch.current){setItems(next);setError('');}}
    catch(e){if(run===epoch.current)setError(e instanceof Error?e.message:'No pudimos cargar las solicitudes.');}
    finally {if(run===epoch.current)setLoading(false);}
  },[admin,endpoint,identity,ready,role]);
  useEffect(()=>{setItems([]);void load();const update=()=>void load();window.addEventListener('focus',update);window.addEventListener('billing-change',update);return()=>{epoch.current++;window.removeEventListener('focus',update);window.removeEventListener('billing-change',update);};},[load]);
  async function download(id:string){setBusy(true);setError('');try {const doc=await pdfBlob(endpoint+'/'+id+'/pdf');savePdf(doc.blob,doc.filename);}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el PDF.');}finally{setBusy(false);}}
  async function status(id:string,value:string){setBusy(true);setError('');try {await billingRequest(endpoint+'/'+id,{method:'PATCH',body:JSON.stringify({status:value})});await load();}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.');}finally{setBusy(false);}}
  return <section className="portal-panel quote-requests-panel" aria-label={admin?'Solicitudes del cotizador':'Mis cotizaciones preliminares'}>
    <div className="quote-request-heading"><div><p className="platform-kicker">{admin?'NUEVOS PROYECTOS':'EL INICIO DE TU PROYECTO'}</p><h2>{admin?'Solicitudes del cotizador':'Mis cotizaciones preliminares'}</h2><p>{admin?'Revisa el alcance y actualiza el seguimiento de cada solicitud.':'Consulta el estado, el importe estimado y las respuestas de cada propuesta.'}</p></div><button className="platform-secondary" disabled={loading||busy} onClick={()=>void load()}><RefreshCw size={16}/> Actualizar</button></div>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {loading&&!items.length?<p role="status">Cargando solicitudes…</p>:!items.length&&!error?<div className="account-empty"><h3>{admin?'Aún no hay solicitudes.':'Tu próximo proyecto empieza aquí.'}</h3><p>{admin?'Las propuestas guardadas por clientes aparecerán en esta sección.':'Guarda una propuesta desde el cotizador para seguir sus avances.'}</p>{!admin&&<Link className="platform-text-link" href="/cotizar">Crear una cotización</Link>}</div>:null}
    <div className="quote-requests-list">{(limit?items.slice(0,limit):items).map(item=><article className="quote-request-card" key={item.id}>
      <div className="quote-request-heading"><div className="quote-request-identity"><span className="quote-request-number">{item.number}</span><h3>{item.values.businessName||item.result.label}</h3><p>{item.result.label}</p></div><StatusBadge status={item.status}/></div>
      <div className="quote-request-summary"><div className="quote-request-estimate"><span>Inversión estimada</span><strong>{item.result.custom?'Evaluación personalizada':`${money(item.result.min)} – ${money(item.result.max)}`}</strong><small>Sujeta a revisión del alcance.</small></div><dl><div><dt><CalendarDays size={15}/> Creada el</dt><dd>{new Date(item.createdAt).toLocaleDateString('es-PE',{timeZone:'America/Lima'})}</dd></div><div><dt>Preferencia de pago</dt><dd>{paymentPreferenceLabels[item.values.paymentPreference||'unsure']}</dd></div>{admin&&<div><dt>Cliente</dt><dd>{item.values.name}<br/>{item.values.email}</dd></div>}</dl></div>
      <p className="quote-request-offering">{item.values.offering}</p><p className="quote-request-next">{nextSteps[item.status]}</p>
      <details><summary>Ver respuestas y alcance <ChevronDown size={17}/></summary><dl>{quoteAnswers(item.values).map((answer,index)=><div key={index}><dt>{answer.question}</dt><dd>{answer.value||'Sin indicar'}</dd></div>)}</dl></details>
      <div className="quote-request-actions"><button className="platform-secondary" disabled={busy} onClick={()=>void download(item.id)}><Download size={16}/> Descargar propuesta PDF</button>{admin&&<label>Seguimiento<select aria-label={'Estado de '+item.number} disabled={busy} value={item.status} onChange={e=>void status(item.id,e.target.value)}>{Object.entries(requestStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}</div>
    </article>)}</div>
    {admin&&limit&&items.length>limit&&<Link className="platform-text-link" href="/admin/solicitudes">Ver todas las solicitudes ({items.length})</Link>}
  </section>;
}
export function QuoteRequestsAdmin(){return <RoleGate allowed={['admin']}><AccountShell admin title="Solicitudes del cotizador"><h1>Solicitudes de cotización</h1><QuoteRequestsPanel admin/></AccountShell></RoleGate>;}
