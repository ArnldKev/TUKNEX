'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { DEMO_MODE } from '@/config/environment';
import { useDemoAuth } from '@/lib/platform/auth';
import { DRAFT_POLICY_VERSION, draftContentKey, type DraftConfig, type DraftSummary, type RemoteDraft } from '@/lib/quote/drafts';
import { draftApi, draftRequest, validateRemoteDraft } from '@/lib/quote/draft-api';
import { DraftSync, initialDraftSync } from '@/lib/quote/draft-sync';
import { DRAFT_RECOVERY_KEY, parseDraftRecovery, type DraftRecovery } from '@/lib/quote/draft-recovery';
import { useQuoteProjectSession } from './project-session';
import './remote-draft.css';

const labels={idle:'Sin compartir',saved:'Guardado',dirty:'Cambios pendientes',saving:'Guardando…',error:'Guardado pendiente',conflict:'Hay otra versión',paused:'Guardado pausado'};
export function QuoteRemoteDraft({step,onLoadStep}:{step:number;onLoadStep:(step:number)=>void}) {
  const {history,loadProject,error:projectError}=useQuoteProjectSession();
  const auth=useDemoAuth();
  const [config,setConfig]=useState<DraftConfig|null>(null),[items,setItems]=useState<DraftSummary[]>([]);
  const [state,setState]=useState(initialDraftSync),[queue]=useState(()=>new DraftSync(draftApi.save,setState));
  const [consent,setConsent]=useState(false),[action,setAction]=useState(false),[error,setError]=useState('');
  const [copyEnabled,setCopyEnabled]=useState(false),[copy,setCopy]=useState<DraftRecovery|null>(null),[showCopy,setShowCopy]=useState(false);
  const epoch=useRef(0),latest=useRef({project:history.present,step});
  latest.current={project:history.present,step};
  const remote=state.remote,busy=action||state.status==='saving';
  const refresh=useCallback(async()=>{
    const run=++epoch.current;
    if(DEMO_MODE||!auth.ready||auth.user?.role==='admin')return;
    try {
      const [settings,list]=await Promise.all([draftApi.config(),draftApi.list()]);
      if(run!==epoch.current)return;
      setConfig(settings);setItems(list);
      try {
        const local=parseDraftRecovery(sessionStorage.getItem(DRAFT_RECOVERY_KEY));
        if(local&&list.some(item=>item.id===local.draftId))setCopy(local);
        else {setCopy(null);sessionStorage.removeItem(DRAFT_RECOVERY_KEY);}
      } catch {setCopy(null);}
    } catch {if(run===epoch.current)setError('No pudimos consultar los borradores. Puedes seguir completando tu idea.');}
  },[auth.ready,auth.user?.id,auth.user?.role]);
  useEffect(()=>{queue.activate();return()=>{queue.dispose();epoch.current++;};},[queue]);
  useEffect(()=>{
    if(queue.state.remote?.owner && queue.state.remote.owner.id!==auth.user?.id){queue.clear();setCopyEnabled(false);setCopy(null);try{sessionStorage.removeItem(DRAFT_RECOVERY_KEY);}catch{/* Storage may be unavailable; no recovery data is read. */}}
    void refresh();
    return()=>{epoch.current++;};
  },[refresh,queue,auth.user?.id]);
  useEffect(()=>{queue.update(history.present,step);},[history.present,step,remote?.id,queue]);
  useEffect(()=>{
    if(state.status!=='dirty'||!config?.enabled||projectError)return;
    const timer=setTimeout(()=>void queue.flush(),1400);
    return()=>clearTimeout(timer);
  },[history.present,step,state.status,config?.enabled,projectError,queue]);
  useEffect(()=>{
    if(!copyEnabled||!remote||history.present.id!==remote.id)return;
    const data:DraftRecovery={project:history.present,step,draftId:remote.id,serverVersion:remote.version,policyVersion:DRAFT_POLICY_VERSION,
      expiresAt:new Date(Math.min(Date.now()+86400000,new Date(remote.expiresAt).getTime())).toISOString()};
    try{sessionStorage.setItem(DRAFT_RECOVERY_KEY,JSON.stringify(data));setCopy(data);}
    catch{setError('El navegador no permitió guardar la copia de recuperación. Tus respuestas siguen en pantalla.');}
  },[copyEnabled,remote,history.present,step]);
  useEffect(()=>{
    if(!remote)return;
    const warn=(event:BeforeUnloadEvent)=>{if(['dirty','saving','error','conflict'].includes(queue.state.status)){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[remote?.id,queue]);
  async function start(){
    if(!consent||!config?.enabled||busy)return;
    setAction(true);setError('');
    try {
      await draftRequest('/session',{consent:true,policyVersion:DRAFT_POLICY_VERSION});
      const saved=validateRemoteDraft(await draftRequest<RemoteDraft>('',{...latest.current,consent:true,policyVersion:DRAFT_POLICY_VERSION,accountId:auth.user?.id||null}));
      queue.attach(saved);setItems(previous=>[saved,...previous.filter(item=>item.id!==saved.id)]);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar el guardado.');}
    finally{setAction(false);}
  }
  async function recover(id:string,useCopy=false){
    if(busy)return;setAction(true);setError('');
    try {
      const saved=await draftApi.get(id);
      if(useCopy&&copy&&saved.version!==copy.serverVersion&&draftContentKey(saved.project,saved.step)!==draftContentKey(copy.project,copy.step)){
        setShowCopy(true);setError('La copia de esta pestaña y el servidor tienen cambios diferentes. Descarga tu copia antes de recuperar la versión del servidor.');return;
      }
      queue.attach(saved);
      const chosen=useCopy&&copy?copy:saved;
      loadProject(chosen.project);onLoadStep(chosen.step);
      if(useCopy){setCopyEnabled(true);setShowCopy(false);}
    }catch(e){setError(e instanceof Error?e.message:'No se pudo recuperar el borrador.');}
    finally{setAction(false);}
  }
  async function claim(){
    if(!remote||!auth.user||busy)return;setAction(true);setError('');
    try {
      const linked=validateRemoteDraft(await draftRequest<RemoteDraft>('/'+remote.id+'/claim',{expectedVersion:remote.version,expectedUserId:auth.user.id}));
      queue.attach(linked);queue.update(latest.current.project,latest.current.step);void refresh();
    }catch(e){setError(e instanceof Error?e.message:'No se pudo vincular.');}finally{setAction(false);}
  }
  async function withdraw(){
    if(!remote||busy)return;setAction(true);setError('');
    try {
      await draftRequest('/'+remote.id+'/withdraw',{expectedVersion:remote.version});
      queue.clear();setItems(list=>list.filter(item=>item.id!==remote.id));setConsent(false);setCopyEnabled(false);setCopy(null);
      try{sessionStorage.removeItem(DRAFT_RECOVERY_KEY);}catch{setError('El borrador fue retirado del servidor. El navegador no permitió borrar la copia de esta pestaña; cierra la pestaña para descartarla.');}
    }catch(e){setError(e instanceof Error?e.message:'No se pudo retirar el borrador.');}finally{setAction(false);}
  }
  function continueWithCopy(){
    if(busy)return;
    const current=latest.current;
    queue.clear();setConsent(false);setCopyEnabled(false);setError('');
    loadProject({...current.project,id:crypto.randomUUID(),revision:0});onLoadStep(current.step);
  }
  function downloadCopy(){if(!copy)return;const url=URL.createObjectURL(new Blob([JSON.stringify(copy,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='TUKNEX-copia-del-boceto.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(DEMO_MODE||auth.user?.role==='admin'||(!config?.enabled&&!items.length&&!remote&&!error))return null;
  return <section className="quote-remote-draft" aria-label="Borrador compartido con TUKNEX">
    <header><Cloud size={22}/><div><h3>Tu idea puede seguir avanzando.</h3><p>Guarda un borrador para retomarlo y permitir que TUKNEX conozca tu idea antes del envío formal.</p></div></header>
    {!remote&&config?.enabled&&config.policyVersion===DRAFT_POLICY_VERSION&&<div>
      <label className="qrd-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/><span>Autorizo guardar mis respuestas y decisiones del boceto en el servidor y compartirlas con el equipo administrador durante {config.retentionDays} días desde la creación. No es una solicitud formal ni una autorización de publicidad. <Link href="/privacidad">Cómo usamos tus datos</Link>.</span></label>
      <p>Como visitante, podrás recuperarlo desde este navegador. Si accedes a una cuenta, podrás vincularlo. No guardamos los campos de contacto del formulario en este borrador.</p>
      <button type="button" disabled={!consent||busy||!!projectError} onClick={()=>void start()}>Activar guardado y compartir mi avance</button>
    </div>}
    {remote&&<div>
      <p className={'qrd-status qrd-'+state.status} role="status"><strong>{labels[state.status]}</strong> · versión {remote.version}{state.status==='saved'?' · '+new Date(remote.updatedAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}):''}</p>
      <p>El equipo puede consultar este avance. Se elimina del servicio activo el {new Date(remote.expiresAt).toLocaleDateString('es-PE')}. Pausar no retira lo ya compartido.</p>
      {remote.owner?<p>Vinculado a {remote.owner.name} · {remote.owner.email}</p>:<p>Visitante · vincúlalo a tu cuenta para recuperarlo desde otro dispositivo.</p>}
      <div className="qrd-actions">
        {state.status==='paused'?<button type="button" disabled={busy||!config?.enabled} onClick={()=>queue.resume()}>Reanudar guardado</button>:<button type="button" disabled={busy||state.status==='conflict'} onClick={()=>queue.pause()}><CloudOff size={16}/> Pausar guardado</button>}
        {state.status==='error'&&<button type="button" disabled={busy} onClick={()=>{queue.resume();void queue.flush();}}>Reintentar guardado</button>}
        {!remote.owner&&auth.user?.role==='client'&&<button type="button" disabled={busy||!config?.enabled} onClick={()=>void claim()}>Vincular borrador a mi cuenta</button>}
        {!remote.owner&&!auth.user&&<Link href="/acceder">Acceder a mi cuenta</Link>}
        <button type="button" disabled={busy} onClick={()=>void recover(remote.id)}>Recuperar versión del servidor</button>
        <button type="button" disabled={busy} onClick={()=>void withdraw()}>Retirar y borrar este borrador</button>
      </div>
      <small>Continuar con una copia nueva conserva lo que ves y permite crear otro borrador con autorización nueva; el anterior permanece hasta retirarlo o caducar. Recuperar reemplaza las respuestas visibles y reinicia el historial local; conserva tus contactos actuales. Retirar borra el borrador y sus revisiones del servicio activo, sin borrar una cotización ya enviada ni las respuestas en pantalla.</small>
      <label className="qrd-check"><input type="checkbox" checked={copyEnabled} disabled={busy} onChange={e=>{setCopyEnabled(e.target.checked);if(!e.target.checked){try{sessionStorage.removeItem(DRAFT_RECOVERY_KEY);}catch{setError('No se pudo borrar la copia de esta pestaña. Ciérrala para descartarla.');}setCopy(null);}}}/><span>Guardar también una copia de recuperación en esta pestaña, con los textos del boceto. Caduca como máximo en 24 horas y se pierde al cerrar la pestaña. Evítalo en equipos compartidos.</span></label>
      {state.error&&<button type="button" disabled={busy} onClick={continueWithCopy}>Continuar con una copia nueva de estas respuestas</button>}
      {state.error&&<p role="alert" className="qrd-error">{state.error} Tus respuestas actuales siguen en pantalla. Recuperar el servidor reemplaza esas respuestas; guarda una copia si necesitas conservarlas.</p>}
    </div>}
    {copy&&(!remote||showCopy||state.status==='conflict'||state.status==='error')&&<div className="qrd-recovery"><p>Hay una copia de recuperación autorizada en esta pestaña.</p><button type="button" disabled={busy} onClick={()=>void recover(copy.draftId,true)}>Recuperar copia de esta pestaña</button><button type="button" onClick={downloadCopy}>Descargar copia para conservarla</button></div>}
    {!config?.enabled&&items.length>0&&<p>El guardado está pausado. Aún puedes recuperar o retirar tus borradores anteriores.</p>}
    {items.filter(item=>item.id!==remote?.id).length>0&&<details><summary>Mis borradores disponibles</summary><p>Recuperar uno reemplaza las respuestas visibles y reinicia el historial local.</p>{items.filter(item=>item.id!==remote?.id).map(item=><article className="qrd-item" key={item.id}><strong>{item.title}</strong><span>Paso {item.step+1} · actualizado {new Date(item.updatedAt).toLocaleString('es-PE')}</span><button type="button" disabled={busy} onClick={()=>void recover(item.id)}>Recuperar {item.title}</button></article>)}</details>}
    <button type="button" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/> Actualizar borradores</button>
    {error&&<p className="qrd-error" role="alert">{error}</p>}
  </section>;
}
