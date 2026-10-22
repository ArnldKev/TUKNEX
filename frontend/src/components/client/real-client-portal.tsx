'use client';
import { VerificationPanel } from '@/components/auth/verification-panel';
import { QuoteRequestsPanel } from '@/components/quote/quote-requests-panel';
import { ClientOpinions } from '@/components/reviews/real-reviews';
import { StatusBadge } from '@/components/ui/status-badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { billingRequest, pdfBlob, savePdf } from '@/lib/billing/api';
import { todayLima } from '@/lib/billing/finance';
import type { BillingClient, BillingQuote, Contract, Installment, Payment } from '@/lib/billing/types';
import type { User } from '@/lib/platform/types';
import { AccountShell } from '@/components/auth/account-shell';
import './account-details.css';
type Data={user:User;client:BillingClient|null;quotes:BillingQuote[];contracts:Contract[];installments:Installment[];payments:Payment[]};
const money=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n/100);
export function RealClientPortal({section='overview'}:{section?:string}) {const {user}=useDemoAuth();return <RoleGate allowed={['client']}><Content key={user?.id} section={section}/></RoleGate>;}
function Content({section}:{section:string}) {
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState('');
  useEffect(()=>{let alive=true;billingRequest<Data>('account/overview').then(next=>{if(!alive)return;setData(next);setName(next.user.name);setPhone(next.client?.phone||'');setAddress(next.client?.address||'');}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  async function download(kind:string,id:string) {setBusy(true);setError('');try {const doc=await pdfBlob('account/'+kind+'/'+id+'/pdf');savePdf(doc.blob,doc.filename);}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el documento.');}finally{setBusy(false);}}
  async function profile(event:React.FormEvent) {event.preventDefault();setBusy(true);setError('');try {await billingRequest('account/profile',{method:'PATCH',body:JSON.stringify({name,phone,address})});setData(previous=>previous?{...previous,user:{...previous.user,name}}:previous);window.dispatchEvent(new Event('account-updated'));setNotice('Perfil guardado correctamente.');}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}
  const title=section==='perfil'?'Mi perfil':section==='cotizaciones'?'Mis cotizaciones':section==='proyectos'?'Mis contratos y cuotas':section==='resenas'?'Mi opinión':'Mi espacio';
  return <AccountShell title={title}><div className="portal-page-heading"><div><p className="platform-kicker">TU CUENTA TUKNEX</p><h1>{title}</h1><p>{data?'Hola, '+data.user.name+'. Aquí puedes seguir tu proyecto y conversar con TUKNEX.':'Cargando tu información…'}</p></div><Link className="platform-button" href="/cotizar">Cotizar un proyecto</Link></div>
    {error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-success" role="status">{notice}</p>}
    {data&&<>
      <VerificationPanel compact={section!=='perfil'}/>
      {section==='perfil'?<form className="portal-panel auth-form account-profile" onSubmit={profile}><h2>Datos de contacto</h2><label className="platform-field">Nombre completo<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label className="platform-field">Correo<input value={data.user.email} readOnly/></label><label className="platform-field">Teléfono<input maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="platform-field">Dirección<input maxLength={200} value={address} onChange={e=>setAddress(e.target.value)}/></label><button className="platform-button" disabled={busy}>Guardar perfil</button></form>:section==='resenas'?<ClientOpinions/>:section==='mensajes'?<section className="portal-panel account-records"><h2>Conversemos sobre tu proyecto</h2><p>Contacta con el equipo para resolver tus dudas.</p><Link href="/contacto" className="platform-button">Contactar</Link></section>:<>
        {section==='overview'&&<Link className="account-opinion-link" href="/mi-cuenta/resenas"><span><strong>Tu opinión nos ayuda a mejorar</strong><small>Comenta sobre la aplicación o el servicio de TUKNEX.</small></span><span>Compartir mi experiencia →</span></Link>}
        {section!=='proyectos'&&<QuoteRequestsPanel/>}
        {section!=='proyectos'&&<section className="portal-panel account-records"><p className="platform-kicker">PROPUESTAS DEL EQUIPO</p><h2>Cotizaciones enviadas por TUKNEX</h2>{!data.quotes.length&&<p>Cuando el equipo prepare una propuesta formal, aparecerá aquí con sus condiciones y su PDF.</p>}{data.quotes.map(q=><article className="account-record" key={q.id}><div><span className="account-record-number">{q.number}</span><h3>{q.projectName}</h3><StatusBadge status={q.status} label={q.status==='rejected'?'No aceptada':undefined}/></div><div className="account-record-value"><span>Total de la propuesta</span><strong>{money(q.totalCents)}</strong><button className="platform-secondary" disabled={busy} onClick={()=>void download('quotes',q.id)}>Descargar PDF</button></div></article>)}</section>}
        {section!=='cotizaciones'&&<><section className="portal-panel account-records"><p className="platform-kicker">ACUERDOS DE TU PROYECTO</p><h2>Mis contratos</h2>{!data.contracts.length&&<p>Aún no tienes contratos emitidos. Aquí podrás consultar su estado y descargar los documentos.</p>}{data.contracts.map(c=><article className="account-record" key={c.id}><div><span className="account-record-number">{c.number}</span><h3>{c.projectName}</h3><StatusBadge status={c.status}/></div><div className="account-record-value"><span>Importe del contrato</span><strong>{money(c.totalCents)}</strong><button className="platform-secondary" disabled={busy} onClick={()=>void download('contracts',c.id)}>Descargar PDF</button></div></article>)}</section>
        <section className="portal-panel account-records"><p className="platform-kicker">TU CRONOGRAMA</p><h2>Mis cuotas</h2>{!data.installments.length&&<p>Cuando se emita un contrato, aquí aparecerán los importes y vencimientos acordados.</p>}{data.installments.map(i=><article className="account-record" key={i.id}><div><span className="account-record-number">{data.contracts.find(c=>c.id===i.contractId)?.number}</span><h3>{i.label}</h3><p>Vencimiento: {i.date.split('-').reverse().join('/')}</p><StatusBadge status={i.remainingCents===0?'pagada':i.date<todayLima()?'vencida':'pendiente'}/></div><div className="account-record-value"><span>Saldo pendiente</span><strong>{money(i.remainingCents)}</strong><small>Importe de la cuota: {money(i.amountCents)}</small></div></article>)}</section>
        <section className="portal-panel account-records"><h2>Pagos registrados</h2>{!data.payments.length&&<p>Aún no se han registrado pagos.</p>}{data.payments.map(p=><article className="account-record" key={p.id}><div><strong>{money(p.amountCents)}</strong><p>{p.date.split('-').reverse().join('/')} · {p.method}</p></div><StatusBadge status={p.voided?'cancelado':'pagada'} label={p.voided?'Anulado':'Registrado'}/></article>)}</section></>}
      </>}
    </>}
  </AccountShell>;
}
