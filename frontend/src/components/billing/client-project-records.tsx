'use client';
import {useEffect,useState} from 'react';
import {billingRequest,pdfBlob,savePdf} from '@/lib/billing/api';
import {recordsForClient} from '@/lib/billing/client-records';
import {amount} from '@/lib/billing/finance';
import type {BillingClient,BillingQuote,Contract} from '@/lib/billing/types';
import type {SavedQuoteRequest} from '@/lib/quote/requests';
import {StatusBadge} from '@/components/ui/status-badge';
import './client-project-records.css';
export function ClientProjectRecords({client,quotes,contracts,onOpenQuote,onOpenContract}:{client:BillingClient;quotes:BillingQuote[];contracts:Contract[];onOpenQuote:(quote:BillingQuote)=>void;onOpenContract:(contract:Contract)=>void}){
 const [requests,setRequests]=useState<SavedQuoteRequest[]>([]),[loaded,setLoaded]=useState(''),[attempt,setAttempt]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();setError('');setLoaded('');void billingRequest<SavedQuoteRequest[]>('billing/quote-requests',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])}).then(items=>{if(!controller.signal.aborted){setRequests(items);setLoaded(client.id);}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No pudimos cargar las solicitudes.');});return()=>controller.abort();},[client.id,attempt]);
 const own=recordsForClient(client.id,loaded===client.id?requests:[],quotes,contracts);
 async function pdf(id:string){setBusy(true);try{const doc=await pdfBlob('billing/quote-requests/'+id+'/pdf?preview=current');savePdf(doc.blob,doc.filename);}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar.');}finally{setBusy(false);}}
 return <section className="client-project-records" aria-label="Documentos vinculados al cliente">
 <div className="billing-metrics">{[['Solicitudes del cotizador',loaded===client.id?String(own.requests.length):error?'No disponible':'Cargando…'],['Cotizaciones formales',String(own.quotes.length)],['Contratos guardados',String(own.contracts.length)]].map(([label,value])=><article className="billing-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
 {error&&<p role="alert" className="billing-error">{error} <button type="button" className="platform-secondary" onClick={()=>setAttempt(n=>n+1)}>Reintentar</button></p>}
 <h3>Solicitudes del cotizador</h3>{loaded===client.id&&!own.requests.length&&<p>No hay solicitudes vinculadas a esta cuenta.</p>}{own.requests.map(item=><article className="client-project-record" key={item.id}><div><strong>{item.values.businessName||item.result.label}</strong><span>{item.number} · {item.result.label}</span></div><StatusBadge status={item.status}/><button type="button" className="platform-secondary" disabled={busy} onClick={()=>void pdf(item.id)}>Ver propuesta PDF</button></article>)}
 <h3>Cotizaciones formales</h3>{!own.quotes.length&&<p>No hay cotizaciones formales de este cliente.</p>}{own.quotes.map(item=><article className="client-project-record" key={item.id}><div><strong>{item.projectName}</strong><span>{item.number} · {amount(item.totalCents)}</span></div><StatusBadge status={item.status}/><button type="button" className="platform-secondary" onClick={()=>onOpenQuote(item)}>Ver cotización</button></article>)}
 <h3>Contratos</h3>{!own.contracts.length&&<p>No hay contratos guardados de este cliente.</p>}{own.contracts.map(item=><article className="client-project-record" key={item.id}><div><strong>{item.projectName}</strong><span>{item.number} · {amount(item.totalCents)}</span></div><StatusBadge status={item.status}/><button type="button" className="platform-secondary" onClick={()=>onOpenContract(item)}>Ver contrato</button></article>)}
 </section>;
}
