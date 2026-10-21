'use client';
import {useCallback,useEffect,useState} from 'react';
import {AccountShell} from '@/components/auth/account-shell';
import {RoleGate} from '@/lib/platform/auth';
import {billingRequest} from '@/lib/billing/api';
type Message={id:string;name:string;email:string;message:string;status:'new'|'reviewed'|'closed';createdAt:string};
export function ContactInbox(){return <RoleGate allowed={['admin']}><AccountShell admin title="Mensajes de contacto"><Inbox/></AccountShell></RoleGate>;}
function Inbox(){
  const [items,setItems]=useState<Message[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{setBusy(true);try{setItems(await billingRequest<Message[]>('billing/contact-messages'));setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la bandeja.');}finally{setBusy(false);}},[]);
  useEffect(()=>{void load();},[load]);
  async function update(id:string,status:string){setBusy(true);try{await billingRequest('billing/contact-messages/'+id,{method:'PATCH',body:JSON.stringify({status})});await load();}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.');}finally{setBusy(false);}}
  return <><div className="portal-page-heading"><div><p className="platform-kicker">CONVERSACIONES QUE EMPIEZAN</p><h1>Mensajes de contacto</h1><p>Consultas recibidas desde la web. El cambio de estado no envía un correo.</p></div><button className="platform-secondary" disabled={busy} onClick={()=>void load()}>Actualizar mensajes</button></div>{error&&<p role="alert" className="platform-error">{error}</p>}{!items.length&&!busy&&!error&&<p className="portal-panel">Todavía no hay mensajes recibidos.</p>}{items.map(item=><article className="portal-panel contact-inbox-card" key={item.id}><h2>{item.name}</h2><a href={'mailto:'+item.email}>{item.email}</a><p className="platform-muted">{new Date(item.createdAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p><p className="contact-message-body">{item.message}</p><label className="platform-field">Seguimiento<select disabled={busy} value={item.status} onChange={e=>void update(item.id,e.target.value)}><option value="new">Nuevo</option><option value="reviewed">Revisado</option><option value="closed">Cerrado</option></select></label></article>)}</>;
}
