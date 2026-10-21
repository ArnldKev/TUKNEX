'use client';
import './quote-requests.css';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {billingRequest,pdfBlob,savePdf} from '@/lib/billing/api';
import {requestStatusLabels,type SavedQuoteRequest} from '@/lib/quote/requests';
import {money} from '@/lib/pricing';
import {quoteAnswers} from '@/lib/quote/presentation';
import {useDemoAuth,RoleGate} from '@/lib/platform/auth';
import {AccountShell} from '@/components/auth/account-shell';
export function QuoteRequestsPanel({admin=false,limit}:{admin?:boolean;limit?:number}) {
  const {user,ready}=useDemoAuth(),identity=user?.id,role=user?.role;
  const [items,setItems]=useState<SavedQuoteRequest[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const epoch=useRef(0);
  const endpoint=(admin?'billing':'account')+'/quote-requests';
  const load=useCallback(async()=>{
    const run=++epoch.current;
    if(!ready||!identity||role!==(admin?'admin':'client')){setItems([]);setLoading(false);return;}
    setLoading(true);
    try{const next=await billingRequest<SavedQuoteRequest[]>(endpoint);if(run===epoch.current){setItems(next);setError('');}}
    catch(error){if(run===epoch.current)setError(error instanceof Error?error.message:'No pudimos cargar las solicitudes.');}
    finally{if(run===epoch.current)setLoading(false);}
  },[admin,endpoint,identity,ready,role]);
  useEffect(()=>{
    setItems([]);void load();const update=()=>void load();
    window.addEventListener('focus',update);window.addEventListener('billing-change',update);
    return()=>{epoch.current++;window.removeEventListener('focus',update);window.removeEventListener('billing-change',update);};
  },[load]);
  async function download(id:string){setBusy(true);setError('');try{const document=await pdfBlob(endpoint+'/'+id+'/pdf');savePdf(document.blob,document.filename);}catch(error){setError(error instanceof Error?error.message:'No se pudo descargar el PDF.');}finally{setBusy(false);}}
  async function status(id:string,value:string){setBusy(true);setError('');try{await billingRequest(endpoint+'/'+id,{method:'PATCH',body:JSON.stringify({status:value})});await load();}catch(error){setError(error instanceof Error?error.message:'No se pudo actualizar.');}finally{setBusy(false);}}
  return <section className="portal-panel quote-requests-panel" aria-label={admin?'Solicitudes del cotizador':'Mis cotizaciones preliminares'}>
    <div className="quote-request-heading"><div><h2>{admin?'Solicitudes del cotizador':'Mis cotizaciones preliminares'}</h2><p>{admin?'Propuestas guardadas por clientes desde el formulario.':'Estas propuestas quedan guardadas en tu cuenta y el equipo de TUKNEX puede revisarlas.'}</p></div><button className="platform-secondary" disabled={loading||busy} onClick={()=>void load()}>Actualizar solicitudes</button></div>
    {error&&<p className="platform-error" role="alert">{error}</p>}
    {loading&&!items.length?<p role="status">Cargando solicitudes…</p>:!items.length&&!error?<p>{admin?'Aún no hay solicitudes guardadas desde el cotizador.':'Aún no has guardado una cotización desde el formulario.'}</p>:null}
    {(limit?items.slice(0,limit):items).map(item=><article className="quote-request-card" key={item.id}>
      <div className="quote-request-heading"><div><strong>{item.number} · {item.values.businessName||item.result.label}</strong><p>{item.result.label} · {new Date(item.createdAt).toLocaleDateString('es-PE',{timeZone:'America/Lima'})} · {requestStatusLabels[item.status]}</p>{admin&&<p>{item.values.name} · {item.values.email}</p>}</div><strong>{item.result.custom?'Evaluación personalizada':`${money(item.result.min)} – ${money(item.result.max)}`}</strong></div>
      <p>{item.values.offering}</p><p className="platform-muted">Estimación preliminar sujeta a revisión del alcance.</p>
      <details><summary>Ver respuestas y alcance</summary><dl>{quoteAnswers(item.values).map((answer,index)=><div key={index}><dt>{answer.question}</dt><dd>{answer.value||'Sin indicar'}</dd></div>)}</dl></details>
      <div className="quote-request-actions"><button className="platform-secondary" disabled={busy} onClick={()=>void download(item.id)}>Descargar propuesta PDF</button>{admin&&<label>Seguimiento <select aria-label={'Estado de '+item.number} disabled={busy} value={item.status} onChange={event=>void status(item.id,event.target.value)}>{Object.entries(requestStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}</div>
    </article>)}
    {admin&&limit&&items.length>limit&&<Link className="platform-text-link" href="/admin/solicitudes">Ver todas las solicitudes ({items.length})</Link>}
  </section>;
}
export function QuoteRequestsAdmin(){return <RoleGate allowed={['admin']}><AccountShell admin title="Solicitudes del cotizador"><h1>Solicitudes de cotización</h1><QuoteRequestsPanel admin/></AccountShell></RoleGate>;}
