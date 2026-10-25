'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { FileCheck2, ImagePlus, X } from 'lucide-react';
import { receiptFileError, receiptMethods } from '@/lib/billing/receipts';
import './payment-receipt.css';
export function PaymentReceipt({method,file,onChange}:{method:string;file:File|null;onChange:(file:File|null)=>void}) {
  const [preview,setPreview]=useState(''),[error,setError]=useState(''),input=useRef<HTMLInputElement>(null),id=useId();
  const info=receiptMethods[method]||receiptMethods.otro;
  useEffect(()=>{if(!file||!file.type.startsWith('image/')){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  function choose(next:File|null) {const problem=next?receiptFileError(next):'';setError(problem);onChange(problem?null:next);if((problem||!next)&&input.current)input.current.value='';}
  return <section className="payment-receipt" aria-labelledby={id+'-title'}>
    <div className="payment-receipt-heading"><span><ImagePlus size={24}/></span><div><h3 id={id+'-title'}>Comprobante del pago</h3><p>{info.proof}</p></div><small>Opcional</small></div>
    <label htmlFor={id} className="payment-receipt-label">Seleccionar captura, foto o documento</label>
    <input ref={input} id={id} type="file" accept="image/png,image/jpeg,application/pdf" aria-describedby={id+'-help'} onChange={e=>choose(e.target.files?.[0]||null)}/>
    <p id={id+'-help'} className="payment-receipt-help">PNG, JPEG o PDF · Máximo 5 MB. Se guarda de forma privada junto al registro del pago.</p>
    {error&&<p role="alert" className="billing-error">{error}</p>}
    {file&&<div className="payment-receipt-selection">{preview?<img className="payment-receipt-preview" src={preview} alt="Vista previa del comprobante seleccionado"/>:<span className="payment-receipt-document"><FileCheck2 size={32}/></span>}<div><strong>{file.name}</strong><small>{(file.size/1024).toFixed(0)} KB · Se adjuntará al guardar el pago.</small></div><button type="button" className="platform-secondary" onClick={()=>choose(null)} aria-label="Quitar comprobante seleccionado"><X size={16}/> Quitar</button></div>}
  </section>;
}
