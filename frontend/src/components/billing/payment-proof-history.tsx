'use client';
import {useEffect,useId,useState} from 'react';
import {Download,ExternalLink,FileCheck2,RefreshCw} from 'lucide-react';
import type {Payment} from '@/lib/billing/types';
import {amount} from '@/lib/billing/finance';
import {receiptMethods} from '@/lib/billing/receipts';
import {formatPaymentDate,paymentAppliedCents,paymentReceipt,paymentsForInstallment} from '@/lib/billing/payment-evidence';
import './payment-proof-history.css';

function ReceiptProof({id,scope,autoPreview}:{id:string;scope:'billing'|'account';autoPreview:boolean}){
 const [attempt,setAttempt]=useState(autoPreview?1:0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [file,setFile]=useState<{url:string;filename:string;image:boolean}|null>(null);
 useEffect(()=>{
  if(!attempt)return;
  const controller=new AbortController();let active=true,url='';const timer=setTimeout(()=>controller.abort(),20000);
  setBusy(true);setError('');setFile(null);
  void paymentReceipt(scope,id,controller.signal).then(({blob,filename})=>{if(active&&!controller.signal.aborted){url=URL.createObjectURL(blob);setFile({url,filename,image:blob.type.startsWith('image/')});}})
   .catch(e=>{if(active)setError(controller.signal.aborted?'Se agotó la espera del comprobante. Puedes volver a intentarlo.':e instanceof Error?e.message:'No pudimos cargar el comprobante.');})
   .finally(()=>{clearTimeout(timer);if(active)setBusy(false);});
  return()=>{active=false;controller.abort();clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
 },[id,scope,attempt]);
 return <div className="payment-proof-file">
  {!attempt&&<button className="platform-secondary" type="button" onClick={()=>setAttempt(1)}><FileCheck2 size={17} aria-hidden="true"/>Ver comprobante</button>}
  {busy&&<p role="status">Cargando comprobante privado…</p>}
  {error&&<p role="alert" className="platform-error">{error} <button type="button" className="platform-secondary" onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={16} aria-hidden="true"/>Reintentar</button></p>}
  {file&&<><div className="payment-proof-preview">{file.image?<a href={file.url} target="_blank" rel="noopener noreferrer" aria-label="Ampliar imagen del comprobante"><img src={file.url} alt="Comprobante adjunto al registro de este pago"/></a>:<p><FileCheck2 size={24} aria-hidden="true"/>Comprobante PDF disponible</p>}</div><div className="payment-proof-links"><a className="platform-secondary" href={file.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true"/>{file.image?'Ampliar imagen':'Abrir comprobante PDF'}</a><a className="platform-secondary" href={file.url} download={file.filename}><Download size={16} aria-hidden="true"/>Descargar comprobante</a></div></>}
 </div>;
}

export function PaymentProofHistory({payments,installmentId,receiptScope='billing',autoPreview=false,title='Pagos y comprobantes'}:{payments:Payment[];installmentId?:string;receiptScope?:'billing'|'account';autoPreview?:boolean;title?:string}){
 const titleId=useId(),visible=paymentsForInstallment(payments,installmentId);
 return <section className="payment-proof-history" aria-labelledby={titleId}>
  <h3 id={titleId}>{title}</h3>
  {!visible.length&&<p className="payment-proof-empty">Esta cuota todavía no tiene pagos registrados.</p>}
  <div className="payment-proof-list">{visible.map(payment=><article key={payment.id} className={'payment-proof-record'+(payment.voided?' is-voided':'')}>
   <header><div><strong>{amount(paymentAppliedCents(payment,installmentId))}</strong><span>{installmentId?'Aplicado a esta cuota':'Importe del pago'}</span></div><span className={'payment-proof-state'+(payment.voided?' voided':'')}>{payment.voided?'Anulado · no se suma al pagado':'Pago registrado'}</span></header>
   <dl><div><dt>Fecha del pago</dt><dd>{formatPaymentDate(payment.date)}</dd></div><div><dt>Medio de pago</dt><dd>{receiptMethods[payment.method]?.label||payment.method}</dd></div>{installmentId&&paymentAppliedCents(payment,installmentId)!==payment.amountCents&&<div><dt>Importe total del registro</dt><dd>{amount(payment.amountCents)}</dd></div>}<div><dt>Referencia u operación</dt><dd>{payment.reference||'Sin referencia indicada'}</dd></div>{payment.observation&&<div><dt>Observaciones</dt><dd>{payment.observation}</dd></div>}{payment.voided&&<div><dt>Motivo de anulación</dt><dd>{payment.voidReason||'Registro anulado'}</dd></div>}</dl>
   {payment.receiptId?<ReceiptProof id={payment.receiptId} scope={receiptScope} autoPreview={autoPreview}/>:<p className="payment-proof-empty">Este pago se registró sin un comprobante adjunto.</p>}
  </article>)}</div>
 </section>;
}
