'use client';
import { useState } from 'react';
import Link from 'next/link';
import {ArrowUpRight,Check,Sparkles,Globe2,ShoppingBag,Layers3,ShieldCheck,MapPin,ArrowRight} from 'lucide-react';
import { NexiAvatar } from '@/components/3d/nexi-avatar';
import { PublicShell, openNexi } from './public-shell';
import { SolutionPreview, type SolutionKind } from './solution-preview';
import { CircuitArt, ProductSilhouette } from './circuit-art';
import { usePrices } from '@/lib/use-prices';
import { money } from '@/lib/pricing';
import { openWelcome } from './welcome-intro';
import { portfolio } from '@/data/portfolio';
import './evolution-home.css';

const possibilities = [
  {id:'business' as SolutionKind,label:'Tu web',icon:Globe2,caption:'Un espacio que presenta tu negocio.'},
  {id:'catalog' as SolutionKind,label:'Tus productos',icon:ShoppingBag,caption:'Una vitrina que se puede explorar.'},
  {id:'system' as SolutionKind,label:'Tu gestión',icon:Layers3,caption:'Tu trabajo, mucho más organizado.'},
];
const paths = [
 {kind:'business' as SolutionKind,href:'/explorar?servicio=landing',label:'01 / PRESENCIA DIGITAL',icon:Globe2,title:'Quiero que me conozcan.',text:'Presenta lo que haces y facilita que tus próximos clientes te encuentren.',action:'Descubrir webs'},
 {kind:'catalog' as SolutionKind,href:'/explorar?servicio=catalog',label:'02 / PRODUCTOS Y VENTAS',icon:ShoppingBag,title:'Quiero mostrar mi oferta.',text:'Un menú, un catálogo o una tienda. Elige cómo acercar tus productos.',action:'Explorar opciones'},
 {kind:'system' as SolutionKind,href:'/explorar?servicio=system',label:'03 / GESTIÓN DEL NEGOCIO',icon:Layers3,title:'Quiero trabajar mejor.',text:'Ordena registros, clientes y tareas con una herramienta pensada para tu proceso.',action:'Conocer sistemas'},
];
export function ExperienceHome() {
 const [selected,setSelected]=useState<SolutionKind>('business');
 const prices=usePrices();
 const current=possibilities.find(item=>item.id===selected)!;
 return <PublicShell>
   <section className="fc-hero xp-container">
     <div className="fc-hero-copy">
       <span className="fc-kicker"><i/> TECNOLOGÍA CON PROPÓSITO <Sparkles size={13}/></span>
       <h1>Tu negocio.<br/><span>A otro nivel.</span></h1>
       <p>Webs que conectan. Catálogos que acercan tus productos. Sistemas que simplifican tu trabajo.</p>
       <div className="fc-hero-actions">
         <Link className="button button-primary" href="/cotizar">Diseñar mi proyecto <ArrowUpRight size={19}/></Link>
         <Link className="button button-outline" href="/explorar">Explorar soluciones <ArrowRight size={17}/></Link>
       </div>
       <button className="xp-text-link fc-purpose-link" type="button" onClick={openWelcome}>Conoce nuestro propósito <ArrowRight size={16}/></button>
     </div>
     <div className="fc-hero-stage" data-solution={selected}>
       <CircuitArt/>
       <div className="fc-demo-frame">
         <div className="fc-display-heading"><span><i/> TU PRÓXIMO NIVEL, EN PANTALLA</span><span>EJEMPLO INTERACTIVO</span></div>
         <div className="fc-solution-switch" role="group" aria-label="Explorar ejemplos de solución">
           {possibilities.map(item=><button key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><item.icon size={16}/>{item.label}</button>)}
         </div>
         <SolutionPreview key={selected} kind={selected} compact/>
         <div className="fc-display-caption"><span>{current.caption}</span><Link href={'/explorar?servicio='+selected}>Ver esta solución <ArrowUpRight size={15}/></Link></div>
       </div>
     </div>
   </section>
   <div className="fc-home-context xp-container">
     <div className="fc-home-proof"><span><Check size={16}/>Webs desde {money(prices.landing)}</span><span><MapPin size={16}/>Oxapampa · Todo el Perú</span></div>
     <button className="fc-nexi-invite" onClick={openNexi}><NexiAvatar compact state="wave"/><span><small>UN COMPAÑERO PARA EMPEZAR</small><strong>¿Cuál me conviene? Pregúntale a NEXI.</strong></span><ArrowUpRight size={18}/></button>
   </div>
   <div className="fc-value-strip"><div className="xp-container"><strong>BUEN DISEÑO. TECNOLOGÍA CLARA.</strong><span><Globe2 size={17}/>Tu marca en internet</span><span><ShoppingBag size={17}/>Tus productos, más cerca</span><span><Layers3 size={17}/>Tu negocio, conectado</span></div></div>
   <section className="fc-paths xp-container">
     <div className="fc-section-heading"><span className="xp-eyebrow"><i/>EMPIEZA POR LO QUE NECESITAS</span><h2>Grandes posibilidades.<br/><span>Un primer paso simple.</span></h2></div>
     <div className="fc-path-list">{paths.map(item=><Link href={item.href} className={'fc-path fc-path-'+item.kind} key={item.kind}>
       <div className="fc-path-copy"><span className="fc-path-label">{item.label}</span><item.icon size={28} strokeWidth={1.4}/><h3>{item.title}</h3><p>{item.text}</p><strong>{item.action}<ArrowUpRight size={19}/></strong></div><ProductSilhouette kind={item.kind}/>
     </Link>)}</div>
   </section>
   <section className="fc-work-section">
     <div className="xp-container">
       <div className="fc-work-heading"><div><span className="xp-eyebrow"><i/>PROYECTOS TUKNEX</span><h2>De una buena idea.<br/><span>A una web real.</span></h2></div><div><p>Soluciones que ya tienen nombre, historia y un negocio detrás.</p><Link className="xp-text-link" href="/proyectos">Conocer los proyectos<ArrowUpRight size={17}/></Link></div></div>
       <div className="fc-project-grid">{portfolio.map(project=><Link key={project.id} href={'/proyectos#'+project.id} className="fc-project-card">
         <div className="fc-project-screen"><div className="fc-project-chrome" aria-hidden="true"><i/><i/><i/></div><img src={project.cover} alt={'Pantalla de inicio del sitio de '+project.name} width={1265} height={712} loading="lazy"/></div>
         <div className="fc-project-caption"><img src={project.logo} alt={'Logo de '+project.name} width={44} height={44} loading="lazy"/><div><strong>{project.name}</strong><small>{project.category}</small></div><ArrowUpRight size={23}/></div>
       </Link>)}</div>
     </div>
   </section>
   <section className="fc-final-cta xp-container"><ShieldCheck size={30}/><div><h2>Tu idea merece<br/>un plan claro.</h2><p>Explora el alcance y una estimación. Sin tener que entender de tecnología.</p></div><Link className="button button-primary" href="/cotizar">Empecemos<ArrowUpRight size={20}/></Link></section>
 </PublicShell>;
}
