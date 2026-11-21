'use client';
import {PaymentReportPanel} from './payment-report-panel';
import {ContractAddenda} from '@/components/billing/contract-addenda';
import {ProjectTrackingList} from '@/components/projects/project-tracking';
import {QuoteResponsePanel} from '@/components/billing/quote-responses';
import {VerificationPanel} from '@/components/auth/verification-panel';
import {QuoteRequestsPanel} from '@/components/quote/quote-requests-panel';
import {ClientOpinions} from '@/components/reviews/real-reviews';
import {StatusBadge} from '@/components/ui/status-badge';
import {RelatedAccountDocuments} from './account-related-documents';
import {usePrivateRecordLink} from '@/components/records/use-private-record-link';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,RefreshCw} from 'lucide-react';
import {RoleGate,useDemoAuth} from '@/lib/platform/auth';
import {billingRequest,pdfBlob,savePdf} from '@/lib/billing/api';
import {PaymentProofHistory} from '@/components/billing/payment-proof-history';
import {OnlineContractAcceptance} from '@/components/billing/online-contract-acceptance';
import {RecordDetail} from '@/components/records/record-detail';
import {RecordList} from '@/components/records/record-list';
import {todayLima} from '@/lib/billing/finance';
import {formatPaymentDate} from '@/lib/billing/payment-evidence';
import {contractStatusLabel,paymentModes,type BillingQuote,type Contract} from '@/lib/billing/types';
import {AccountShell} from '@/components/auth/account-shell';
import {accountDateTime,type AccountResource,type ClientOverview} from '@/lib/client/account-resources';
import {requestStatusLabels,type SavedQuoteRequest} from '@/lib/quote/requests';
import {useAccountResources} from './use-account-resources';
import {AccountResourceFeedback} from './account-resource-feedback';
import './account-details.css';
const money=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n/100);
type Selection={kind:'quote'|'contract'|'installment'|'payment';id:string};
export function RealClientPortal({section='overview'}:{section?:string}){
 const {user}=useDemoAuth();return <RoleGate allowed={['client']}><Content key={user?.id} identity={user?.id} section={section}/></RoleGate>;
}
function Content({section,identity}:{section:string;identity?:string}){
 const {overview,requests,updatedAt,refresh}=useAccountResources(identity),data=overview.data;
 const [actionError,setActionError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[selection,setSelection]=useState<Selection|null>(null);
 const [fields,setFields]=useState({name:'',phone:'',address:''}),[dirty,setDirty]=useState(false);
 const dirtyRef=useRef(false),editRevision=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(data&&!dirtyRef.current)setFields({name:data.user.name,phone:data.client?.phone||'',address:data.client?.address||''});},[data]);
 function edit(key:keyof typeof fields,value:string){dirtyRef.current=true;editRevision.current++;setDirty(true);setFields(previous=>({...previous,[key]:value}));}
 function discardProfile(){if(data){dirtyRef.current=false;setDirty(false);setFields({name:data.user.name,phone:data.client?.phone||'',address:data.client?.address||''});}}
 async function download(kind:'quotes'|'contracts',id:string){setBusy(true);setActionError('');try{const doc=await pdfBlob('account/'+kind+'/'+id+'/pdf');if(alive.current)savePdf(doc.blob,doc.filename);}catch(e){if(alive.current)setActionError(e instanceof Error?e.message:'No pudimos descargar el documento.');}finally{if(alive.current)setBusy(false);}}
 async function profile(event:React.FormEvent){event.preventDefault();const revision=editRevision.current,submitted={...fields};setBusy(true);setActionError('');try{await billingRequest('account/profile',{method:'PATCH',body:JSON.stringify(submitted)});if(!alive.current)return;if(editRevision.current===revision){dirtyRef.current=false;setDirty(false);}window.dispatchEvent(new Event('account-updated'));setNotice('Perfil guardado correctamente.');await refresh();}catch(e){if(alive.current)setActionError(e instanceof Error?e.message:'No se pudo guardar tu perfil. Tus cambios siguen en el formulario.');}finally{if(alive.current)setBusy(false);}}
 function openDocument(kind:'quote'|'contract',id:string){setActionError('');setSelection({kind,id});}
 const recordsReady=!!data&&!overview.loading&&!overview.error;
 const quoteLink=usePrivateRecordLink({
  parameter:'cotizacion',records:data?.quotes||[],ready:recordsReady&&(section==='cotizaciones'||section==='overview'),
  scopeKey:identity||'',onOpen:item=>openDocument('quote',item.id),
 });
 const contractLink=usePrivateRecordLink({
  parameter:'contrato',records:data?.contracts||[],ready:recordsReady&&(section==='proyectos'||section==='overview'),
  scopeKey:identity||'',onOpen:item=>openDocument('contract',item.id),
 });
 const title=section==='perfil'?'Mi perfil':section==='cotizaciones'?'Mis cotizaciones':section==='proyectos'?'Mis proyectos y pagos':section==='resenas'?'Mi opinión':'Mi espacio';
 const selectedQuote=selection?.kind==='quote'?data?.quotes.find(item=>item.id===selection.id):undefined;
 const selectedContract=selection?.kind==='contract'?data?.contracts.find(item=>item.id===selection.id):undefined;
 const selectedInstallment=selection?.kind==='installment'?data?.installments.find(item=>item.id===selection.id):undefined;
 const selectedPayment=selection?.kind==='payment'?data?.payments.find(item=>item.id===selection.id):undefined;
 const reload=()=>{void refresh();};

 const quoteActions=(quote:BillingQuote)=><button className="platform-secondary" disabled={busy} onClick={()=>void download('quotes',quote.id)}>Descargar PDF</button>;
 const contractActions=(contract:Contract)=><button className="platform-secondary" disabled={busy} onClick={()=>void download('contracts',contract.id)}>Descargar PDF</button>;
 return <AccountShell title={title}>
  <div className="portal-page-heading client-workspace-heading">
    <div>
      <p className="platform-kicker">MI CUENTA</p>
      <h1>{section==='overview'&&data?'Hola, '+data.user.name.split(/\s+/)[0]+'.':title}</h1>
      <p>{section==='overview'?'Revisa las novedades y sigue el avance de tus proyectos.':accountSectionDescription[section]}</p>
    </div>
    <button type="button" className="platform-secondary" disabled={overview.loading} onClick={reload}><RefreshCw size={17} aria-hidden="true"/>{overview.loading?'Actualizando…':'Actualizar información'}</button>
  </div>
  {(overview.loading||overview.error)&&<AccountResourceFeedback resource={overview} onRetry={reload} label="cuenta"/>}
  {(quoteLink||contractLink)&&<p className="account-doc-unavailable" role="status">{quoteLink||contractLink}</p>}
  {updatedAt&&!overview.loading&&!overview.error&&<p className="account-snapshot-time">Información actualizada el {accountDateTime(updatedAt)}.</p>}
  {actionError&&<p className="platform-error" role="alert">{actionError}</p>}{notice&&<p className="platform-success" role="status">{notice}</p>}
  {section==='overview'&&data&&<AccountDashboard data={data} requests={requests}/>}
  {data&&<VerificationPanel compact={section!=='perfil'}/>}
  {data&&section==='perfil'?<form className="portal-panel auth-form account-profile" onSubmit={profile}><h2>Datos de contacto</h2><p>Las consultas de tu cuenta no reemplazan los cambios que estás editando.</p><label className="platform-field">Nombre completo<input required minLength={2} maxLength={100} value={fields.name} onChange={e=>edit('name',e.target.value)}/></label><label className="platform-field">Correo<input value={data.user.email} readOnly/></label><label className="platform-field">Teléfono<input maxLength={30} value={fields.phone} onChange={e=>edit('phone',e.target.value)}/></label><label className="platform-field">Dirección<input maxLength={200} value={fields.address} onChange={e=>edit('address',e.target.value)}/></label>{dirty&&<p className="platform-info" role="status">Tienes cambios sin guardar.</p>}<div className="account-heading-actions"><button className="platform-button" disabled={busy||!dirty}>Guardar perfil</button>{dirty&&<button className="platform-secondary" type="button" disabled={busy} onClick={discardProfile}>Descartar cambios</button>}</div></form>:section==='resenas'?<ClientOpinions/>:section==='mensajes'?<section className="portal-panel account-records"><h2>Conversemos sobre tu proyecto</h2><p>Contacta con el equipo para resolver tus dudas.</p><Link href="/contacto" className="platform-button">Contactar</Link></section>:section!=='perfil'&&<>

   {section!=='proyectos'&&<><QuoteRequestsPanel clientResource={{resource:requests,onRetry:reload,documents:{quotes:data?.quotes||[],contracts:data?.contracts||[]}}}/><section className="portal-panel account-records" id="cotizaciones-formales"><p className="platform-kicker">PROPUESTAS DEL EQUIPO</p><h2>Cotizaciones formales</h2><p>Una propuesta comercial presenta alcance, precio y condiciones. Revisa sus detalles antes de continuar.</p>{data&&<RecordList items={data.quotes} getKey={item=>item.id} getSearchText={item=>[item.number,item.projectName,item.status].join(' ')} searchLabel="Buscar cotizaciones formales por proyecto o número" emptyMessage="Cuando el equipo envíe una propuesta formal, aparecerá aquí." pageSize={10} renderItem={item=><div className="account-compact-row"><div><strong>{item.projectName}</strong><span>{item.number} · {formatPaymentDate(item.issuedDate)}</span></div><StatusBadge status={item.status} label={item.status==='rejected'?'No aceptada':undefined}/><strong>{money(item.totalCents)}</strong><button type="button" className="platform-secondary" onClick={()=>openDocument('quote',item.id)}>Ver detalles<span className="sr-only"> de {item.number}</span></button></div>}/>}</section></>}
   {section==='proyectos'&&data&&<><ProjectTrackingList refreshKey={updatedAt||undefined}/><PaymentReportPanel contracts={data.contracts} installments={data.installments} onChanged={refresh}/></>}
   {section!=='cotizaciones'&&<><section className="portal-panel account-records" id="mis-contratos"><p className="platform-kicker">ACUERDOS DE TU PROYECTO</p><h2>Mis contratos</h2><p>Abre un contrato para revisar su alcance, descargar el PDF y consultar su modalidad de aceptación.</p>{data&&<RecordList items={data.contracts} getKey={item=>item.id} getSearchText={item=>[item.number,item.projectName,item.status].join(' ')} searchLabel="Buscar contratos por proyecto o número" emptyMessage="Aún no tienes contratos enviados." pageSize={10} renderItem={item=><div className="account-compact-row"><div><strong>{item.projectName}</strong><span>{item.number}</span></div><StatusBadge status={item.status} label={contractStatusLabel(item)}/><strong>{money(item.totalCents)}</strong><button type="button" className="platform-secondary" onClick={()=>openDocument('contract',item.id)}>{item.signatureMode==='online'&&!item.clientAcceptance&&['enviado','firmado_tuknex'].includes(item.status)?'Revisar contrato':'Ver contrato'}<span className="sr-only"> {item.number}</span></button></div>}/>}</section>
   <section className="portal-panel account-records" id="mis-cuotas"><p className="platform-kicker">TU CRONOGRAMA</p><h2>Mis cuotas</h2>{data&&<RecordList items={data.installments} getKey={item=>item.id} getSearchText={item=>[item.label,item.date,data.contracts.find(c=>c.id===item.contractId)?.number,data.contracts.find(c=>c.id===item.contractId)?.projectName].join(' ')} searchLabel="Buscar cuotas por proyecto, contrato o fecha" emptyMessage="Cuando se emita un contrato, aquí aparecerán sus cuotas." pageSize={10} renderItem={item=><div className="account-compact-row"><div><strong>{item.label}</strong><span>{data.contracts.find(c=>c.id===item.contractId)?.number} · Vence {formatPaymentDate(item.date)}</span></div><StatusBadge status={item.remainingCents===0?'pagada':item.date<todayLima()?'vencida':'pendiente'}/><div><span>Saldo pendiente</span><strong>{money(item.remainingCents)}</strong></div><button type="button" className="platform-secondary" onClick={()=>setSelection({kind:'installment',id:item.id})}>Ver pagos y comprobantes<span className="sr-only"> de {item.label}</span></button></div>}/>}</section>
   <section className="portal-panel account-records"><h2>Pagos registrados</h2>{data&&<RecordList items={data.payments} getKey={item=>item.id} getSearchText={item=>[item.reference,item.method,item.date,data.contracts.find(c=>c.id===item.contractId)?.number].join(' ')} searchLabel="Buscar pagos por referencia, contrato o fecha" emptyMessage="Aún no hay pagos registrados." pageSize={10} renderItem={item=><div className="account-compact-row"><div><strong>{money(item.amountCents)}</strong><span>{formatPaymentDate(item.date)} · {item.reference||'Sin referencia indicada'}</span></div><StatusBadge status={item.voided?'cancelado':'pagada'} label={item.voided?'Anulado':'Registrado'}/><button className="platform-secondary" type="button" onClick={()=>setSelection({kind:'payment',id:item.id})}>Ver pago y comprobante</button></div>}/>}</section></>}
  </>}
  {section==='overview'&&data&&<Link className="account-opinion-link" href="/mi-cuenta/resenas"><span><strong>Comparte tu experiencia</strong><small>Cuéntanos cómo te fue con la aplicación o el servicio.</small></span><ArrowUpRight size={20} aria-hidden="true"/></Link>}
  {data&&selectedQuote&&<RecordDetail title={selectedQuote.projectName} subtitle={selectedQuote.number} onClose={()=>setSelection(null)} actions={quoteActions(selectedQuote)}>
    <div className="account-doc-detail">
      {actionError&&<p className="platform-error" role="alert">{actionError}</p>}
      <section className="account-doc-overview" aria-label="Resumen de la cotización">
        <div className="account-doc-next">
          <StatusBadge status={selectedQuote.status} label={selectedQuote.status==='rejected'?'No aceptada':undefined}/>
          <h3>Próximo paso</h3><p>{formalQuoteNextStep(selectedQuote)}</p>
        </div>
        <dl className="account-doc-metrics">
          <div className="account-doc-money"><dt>Total propuesto</dt><dd>{money(selectedQuote.totalCents)}</dd></div>
          <div><dt>Emitida el</dt><dd>{formatPaymentDate(selectedQuote.issuedDate)}</dd></div>
          <div><dt>Válida hasta</dt><dd>{formatPaymentDate(selectedQuote.validUntil)}</dd></div>
        </dl>
      </section>
      <RelatedAccountDocuments quotes={[]} contracts={data.contracts.filter(contract=>contract.sourceQuoteId===selectedQuote.id||contract.quoteId===selectedQuote.id)}/>
      <section className="account-doc-section" aria-label="Términos de la cotización"><DocumentTerms item={selectedQuote}/></section>
      <QuoteResponsePanel quote={selectedQuote} onChanged={refresh}/>
    </div>
  </RecordDetail>}
  {data&&selectedContract&&<RecordDetail title={selectedContract.projectName} subtitle={selectedContract.number} onClose={()=>setSelection(null)} actions={contractActions(selectedContract)}>
    <div className="account-doc-detail">
      {actionError&&<p className="platform-error" role="alert">{actionError}</p>}
      <section className="account-doc-overview" aria-label="Resumen del contrato">
        <div className="account-doc-next"><StatusBadge status={selectedContract.status} label={contractStatusLabel(selectedContract)}/></div>
        <dl className="account-doc-metrics">
          <div className="account-doc-money"><dt>Total acordado</dt><dd>{money(selectedContract.totalCents)}</dd></div>
          <div><dt>Inicio</dt><dd>{formatPaymentDate(selectedContract.startDate)}</dd></div>
          <div><dt>Entrega</dt><dd>{formatPaymentDate(selectedContract.deliveryDate)}</dd></div>
        </dl>
      </section>
      <section className="account-doc-section" aria-label="Términos del contrato"><DocumentTerms item={selectedContract}/></section>
      <OnlineContractAcceptance contract={selectedContract} onAccepted={async()=>{setNotice('Aceptación registrada. Puedes descargar el contrato y su constancia.');await refresh();}}/>
      <ContractAddenda contract={selectedContract} client onChanged={refresh}/>
    </div>
  </RecordDetail>}
  {data&&selectedInstallment&&<RecordDetail title={selectedInstallment.label} subtitle={data.contracts.find(item=>item.id===selectedInstallment.contractId)?.number} onClose={()=>setSelection(null)}><div className="portal-panel account-records"><dl className="account-detail-values"><div><dt>Importe</dt><dd>{money(selectedInstallment.amountCents)}</dd></div><div><dt>Pagado</dt><dd>{money(selectedInstallment.paidCents)}</dd></div><div><dt>Saldo</dt><dd>{money(selectedInstallment.remainingCents)}</dd></div><div><dt>Vencimiento</dt><dd>{formatPaymentDate(selectedInstallment.date)}</dd></div></dl><PaymentProofHistory key={selectedInstallment.id} payments={data.payments} installmentId={selectedInstallment.id} receiptScope="account" autoPreview/></div></RecordDetail>}
  {data&&selectedPayment&&<RecordDetail title={'Pago de '+money(selectedPayment.amountCents)} subtitle={data.contracts.find(item=>item.id===selectedPayment.contractId)?.number} onClose={()=>setSelection(null)}><div className="portal-panel account-records"><PaymentProofHistory key={selectedPayment.id} payments={[selectedPayment]} receiptScope="account" autoPreview/></div></RecordDetail>}
 </AccountShell>;
}
const accountSectionDescription:Record<string,string>={
 cotizaciones:'Consulta tus solicitudes y revisa las propuestas que recibiste del equipo.',
 proyectos:'Sigue tus proyectos, revisa contratos y consulta tus pagos.',
 perfil:'Consulta y actualiza los datos que usas en TUKNEX.',
 resenas:'Cuéntanos cómo te fue con TUKNEX.',
 mensajes:'Contacta al equipo si necesitas ayuda con tu proyecto.',
};

function AccountDashboard({data,requests}:{data:ClientOverview;requests:AccountResource<SavedQuoteRequest[]>}){
 const today=todayLima();
 const contract=data.contracts.find(item=>item.signatureMode==='online'&&!item.clientAcceptance&&['enviado','firmado_tuknex'].includes(item.status));
 const quote=data.quotes.find(item=>item.status==='sent'&&item.validUntil>=today);
 const installment=data.installments.filter(item=>item.remainingCents>0).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const request=requests.data?.find(item=>item.status!=='closed');
 let next={
  title:'Crea tu próximo proyecto',
  description:'Cuéntanos qué necesitas y prepara una primera estimación.',
  href:'/cotizar',
  action:'Empezar una cotización',
 };
 if(contract){
  next={title:'Tienes un contrato por revisar',description:contract.projectName+' · '+contract.number,href:'/mi-cuenta/proyectos?contrato='+encodeURIComponent(contract.id),action:'Revisar contrato'};
 }else if(quote){
  next={title:'Tienes una propuesta por revisar',description:quote.projectName+' · '+quote.number,href:'/mi-cuenta/cotizaciones?cotizacion='+encodeURIComponent(quote.id),action:'Revisar propuesta'};
 }else if(installment){
  next={title:installment.date<today?'Tienes una cuota vencida':'Próxima cuota pendiente',description:money(installment.remainingCents)+' · '+formatPaymentDate(installment.date),href:'/mi-cuenta/proyectos#mis-cuotas',action:'Consultar mis cuotas'};
 }else if(request){
  next={title:'Sigue el estado de tu solicitud',description:(request.values.businessName||request.number)+' · '+requestStatusLabels[request.status],href:'/mi-cuenta/cotizaciones?solicitud='+encodeURIComponent(request.id),action:'Ver solicitud'};
 }else if(!requests.data&&requests.loading){
  next={title:'Consultando tus solicitudes',description:'En cuanto termine la consulta podrás ver su estado.',href:'/mi-cuenta/cotizaciones',action:'Ir a Mis cotizaciones'};
 }else if(!requests.data&&requests.error){
  next={title:'Tus solicitudes están pendientes de actualizar',description:'Vuelve a consultar tus cotizaciones para ver sus novedades.',href:'/mi-cuenta/cotizaciones',action:'Ir a Mis cotizaciones'};
 }
 return <>
  <section className="account-next-step" aria-labelledby="account-next-step-title">
    <div><p className="platform-kicker">PRÓXIMO PASO</p><h2 id="account-next-step-title">{next.title}</h2><p>{next.description}</p></div>
    <Link className="platform-button" href={next.href}>{next.action}<ArrowUpRight size={18} aria-hidden="true"/></Link>
  </section>
  <nav className="console-client-summary" aria-label="Resumen de mi proyecto">
    <Link href="/mi-cuenta/cotizaciones"><span>Solicitudes</span><strong>{requests.data?requests.data.length:requests.error?'No disponible':'Consultando…'}</strong><ArrowUpRight size={16} aria-hidden="true"/></Link>
    <Link href="/mi-cuenta/cotizaciones#cotizaciones-formales"><span>Cotizaciones formales</span><strong>{data.quotes.length}</strong><ArrowUpRight size={16} aria-hidden="true"/></Link>
    <Link href="/mi-cuenta/proyectos#mis-contratos"><span>Contratos</span><strong>{data.contracts.length}</strong><ArrowUpRight size={16} aria-hidden="true"/></Link>
    <Link href="/mi-cuenta/proyectos#mis-cuotas"><span>Saldo de cuotas</span><strong>{money(data.installments.reduce((sum,item)=>sum+item.remainingCents,0))}</strong><ArrowUpRight size={16} aria-hidden="true"/></Link>
  </nav>
 </>;
}

function formalQuoteNextStep(quote:BillingQuote){
 if(quote.status==='accepted')return 'Confirmaste esta propuesta. El contrato aparecerá en tu cuenta cuando el equipo lo envíe.';
 if(quote.status==='rejected')return 'Tu decisión quedó registrada. Puedes consultar la propuesta y su historial.';
 if(quote.validUntil<todayLima())return 'La vigencia terminó. Pide al equipo una propuesta actualizada si quieres continuar.';
 return 'Revisa el alcance y las condiciones. Puedes responder a la propuesta desde este detalle.';
}
function DocumentTerms({item}:{item:BillingQuote|Contract}){
 return <div className="account-document-terms"><h3>Alcance del servicio</h3><p>{item.scope}</p><h3>Condiciones</h3><p>{item.conditions||'Consulta las condiciones del documento PDF.'}</p>{item.observations&&<><h3>Observaciones</h3><p>{item.observations}</p></>}<h3>Forma de pago</h3><p>{paymentModes[item.plan.mode]?.label||'Según el documento'} · {item.plan.count} cuota(s)</p></div>;
}
