'use client';
import {type ReactNode} from 'react';
import {RecordList} from '@/components/records/record-list';
import {RecordDetail} from '@/components/records/record-detail';
import {StatusBadge} from '@/components/ui/status-badge';
import {amount} from '@/lib/billing/finance';
import {contractTransitions,statusLabels,paymentModes,type BillingQuote,type Contract} from '@/lib/billing/types';
export type TeamDocumentSelection={kind:'quote'|'contract';id:string};
export function TeamDocumentRecords({quotes,contracts,busy,canCreate,onCreate,onOpen}:{
 quotes:BillingQuote[];contracts:Contract[];busy:boolean;canCreate:boolean;
 onCreate:(kind:'quote'|'contract',target:HTMLElement)=>void;onOpen:(selection:TeamDocumentSelection)=>void;
}){
 const render=(record:BillingQuote|Contract,kind:'quote'|'contract')=><div className="team-record-row"><div><strong>{record.number}</strong><span>{record.projectName}</span></div><StatusBadge status={record.status}/><span className="team-record-total">{amount(record.totalCents)}<small>Versión {record.version}</small></span><button className="platform-secondary" type="button" onClick={()=>onOpen({kind,id:record.id})}>Ver detalles<span className="sr-only"> de {record.number}</span></button></div>;
 return <>
  <section className="portal-panel"><div className="team-card-heading"><h2>Cotizaciones del proyecto</h2><button className="platform-button" disabled={busy||!canCreate} onClick={event=>onCreate('quote',event.currentTarget)}>Nueva cotización</button></div><p>{canCreate?'Las propuestas guardadas como «Enviada» estarán disponibles en la cuenta del cliente.':'Vincula primero la solicitud a una cuenta de cliente para preparar documentos comerciales.'}</p><RecordList items={quotes} getKey={q=>q.id} getSearchText={q=>[q.number,q.projectName,({draft:'Borrador',sent:'Enviada',accepted:'Aceptada',rejected:'Rechazada'})[q.status],q.totalCents/100].join(' ')} renderItem={q=>render(q,'quote')} searchLabel="Buscar cotizaciones de este proyecto" emptyMessage="Todavía no hay propuestas comerciales."/></section>
  <section className="portal-panel"><div className="team-card-heading"><h2>Contratos del proyecto</h2><button className="platform-secondary" disabled={busy||!canCreate} onClick={event=>onCreate('contract',event.currentTarget)}>Nuevo contrato</button></div><p>El cliente consulta los contratos enviados desde su cuenta. El registro de cobros sigue a cargo del administrador principal.</p><RecordList items={contracts} getKey={c=>c.id} getSearchText={c=>[c.number,c.projectName,statusLabels[c.status],c.totalCents/100].join(' ')} renderItem={c=>render(c,'contract')} searchLabel="Buscar contratos de este proyecto" emptyMessage="Todavía no hay contratos."/></section>
 </>;
}
export function TeamDocumentDetail({selection,quotes,contracts,busy,error='',notice='',onClose,onEdit,onPdf,onConvert,onStatus}:{
 selection:TeamDocumentSelection;quotes:BillingQuote[];contracts:Contract[];busy:boolean;error?:string;notice?:string;onClose:()=>void;
 onEdit:(kind:'quote'|'contract',target:HTMLElement,initial:BillingQuote|Contract)=>void;
 onPdf:(kind:'quotes'|'contracts',id:string)=>void;onConvert:(id:string)=>void;
 onStatus:(contract:Contract,status:string)=>void;
}){
 const record=selection.kind==='quote'?quotes.find(q=>q.id===selection.id):contracts.find(c=>c.id===selection.id);
 if(!record)return null;
 const quote=selection.kind==='quote'?record as BillingQuote:null,contract=selection.kind==='contract'?record as Contract:null;
 const field=(label:string,value:ReactNode)=><div><dt>{label}</dt><dd>{value||'Sin indicar'}</dd></div>;
 return <RecordDetail title={record.number+' · '+record.projectName} subtitle={<StatusBadge status={record.status}/>} onClose={onClose} actions={<><button className="platform-secondary" disabled={busy} onClick={()=>onPdf(quote?'quotes':'contracts',record.id)}>Descargar PDF</button>{((quote&&!['accepted','rejected'].includes(quote.status))||(contract&&contract.status==='borrador'))&&<button className="platform-secondary" disabled={busy} onClick={event=>onEdit(selection.kind,event.currentTarget,record)}>Editar {quote?'propuesta':'borrador'}</button>}{quote?.status==='accepted'&&<button className="platform-button" disabled={busy} onClick={()=>onConvert(quote.id)}>Preparar contrato</button>}</>}>
  <div className="team-workspace">{error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-info" role="status">{notice}</p>}<section className="portal-panel"><dl className="team-answers">{field('Proyecto',record.projectName)}{field('Importe total',amount(record.totalCents))}{field('Versión',record.version)}{field('Alcance',record.scope)}{field('Condiciones',record.conditions)}{field('Observaciones',record.observations)}{field('Plazo',quote?quote.delivery:contract?.deliveryDate)}{field('Emisión',record.issuedDate)}{quote&&field('Válida hasta',quote.validUntil)}{contract&&field('Inicio acordado',contract.startDate)}{contract&&field('Entrega acordada',contract.deliveryDate)}</dl></section>
  <section className="portal-panel"><h3>Cliente y datos del documento</h3><dl className="team-answers">{field('Nombre',record.client.name)}{field('Correo',record.client.email)}{field('Teléfono',record.client.phone)}{field('DNI / RUC declarado',record.client.taxId)}{field('Dirección',record.client.address)}</dl></section>
  <section className="portal-panel"><h3>Importes y forma de pago</h3><dl className="team-answers">{field('Precio base',amount(record.baseCents))}{field('Recargo acordado',amount(record.feeCents))}{field('Importe total',amount(record.totalCents))}{field('Modalidad',paymentModes[record.plan.mode]?.label||record.plan.mode)}{field('Número de cuotas',String(record.plan.count))}{field('Recargo porcentual',String(record.plan.rate)+'%')}{field('Primera fecha',record.plan.firstDueDate)}</dl><h4>Cronograma acordado</h4><ol className="team-document-schedule">{record.schedule.map(item=><li key={item.number}><strong>{item.label||'Cuota '+item.number}</strong><time dateTime={item.date}>{item.date}</time><span>{amount(item.amountCents)}</span></li>)}</ol></section>
  <section className="portal-panel"><h3>Datos del prestador</h3><dl className="team-answers">{field('Nombre',record.issuer.name)}{field('RUC',record.issuer.taxId)}{field('Correo',record.issuer.email)}{field('Teléfono',record.issuer.phone)}{field('Dirección',record.issuer.address)}</dl></section>
  {contract&&contractTransitions[contract.status].length>0&&<section className="portal-panel"><form className="team-inline-form" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);onStatus(contract,String(form.get('status')));}}><label>Registrar estado<select name="status" disabled={busy}>{contractTransitions[contract.status].map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><button className="platform-secondary" disabled={busy}>Aplicar estado</button></form></section>}</div>
 </RecordDetail>;
}
