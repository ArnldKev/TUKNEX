'use client';
import {useCallback,useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {Search,UserCheck} from 'lucide-react';
import type {QuoteClientAccount,SavedQuoteRequest} from '@/lib/quote/requests';
import {findQuoteClientAccount,linkQuoteClient} from '@/lib/quote/staff-requests';
import './quote-client-assignment.css';

export function QuoteClientAssignment({request,disabled=false,onLinked}:{
 request:SavedQuoteRequest;disabled?:boolean;onLinked?:(saved:SavedQuoteRequest)=>void|Promise<void>;
}){
 const id=useId(),[query,setQuery]=useState(''),[matches,setMatches]=useState<QuoteClientAccount[]>([]),[selectedId,setSelectedId]=useState('');
 const [loading,setLoading]=useState(true),[linking,setLinking]=useState(false),[loaded,setLoaded]=useState(false),[searchedQuery,setSearchedQuery]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null),mounted=useRef(true),currentRequest=useRef(request.id);
 const match=matches.find(client=>client.userId===selectedId)||null;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort();};},[]);
 const loadClients=useCallback(async(term:string)=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  setLoading(true);setLoaded(false);setError('');setNotice('');setMatches([]);setSelectedId('');
  try{
   const found=await findQuoteClientAccount(term,controller.signal);
   if(mounted.current&&pending.current===controller){setMatches(found);setLoaded(true);setSearchedQuery(term.trim());}
  }catch(e){if(mounted.current&&pending.current===controller&&!controller.signal.aborted)setError(e instanceof Error?e.message:'No pudimos cargar los clientes.');}
  finally{if(mounted.current&&pending.current===controller){setLoading(false);pending.current=null;}}
 },[]);
 useEffect(()=>{
  currentRequest.current=request.id;setQuery('');setNotice('');setLinking(false);
  if(request.teamProjectId&&!request.clientId)void loadClients('');
  return()=>{pending.current?.abort();pending.current=null;};
 },[request.id,request.teamProjectId,request.clientId,loadClients]);
 function search(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!disabled&&!linking)void loadClients(query);}
 function changeQuery(value:string){
  pending.current?.abort();pending.current=null;setQuery(value);setLoading(false);setLoaded(false);setMatches([]);setSelectedId('');setError('');setNotice('');
 }
 async function link(){
  if(!match||loading||linking||disabled)return;
  const requestId=request.id;setLinking(true);setError('');
  try{
   const saved=await linkQuoteClient(request,match.userId);
   if(!mounted.current||currentRequest.current!==requestId)return;
   setNotice('Cotización asignada a '+match.name+'. Ya puede consultarla desde su cuenta.');await onLinked?.(saved);
  }catch(e){if(mounted.current&&currentRequest.current===requestId)setError(e instanceof Error?e.message:'No pudimos asignar el cliente.');}
  finally{if(mounted.current&&currentRequest.current===requestId)setLinking(false);}
 }
 if(request.clientId)return <section className="quote-client-assignment" aria-label="Cliente de esta solicitud"><h3><UserCheck size={20} aria-hidden="true"/> Cliente asignado</h3><p>{request.clientName||request.values.name||'Cuenta de cliente'}{(request.clientEmail||request.values.email)&&<> · {request.clientEmail||request.values.email}</>}</p><p>La solicitud y los documentos que se envíen desde este proyecto se consultan desde esa cuenta.</p></section>;
 if(!request.teamProjectId)return null;
 return <section className="quote-client-assignment" aria-labelledby={id+'-heading'} aria-busy={loading||linking}>
  <h3 id={id+'-heading'}><UserCheck size={20} aria-hidden="true"/> Asignar cliente</h3>
  <p>Selecciona una cuenta registrada o búscala por nombre, DNI o correo.</p>
  <div className="quote-client-picker">
   <label htmlFor={id+'-client'}>Clientes registrados</label>
   <select id={id+'-client'} value={selectedId} disabled={loading||linking||disabled||!matches.length} onChange={event=>{setSelectedId(event.target.value);setError('');setNotice('');}} aria-describedby={id+'-results'}>
    <option value="">{loading?'Cargando clientes…':'Selecciona un cliente'}</option>
    {matches.map(client=><option key={client.userId} value={client.userId}>{client.name}{client.dni?' · DNI '+client.dni:''} · {client.email}</option>)}
   </select>
   <p id={id+'-results'} className="quote-client-results" role="status">{loading?'Cargando las cuentas disponibles…':loaded?(matches.length?`${matches.length} ${matches.length===1?'cliente disponible':'clientes disponibles'}${matches.length===50?'. Mostramos hasta 50; busca para precisar los resultados.':'.'}`:searchedQuery?'No encontramos clientes con esos datos. Prueba con otro nombre, DNI o correo.':'Todavía no hay cuentas de cliente activas. El cliente debe completar su registro para poder asignarle la cotización.'):query?'Pulsa Buscar cliente para actualizar los resultados.':''}</p>
  </div>
  <form onSubmit={search} className="quote-client-search">
   <label htmlFor={id+'-query'}>Buscar cliente<input id={id+'-query'} type="search" maxLength={254} autoComplete="off" placeholder="Nombre, DNI o correo" value={query} disabled={linking||disabled} onChange={event=>changeQuery(event.target.value)}/></label>
   <button className="platform-secondary" disabled={linking||disabled}><Search size={16} aria-hidden="true"/>Buscar cliente</button>
   {(query||searchedQuery)&&<button type="button" className="platform-secondary quote-client-show-all" disabled={linking||disabled} onClick={()=>{setQuery('');void loadClients('');}}>Mostrar todos</button>}
  </form>
  {match&&<div className="quote-client-confirm"><span className="quote-client-selection-label">Cliente seleccionado</span><strong>{match.name}</strong><span>{match.email}</span>{match.dni&&<span>DNI: {match.dni}</span>}<p>Al confirmar, esta cotización aparecerá en su cuenta. El autor y el responsable del proyecto se conservarán.</p><button type="button" className="platform-button" disabled={linking||disabled} onClick={()=>void link()}>{linking?'Asignando…':'Confirmar asignación con '+match.name}</button></div>}
  {error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
