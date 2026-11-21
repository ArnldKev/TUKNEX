'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Globe2, Layers3, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';
import { PublicShell, openNexi } from './public-shell';
import { SolutionPreview, type SolutionKind } from './solution-preview';
import { usePrices } from '@/lib/use-prices';
import { money } from '@/lib/pricing';
import { openWelcome } from './welcome-intro';
import { portfolio } from '@/data/portfolio';
import './evolution-home.css';

const possibilities = [
  { id: 'business', label: 'Tu web', icon: Globe2, caption: 'Un espacio que presenta tu negocio.' },
  { id: 'catalog', label: 'Tus productos', icon: ShoppingBag, caption: 'Una vitrina que se puede explorar.' },
  { id: 'system', label: 'Tu gestión', icon: Layers3, caption: 'Una herramienta para organizar tu trabajo.' },
] satisfies { id: SolutionKind; label: string; icon: typeof Globe2; caption: string }[];

const goals = [
  ['Presentar mi negocio', '/cotizar?objetivo=visibility'],
  ['Mostrar mis productos', '/cotizar?objetivo=products'],
  ['Vender en línea', '/cotizar?objetivo=sales'],
  ['Organizar mi negocio', '/cotizar?objetivo=organize'],
];

export function ExperienceHome() {
  const [selected, setSelected] = useState<SolutionKind>('business');
  const [projectId, setProjectId] = useState<(typeof portfolio)[number]['id']>('corry-sport');
  const prices = usePrices();
  const current = possibilities.find((item) => item.id === selected)!;
  const project = portfolio.find((item) => item.id === projectId)!;

  return (
    <PublicShell>
      <section className="fc-hero xp-container">
        <div className="fc-hero-copy">
          <p className="fc-kicker">Diseño y desarrollo web</p>
          <h1>Una mejor web empieza con un objetivo claro.</h1>
        </div>
        <div className="fc-hero-actions">
          <p>Aclara qué necesita tu negocio antes de invertir en una página, una tienda o un sistema.</p>
          <Link className="button button-primary" href="/cotizar">
            Cotizar mi proyecto <ArrowUpRight size={19} />
          </Link>
          <button className="xp-text-link fc-purpose-link" type="button" onClick={openWelcome}>
            Conoce nuestro propósito <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="fc-home-showcase xp-container" aria-label="Proyectos y soluciones">
        <div className="fc-home-portfolio">
          <Link href={'/proyectos#' + project.id} className="fc-home-project">
            <img
              src={project.cover}
              alt={'Pantalla de inicio de la web de ' + project.name}
              width={1265}
              height={712}
              loading="eager"
              fetchPriority="high"
            />
            <div className="fc-home-project-label">
              <strong>{project.name}</strong>
              <span>{project.category} <ArrowUpRight size={16} aria-hidden="true" /></span>
            </div>
          </Link>
          <div className="fc-home-project-switch" role="group" aria-label="Elegir proyecto">
            {portfolio.map((item) => (
              <button key={item.id} type="button" aria-pressed={projectId === item.id} onClick={() => setProjectId(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="fc-home-goals">
          <h2>¿Qué quieres lograr?</h2>
          <ul>
            {goals.map(([label, href]) => (
              <li key={href}><Link href={href}>{label}<ArrowRight size={17} /></Link></li>
            ))}
          </ul>
          <div className="fc-home-proof">
            <span><Check size={16} /> Webs desde {money(prices.landing)}</span>
            <span><MapPin size={16} /> Oxapampa · Todo el Perú</span>
          </div>
        </div>
      </section>

      <section className="fc-home-demo xp-container" aria-labelledby="ejemplos-tuknex">
        <div className="fc-home-demo-copy">
          <h2 id="ejemplos-tuknex">Pruébalo antes de decidir.</h2>
          <p>Explora una web, un catálogo o un sistema de gestión. Puedes usar sus controles.</p>
          <Link className="xp-text-link" href="/explorar">Explorar soluciones <ArrowUpRight size={17} /></Link>
          <button className="xp-text-link" type="button" onClick={openNexi}>
            Pregúntale a NEXI <MessageCircle size={17} />
          </button>
        </div>
        <div className="fc-demo-frame" data-solution={selected}>
          <div className="fc-solution-switch" role="group" aria-label="Explorar ejemplos de solución">
            {possibilities.map((item) => (
              <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                <item.icon size={16} aria-hidden="true" /> {item.label}
              </button>
            ))}
          </div>
          <SolutionPreview key={selected} kind={selected} compact />
          <div className="fc-display-caption">
            <span>{current.caption}</span>
            <Link href={'/explorar?servicio=' + selected}>Ver esta solución <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
