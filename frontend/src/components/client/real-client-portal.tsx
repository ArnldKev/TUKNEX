'use client';
import { VerificationPanel } from '@/components/auth/verification-panel';
import { QuoteRequestsPanel } from '@/components/quote/quote-requests-panel';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {RoleGate} from '@/lib/platform/auth';
import {billingRequest,pdfBlob,savePdf} from '@/lib/billing/api';
import type {BillingClient,BillingQuote,Contract,Installment,Payment} from '@/lib/billing/types';
import {statusLabels} from '@/lib/billing/types';
import type {User} from '@/lib/platform/types';
import {AccountShell} from '@/components/auth/account-shell';
type Data={user:User;client:BillingClient|null;quotes:BillingQuote[];contracts:Contract[];installments:Installment[];payments:Payment[]};
const money=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n/100);
export function RealClientPortal({section='overview'}:{section?:string}) {return <RoleGate allowed={['client']}><Content section={section}/></RoleGate>;}
function Content({section}:{section:string}) {
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState('');
  useEffect(()=>{let alive=true;billingRequest<Data>('account/overview').then(next=>{if(!alive)return;setData(next);setName(next.user.name);setPhone(next.client?.phone||'');setAddress(next.client?.address||'');}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  async function download(kind:string,id:string) {setBusy(true);setError('');try{const doc=await pdfBlob('account/'+kind+'/'+id+'/pdf');savePdf(doc.blob,doc.filename);}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el documento.');}finally{setBusy(false);}}
  async function profile(event:React.FormEvent) {event.preventDefault();setBusy(true);setError('');try{await billingRequest('account/profile',{method:'PATCH',body:JSON.stringify({name,phone,address})});setNotice('Perfil guardado correctamente.');}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}
  const title=section==='perfil'?'Mi perfil':section==='cotizaciones'?'Mis cotizaciones':section==='proyectos'?'Mis contratos y cuotas':'Mi espacio';
  return <AccountShell title={title}><div className="portal-page-heading"><div><p className="platform-kicker">TU CUENTA TUKNEX</p><h1>{title}</h1><p>{data?'Hola, '+data.user.name+'. Aquí encontrarás la información asociada a tu cuenta.':'Cargando tu información…'}</p></div><Link className="platform-button" href="/cotizar">Cotizar un proyecto</Link></div>
    {error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-success" role="status">{notice}</p>}
    {data&&<>
      <VerificationPanel compact={section!=='perfil'}/>
      {section==='perfil'?<form className="portal-panel auth-form" onSubmit={profile}><h2>Datos de contacto</h2><label className="platform-field">Nombre completo<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label className="platform-field">Correo<input value={data.user.email} readOnly/></label><label className="platform-field">Teléfono<input maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="platform-field">Dirección<input maxLength={200} value={address} onChange={e=>setAddress(e.target.value)}/></label><button className="platform-button" disabled={busy}>Guardar perfil</button></form>:['mensajes','resenas'].includes(section)?<section className="portal-panel"><h2>Esta función aún no está habilitada.</h2><p>Para consultas sobre tu proyecto, contacta con el equipo de TUKNEX.</p><Link href="/contacto" className="platform-button">Contactar</Link></section>:<>
        {section!=='proyectos'&&<QuoteRequestsPanel />}
        {section!=='proyectos'&&<section className="portal-panel"><h2>Cotizaciones</h2>{!data.quotes.length&&<p>Aún no tienes cotizaciones enviadas por TUKNEX.</p>}{data.quotes.map(q=><article className="pa-related-row" key={q.id}><div><strong>{q.number} · {q.projectName}</strong><p>{money(q.totalCents)} · {q.status}</p></div><button className="platform-secondary" disabled={busy} onClick={()=>void download('quotes',q.id)}>Descargar PDF</button></article>)}</section>}
        {section!=='cotizaciones'&&<><section className="portal-panel"><h2>Contratos</h2>{!data.contracts.length&&<p>Aún no tienes contratos emitidos.</p>}{data.contracts.map(c=><article className="pa-related-row" key={c.id}><div><strong>{c.number} · {c.projectName}</strong><p>{statusLabels[c.status]} · {money(c.totalCents)}</p></div><button className="platform-secondary" disabled={busy} onClick={()=>void download('contracts',c.id)}>Descargar PDF</button></article>)}</section><section className="portal-panel"><h2>Mis cuotas</h2>{!data.installments.length&&<p>Cuando se emita un contrato, aquí aparecerá su cronograma.</p>}{data.installments.map(i=><article className="pa-related-row" key={i.id}><div><strong>{data.contracts.find(c=>c.id===i.contractId)?.number} · {i.label}</strong><p>Vencimiento: {i.date} · Cuota: {money(i.amountCents)} · Saldo: {money(i.remainingCents)}</p></div></article>)}</section><section className="portal-panel"><h2>Pagos registrados</h2>{!data.payments.length&&<p>Aún no se han registrado pagos.</p>}{data.payments.map(p=><article className="pa-related-row" key={p.id}><strong>{money(p.amountCents)}</strong><p>{p.date} · {p.method}{p.voided?' · Anulado':''}</p></article>)}</section></>}
      </>}
    </>}
  </AccountShell>;
}
