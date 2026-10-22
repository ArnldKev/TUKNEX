'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageSquareHeart } from 'lucide-react';
import { DEMO_MODE } from '@/config/environment';
import { billingRequest } from '@/lib/billing/api';
import { useDemoAuth } from '@/lib/platform/auth';
import { opinionSubjects, type PublicOpinion } from '@/lib/reviews';
import { ClientOpinions } from './real-reviews';
import { RatingStars } from './review-editor';
import '@/components/auth/platform.css';
import './reviews.css';

export function PublicReviews() {
  const {user,ready}=useDemoAuth();
  const [items,setItems]=useState<PublicOpinion[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let alive=true;
    if(DEMO_MODE){setLoading(false);return;}
    const load=()=>{setLoading(true);setError('');void billingRequest<PublicOpinion[]>('public/reviews').then(next=>{if(alive)setItems(next);}).catch(()=>{if(alive)setError('No pudimos cargar las opiniones. Inténtalo otra vez.');}).finally(()=>{if(alive)setLoading(false);});};
    load();window.addEventListener('reviews-change',load);
    return()=>{alive=false;window.removeEventListener('reviews-change',load);};
  },[retry]);
  return <section className="public-reviews"><div className="public-reviews-content">
    <Link href="/" className="platform-text-link"><ArrowLeft size={14}/> Volver al inicio</Link>
    <span className="platform-pill"><MessageSquareHeart size={16}/> EXPERIENCIAS QUE IMPORTAN</span>
    <h1>La confianza se construye.<br/><em>Una experiencia a la vez.</em></h1>
    <p className="public-reviews-intro">Tu opinión sobre la aplicación y el servicio nos ayuda a mejorar. Aquí compartimos comentarios de clientes con su autorización.</p>
    <div className="public-opinion-compose" id="escribir-opinion">
      {!ready?<p role="status">Cargando tu sesión…</p>:DEMO_MODE?<div className="portal-panel"><h2>Estás en la demostración.</h2><p>Las opiniones de prueba se exploran desde la cuenta demo y no se publican como reseñas reales.</p><Link className="platform-button" href="/mi-cuenta/resenas">Explorar reseñas demo</Link></div>:user?.role==='client'?<ClientOpinions key={user.id}/>:<section className="opinion-invite portal-panel"><MessageSquareHeart size={32}/><div><h2>{user?'Opiniones de tus clientes':'Comparte tu experiencia'}</h2><p>{user?'Revisa los comentarios y responde desde administración.':'Inicia sesión con tu cuenta de cliente para comentar sobre la página o el servicio.'}</p></div><Link className="platform-button" href={user?'/admin/resenas':'/acceder'}>{user?'Gestionar opiniones':'Iniciar sesión para opinar'}<ArrowRight size={16}/></Link>{!user&&<Link className="platform-text-link" href="/registro">Crear una cuenta</Link>}</section>}
    </div>
    <section className="published-opinions" aria-labelledby="opiniones-publicadas"><h2 id="opiniones-publicadas">Lo que comparten nuestros clientes</h2><p>Opiniones revisadas y publicadas con permiso de sus autores.</p>
      {loading?<p role="status">Cargando opiniones…</p>:error?<div><p className="platform-error" role="alert">{error}</p><button className="platform-secondary" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></div>:items.length?<div className="public-opinions-grid">{items.map(item=><article key={item.id} className="portal-panel public-opinion"><span className="platform-kicker">{opinionSubjects[item.subject]}</span><RatingStars rating={item.rating} size={20}/>{item.title&&<h3>{item.title}</h3>}<p className="opinion-comment">{item.comment}</p><footer><strong>{item.displayName}</strong><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString('es-PE',{timeZone:'America/Lima'})}</time></footer>{item.businessReply&&<blockquote><strong>Respuesta de TUKNEX</strong><p>{item.businessReply}</p></blockquote>}</article>)}</div>:<div className="portal-panel opinions-empty"><MessageSquareHeart size={32}/><h3>Aún no hay opiniones publicadas.</h3><p>Puedes ser la primera persona en compartir tu experiencia.</p></div>}
    </section>
    <div className="public-review-principles"><article><strong>Tu experiencia, con tus palabras</strong><p>Cuéntanos sobre la aplicación o sobre el servicio que recibes de TUKNEX.</p></article><article><strong>También podemos mejorar</strong><p>La revisión evita spam y datos privados, y respeta las críticas legítimas.</p></article><article><strong>Tú decides si se publica</strong><p>Elige un nombre público y autoriza su publicación, o envía el comentario solo al equipo.</p></article></div>
  </div></section>;
}
