"use client";
import {useEffect,useRef,useState} from 'react';
import {Download,FileCheck2,ExternalLink} from 'lucide-react';
import type {Contract} from '@/lib/billing/types';
import {billingRequest,pdfBlob} from '@/lib/billing/api';
import './online-contract-acceptance.css';
interface Review {documentId:string;version:number;sha256:string;consentText:string}
export function OnlineContractAcceptance({contract,onAccepted}:{contract:Contract;onAccepted?:(contract:Contract)=>void|Promise<void>}){
 const [review,setReview]=useState<Review|null>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState(contract.client.name),[ack,setAck]=useState(false),[accepted,setAccepted]=useState<Contract|null>(null);
 const current=accepted||contract,identity=contract.id+':'+contract.version,live=useRef(identity);live.current=identity;
 const fileRef=useRef(''),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;setBusy(false);setReview(null);setUrl('');setError('');setAck(false);setName(contract.client.name);setAccepted(null);if(fileRef.current)URL.revokeObjectURL(fileRef.current);fileRef.current='';return()=>{mounted.current=false;if(fileRef.current)URL.revokeObjectURL(fileRef.current);fileRef.current='';};},[identity,contract.client.name]);
 async function openPdf(){
  const key=identity;setBusy(true);setError('');setAck(false);setReview(null);setUrl('');if(fileRef.current)URL.revokeObjectURL(fileRef.current);fileRef.current='';
  try{
   const value=current.clientAcceptance?{documentId:current.clientAcceptance.documentId,version:current.clientAcceptance.acceptedVersion,sha256:current.clientAcceptance.documentSha256,consentText:current.clientAcceptance.consentText}:await billingRequest<Review>('account/contracts/'+contract.id+'/acceptance-review',{method:'POST',body:JSON.stringify({version:contract.version})});
   const {blob}=await pdfBlob('account/contracts/'+contract.id+'/acceptance-review/'+value.documentId+'/pdf');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==value.sha256)throw Error('La huella del archivo no coincide. Vuelve a abrir la revisión.');
   if(!mounted.current||live.current!==key)return;
   if(fileRef.current)URL.revokeObjectURL(fileRef.current);
   fileRef.current=URL.createObjectURL(blob);setUrl(fileRef.current);setReview(value);
  }catch(e){if(mounted.current&&live.current===key)setError(e instanceof Error?e.message:'No pudimos abrir el contrato.');}
  finally{if(mounted.current&&live.current===key)setBusy(false);}
 }
 async function accept(){
  if(!review||!ack||busy)return;
  const key=identity;setBusy(true);setError('');
  try{
   const result=await billingRequest<Contract>('account/contracts/'+contract.id+'/accept',{method:'POST',body:JSON.stringify({version:review.version,documentId:review.documentId,sha256:review.sha256,signerName:name,accepted:true,acknowledgedPdf:true})});
   if(!mounted.current||live.current!==key)return;
   setAccepted(result);setAck(false);try{await onAccepted?.(result);}catch{if(mounted.current&&live.current===key)setError('Tu aceptación se guardó. Actualiza la página para ver el estado más reciente.');}
  }catch(e){if(mounted.current&&live.current===key)setError(e instanceof Error?e.message:'No se pudo registrar tu aceptación.');}
  finally{if(mounted.current&&live.current===key)setBusy(false);}
 }
 if(current.signatureMode!=='online')return <p className="online-contract-note">Modalidad presencial o externa: coordina la firma con TUKNEX.</p>;
 const pending=!current.clientAcceptance&&['enviado','firmado_tuknex'].includes(current.status);
 return <section className="online-contract-acceptance" aria-label="Aceptación en línea del contrato">
  <h3><FileCheck2 size={20} aria-hidden="true"/>{current.clientAcceptance?'Tu aceptación quedó registrada':'Revisa tu contrato virtual'}</h3>
  {current.clientAcceptance?<p role="status">Aceptado por {current.clientAcceptance.signerName} el {new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(current.clientAcceptance.acceptedAt))}. Versión {current.clientAcceptance.acceptedVersion}.</p>:<p>Revisa el alcance, el precio, las fechas y las condiciones antes de aceptar. Puedes consultar cualquier cambio con el equipo.</p>}
  {(pending||current.clientAcceptance)&&<button type="button" className="platform-secondary" disabled={busy} onClick={()=>void openPdf()}><ExternalLink size={17} aria-hidden="true"/>{busy?'Preparando documento…':current.clientAcceptance?'Ver PDF que acepté':'Abrir PDF para revisar'}</button>}
  {url&&review&&<><div className="online-contract-document"><iframe title="Versión del contrato para revisar" src={url}/></div><div className="online-contract-links"><a href={url} target="_blank" rel="noopener noreferrer" className="platform-secondary">Abrir en otra pestaña</a><a href={url} download={contract.number+'-version-'+review.version+'.pdf'} className="platform-secondary"><Download size={16} aria-hidden="true"/>Descargar esta versión</a></div><details><summary>Identificación del documento</summary><p>Versión {review.version} · SHA-256</p><code>{review.sha256}</code></details></>}
  {pending&&review&&url&&<form onSubmit={e=>{e.preventDefault();void accept();}}><label>Nombre del titular, como figura en el contrato<input value={name} onChange={e=>setName(e.target.value)} maxLength={160} required disabled={busy}/></label><label className="online-contract-consent"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} disabled={busy}/><span>{review.consentText}</span></label><button className="platform-primary" type="submit" disabled={busy||!ack||!name.trim()}>{busy?'Registrando aceptación…':'Aceptar esta versión del contrato'}</button></form>}
  {!pending&&!current.clientAcceptance&&<p>Este contrato no está pendiente de aceptación. Consulta con TUKNEX si necesitas una nueva versión.</p>}
  {error&&<p role="alert" className="platform-error">{error}</p>}
  <p className="online-contract-note">Aceptación desde tu cuenta autenticada. No es una firma digital certificada.</p>
 </section>;
}
