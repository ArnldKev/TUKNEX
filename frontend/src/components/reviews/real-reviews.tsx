'use client';
import { useCallback, useEffect, useState } from 'react';
import { MessageSquareHeart, Send, Star, RefreshCw } from 'lucide-react';
import { billingRequest } from '@/lib/billing/api';
import { useDemoAuth, RoleGate } from '@/lib/platform/auth';
import { opinionSubjects, opinionStatusLabels, type Opinion, type OpinionSubject, type OpinionStatus } from '@/lib/reviews';
import { AccountShell } from '@/components/auth/account-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { RatingStars } from './review-editor';
import './reviews.css';

const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación. Inténtalo de nuevo.';
export function ClientOpinions() {
  const {user}=useDemoAuth();
  const [items,setItems]=useState<Opinion[]>([]),[subject,setSubject]=useState<OpinionSubject>('application');
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{
    setError('');setLoading(true);
    try {setItems(await billingRequest<Opinion[]>('account/reviews'));}
    catch(e) {setError(errorText(e));}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const existing=items.find(r=>r.subject===subject);
  return <section className="real-opinions">
    <div className="opinions-intro"><span className="platform-pill"><MessageSquareHeart size={17}/> TU VOZ CUENTA</span><h2>¿Cómo está siendo tu experiencia?</h2><p>Cuéntanos qué te gusta y qué podemos mejorar. Puedes opinar sobre la aplicación o la atención y el servicio que recibes.</p></div>
    <div className="opinion-subjects" role="group" aria-label="Tema de tu opinión">{Object.entries(opinionSubjects).map(([value,label])=><button type="button" key={value} aria-pressed={subject===value} onClick={()=>setSubject(value as OpinionSubject)}>{label}</button>)}</div>
    {loading?<p role="status">Cargando tus opiniones…</p>:error?<div role="alert"><p className="platform-error">{error}</p><button className="platform-secondary" onClick={()=>void load()}>Reintentar</button></div>:<OpinionForm key={subject+':'+(existing?.revision||0)} subject={subject} existing={existing} name={user?.name||''} onSaved={saved=>setItems(previous=>[saved,...previous.filter(r=>r.id!==saved.id)])}/>}
  </section>;
}
function OpinionForm({subject,existing,name,onSaved}:{subject:OpinionSubject;existing?:Opinion;name:string;onSaved:(item:Opinion)=>void}) {
  const [rating,setRating]=useState(existing?.rating||5),[title,setTitle]=useState(existing?.title||'');
  const [comment,setComment]=useState(existing?.comment||''),[displayName,setDisplayName]=useState(existing?.displayName||name.slice(0,50));
  const [displayConsent,setDisplayConsent]=useState(existing?.displayConsent||false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent) {
    event.preventDefault();setError('');setBusy(true);
    try {onSaved(await billingRequest<Opinion>('account/reviews',{method:'POST',body:JSON.stringify({subject,rating,title,comment,displayName,displayConsent})}));window.dispatchEvent(new Event('reviews-change'));}
    catch(e) {setError(errorText(e));}
    finally {setBusy(false);}
  }
  return <form className="opinion-form portal-panel" onSubmit={submit}>
    {existing&&<div className="opinion-current" role="status"><StatusBadge status={existing.status==='pending'?'reviewing':existing.status} label={opinionStatusLabels[existing.status]}/><p>{existing.status==='published'?'Tu opinión está publicada. Si la editas, volverá a revisión.':existing.status==='rejected'?'Revisa la observación del equipo antes de volver a enviarla.':existing.displayConsent?'Recibimos tu opinión. El equipo la revisará antes de publicarla.':'Recibimos tu opinión como comentario privado para el equipo.'}</p>{existing.moderationNote&&<p><strong>Observación del equipo:</strong> {existing.moderationNote}</p>}{existing.businessReply&&<blockquote><strong>TUKNEX te responde</strong><p>{existing.businessReply}</p></blockquote>}</div>}
    <fieldset disabled={busy} className="opinion-fields">
      <fieldset className="opinion-rating"><legend>Tu calificación</legend><div>{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`Calificar con ${n} estrellas`} aria-pressed={rating===n} onClick={()=>setRating(n)}><Star size={28} fill={n<=rating?'currentColor':'none'}/></button>)}</div><span>{rating} de 5 estrellas</span></fieldset>
      <label className="platform-field">Título <small>Opcional</small><input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Resume tu experiencia"/></label>
      <label className="platform-field">Tu opinión<textarea required minLength={20} maxLength={1200} rows={5} value={comment} onChange={e=>setComment(e.target.value)} placeholder="¿Qué te ha resultado útil? ¿Qué podríamos mejorar?"/><small>{comment.length}/1200 caracteres · No incluyas teléfonos, contraseñas ni datos privados.</small></label>
      <label className="platform-field">Nombre para mostrar<input required minLength={2} maxLength={50} autoComplete="nickname" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>
      <label className="platform-check"><input type="checkbox" checked={displayConsent} onChange={e=>setDisplayConsent(e.target.checked)}/><span>Autorizo publicar esta opinión y el nombre elegido en la página de reseñas. Si no marco esta opción, mi comentario será privado para TUKNEX.</span></label>
      <p className="opinion-hint">Puedes actualizar tu opinión sobre cada tema. Los cambios se envían de nuevo a revisión.</p>
      {error&&<p className="platform-error" role="alert">{error}</p>}
      <button className="platform-button" type="submit" disabled={busy}><Send size={17}/>{busy?'Enviando…':existing?'Actualizar mi opinión':'Enviar mi opinión'}</button>
    </fieldset>
  </form>;
}
export function ReviewsAdmin() {return <RoleGate allowed={['admin']}><AccountShell admin title="Opiniones de clientes"><ReviewsInbox/></AccountShell></RoleGate>;}
function ReviewsInbox() {
  const [items,setItems]=useState<Opinion[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try {setItems(await billingRequest<Opinion[]>('billing/reviews'));}catch(e){setError(errorText(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  return <section className="real-opinions"><div className="opinion-admin-heading"><div><p className="platform-kicker">ESCUCHA A TUS CLIENTES</p><h1>Opiniones y experiencias</h1><p>Revisa los comentarios, responde y publica los que tengan autorización. Respeta también las críticas legítimas.</p></div><button className="platform-secondary" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/> Actualizar</button></div>{error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-success" role="status">{notice}</p>}{loading?<p role="status">Cargando opiniones…</p>:!items.length&&!error?<section className="portal-panel"><h2>Aún no hay opiniones.</h2><p>Los clientes pueden escribir desde su cuenta o desde Reseñas.</p></section>:items.map(item=><ModerationForm key={item.id+':'+item.revision} item={item} onSaved={saved=>{setNotice('Moderación guardada.');setItems(previous=>previous.map(r=>r.id===saved.id?{...saved,accountName:r.accountName}:r));window.dispatchEvent(new Event('reviews-change'));}}/>)}</section>;
}
function ModerationForm({item,onSaved}:{item:Opinion;onSaved:(item:Opinion)=>void}) {
  const [status,setStatus]=useState<OpinionStatus>(item.status),[moderationNote,setNote]=useState(item.moderationNote),[businessReply,setReply]=useState(item.businessReply);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent) {event.preventDefault();setBusy(true);setError('');try {onSaved(await billingRequest<Opinion>('billing/reviews/'+item.id,{method:'PATCH',body:JSON.stringify({status,moderationNote,businessReply,revision:item.revision})}));}catch(e){setError(errorText(e));}finally{setBusy(false);}}
  return <article className="portal-panel opinion-moderation"><div className="opinion-admin-heading"><div><p className="platform-kicker">{opinionSubjects[item.subject]}</p><h2>{item.displayName}</h2><p>Cuenta: {item.accountName} · {new Date(item.updatedAt).toLocaleDateString('es-PE',{timeZone:'America/Lima'})}</p></div><StatusBadge status={item.status==='pending'?'reviewing':item.status} label={opinionStatusLabels[item.status]}/></div><RatingStars rating={item.rating} size={20}/>{item.title&&<h3>{item.title}</h3>}<p className="opinion-comment">{item.comment}</p><p className="opinion-consent">{item.displayConsent?'✓ El cliente autoriza su publicación.':'Comentario privado: no está autorizado para publicación.'}</p><form onSubmit={submit}><fieldset disabled={busy} className="opinion-fields"><label className="platform-field">Estado<select value={status} onChange={e=>{setStatus(e.target.value as OpinionStatus);}}>{Object.entries(opinionStatusLabels).map(([value,label])=><option key={value} value={value} disabled={value==='published'&&!item.displayConsent}>{label}</option>)}</select></label><label className="platform-field">Observación privada para el cliente<textarea maxLength={500} rows={2} value={moderationNote} onChange={e=>{setNote(e.target.value);}}/></label><label className="platform-field">Respuesta de TUKNEX<textarea maxLength={1200} rows={3} value={businessReply} onChange={e=>{setReply(e.target.value);}}/><small>El cliente podrá verla. Si publicas la opinión, la respuesta también será pública.</small></label>{error&&<p className="platform-error" role="alert">{error} Si la opinión cambió, pulsa Actualizar.</p>}<button className="platform-button" disabled={busy}>{busy?'Guardando…':'Guardar moderación'}</button></fieldset></form></article>;
}
