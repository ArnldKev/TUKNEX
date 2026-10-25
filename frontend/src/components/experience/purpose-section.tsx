'use client';
import Link from 'next/link';
import { ArrowUpRight, Compass, Eye, Globe2, Play } from 'lucide-react';
import { purpose } from '@/data/purpose';
import { portfolio } from '@/data/portfolio';
import { openWelcome } from './welcome-intro';
import './purpose.css';
export function PurposeSection() {
  return <section className="purpose-section xp-container" aria-labelledby="purpose-heading">
    <div className="purpose-heading"><div><p className="purpose-eyebrow">EL PROPÓSITO DETRÁS DE CADA PROYECTO</p><h2 id="purpose-heading">Ideas con dirección.<br/><span>Tecnología con propósito.</span></h2></div><button type="button" className="button button-outline" onClick={openWelcome}><Play size={16}/> Ver bienvenida</button></div>
    <div className="purpose-cards">{purpose.map((item,index)=>{const Icon=[Compass,Eye,Globe2][index];return <article key={item.id} className={'purpose-card purpose-card--'+item.id}><span className="purpose-card-icon"><Icon size={28}/></span><p className="purpose-eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.text}</p><span className="purpose-detail">{item.detail}</span></article>;})}</div>
    <div className="purpose-showcase"><div className="purpose-showcase-copy"><span className="purpose-eyebrow">DEL PROPÓSITO A LA PANTALLA</span><h3>Negocios distintos.<br/><span>Soluciones con identidad.</span></h3><p>Una carta que acerca sabores. Un catálogo que acompaña cada entrenamiento. Así toma forma lo que construimos contigo.</p><Link className="xp-text-link" href="/proyectos">Conocer los proyectos <ArrowUpRight size={17}/></Link></div><div className="purpose-project-images">{portfolio.map(project=><Link key={project.id} href={'/proyectos#'+project.id} className="purpose-project-image"><img src={project.cover} width={1265} height={712} alt={'Pantalla de inicio del sitio de '+project.name} loading="lazy"/><span><img src={project.logo} width={28} height={28} alt=""/>{project.name}<ArrowUpRight size={16}/></span></Link>)}</div></div>
  </section>;
}
