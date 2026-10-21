'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Sparkles,
  Globe2,
  ShoppingBag,
  Layers3,
  ShieldCheck,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { NexiAvatar } from '@/components/3d/nexi-avatar';
import { PublicShell, openNexi } from './public-shell';
import { SolutionPreview, type SolutionKind } from './solution-preview';
import { usePrices } from '@/lib/use-prices';
import { money } from '@/lib/pricing';
import { portfolio } from '@/data/portfolio';
import './future.css';

const possibilities = [
  {
    id: 'business' as SolutionKind,
    label: 'Tu web',
    icon: Globe2,
    caption: 'Un espacio que presenta tu negocio.',
  },
  {
    id: 'catalog' as SolutionKind,
    label: 'Tus productos',
    icon: ShoppingBag,
    caption: 'Una vitrina que se puede explorar.',
  },
  {
    id: 'system' as SolutionKind,
    label: 'Tu gestión',
    icon: Layers3,
    caption: 'Tu trabajo, mucho más organizado.',
  },
];
export function ExperienceHome() {
  const [selected, setSelected] = useState<SolutionKind>('business');
  const prices = usePrices();
  const current = possibilities.find((item) => item.id === selected)!;
  return (
    <PublicShell>
      <section className="v5-hero xp-container">
        <div className="v5-hero-copy">
          <span className="v5-kicker">
            <i /> TECNOLOGÍA CON PROPÓSITO <Sparkles size={13} />
          </span>
          <h1>
            Tu negocio.
            <br />
            <span>A otro nivel.</span>
          </h1>
          <p>Webs que conectan. Catálogos que acercan tus productos. Sistemas que simplifican tu trabajo.</p>
          <div className="v5-hero-actions">
            <Link className="button button-primary" href="/cotizar">
              Diseñar mi proyecto <ArrowUpRight size={18} />
            </Link>
            <Link className="button button-outline" href="/explorar">
              Explorar soluciones <ArrowRight size={17} />
            </Link>
          </div>
          <div className="v5-hero-proof">
            <span>
              <Check size={16} /> Webs desde {money(prices.landing)}
            </span>
            <span>
              <MapPin size={15} /> Oxapampa · Todo el Perú
            </span>
          </div>
          <button className="v5-nexi-invite" onClick={openNexi}>
            <NexiAvatar compact state="wave" />
            <span>
              <small>UN COMPAÑERO PARA EMPEZAR</small>
              <strong>¿Cuál me conviene? Pregúntale a NEXI.</strong>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="v5-hero-display">
          <div className="v5-display-top">
            <span>
              <i /> TU PRÓXIMO NIVEL, EN PANTALLA
            </span>
            <span className="v5-demo-tag">EJEMPLO INTERACTIVO</span>
          </div>
          <div className="v5-hero-switch" role="group" aria-label="Explorar ejemplos de solución">
            {possibilities.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>
          <SolutionPreview key={selected} kind={selected} compact />
          <div className="v5-display-bottom">
            <span>{current.caption}</span>
            <Link href={'/explorar?servicio=' + selected}>
              Ver esta solución <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="v5-display-orbit" aria-hidden="true" />
        </div>
      </section>
      <div className="v5-value-strip">
        <div className="xp-container">
          <span>BUEN DISEÑO. TECNOLOGÍA CLARA.</span>
          <span>
            <Globe2 size={17} /> Tu marca en internet
          </span>
          <span>
            <ShoppingBag size={17} /> Tus productos, más cerca
          </span>
          <span>
            <Layers3 size={17} /> Tu negocio, conectado
          </span>
        </div>
      </div>
      <section className="xp-paths xp-container">
        <div className="xp-section-heading">
          <span className="xp-eyebrow">
            <i /> EMPIEZA POR LO QUE NECESITAS
          </span>
          <h2>
            Grandes posibilidades.
            <br />
            <span>Un primer paso simple.</span>
          </h2>
        </div>
        <div className="xp-path-grid">
          <Link href="/explorar?servicio=landing" className="xp-path-card">
            <span>01 / PRESENCIA DIGITAL</span>
            <Globe2 size={32} strokeWidth={1.4} />
            <h3>Quiero que me conozcan.</h3>
            <p>Presenta lo que haces y facilita que tus próximos clientes te encuentren.</p>
            <strong>
              Descubrir webs <ArrowUpRight size={17} />
            </strong>
          </Link>
          <Link href="/explorar?servicio=catalog" className="xp-path-card">
            <span>02 / PRODUCTOS Y VENTAS</span>
            <ShoppingBag size={32} strokeWidth={1.4} />
            <h3>Quiero mostrar mi oferta.</h3>
            <p>Un menú, un catálogo o una tienda. Elige cómo acercar tus productos.</p>
            <strong>
              Explorar opciones <ArrowUpRight size={17} />
            </strong>
          </Link>
          <Link href="/explorar?servicio=system" className="xp-path-card">
            <span>03 / GESTIÓN DEL NEGOCIO</span>
            <Layers3 size={32} strokeWidth={1.4} />
            <h3>Quiero trabajar mejor.</h3>
            <p>Ordena registros, clientes y tareas con una herramienta pensada para tu proceso.</p>
            <strong>
              Conocer sistemas <ArrowUpRight size={17} />
            </strong>
          </Link>
        </div>
      </section>
      <section className="xp-real-work xp-container">
        <div>
          <span className="xp-eyebrow">
            <i /> PROYECTOS TUKNEX
          </span>
          <h2>
            De una buena idea.
            <br />
            <span>A una web real.</span>
          </h2>
          <p>Soluciones que ya tienen nombre, historia y un negocio detrás.</p>
          <Link className="xp-text-link" href="/proyectos">
            Conocer los proyectos <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="xp-real-links">
          {portfolio.map((project) => (
            <Link key={project.id} href={'/proyectos#' + project.id}>
              <span style={{ background: project.color }}>{project.id === 'el-gringo' ? 'G' : 'CS'}</span>
              <div>
                <strong>{project.name}</strong>
                <small>{project.category}</small>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section className="xp-final-cta xp-container">
        <ShieldCheck size={25} />
        <div>
          <h2>Tu idea merece un plan claro.</h2>
          <p>Explora el alcance y una estimación. Sin tener que entender de tecnología.</p>
        </div>
        <Link className="button button-primary" href="/cotizar">
          Empecemos <ArrowUpRight size={17} />
        </Link>
      </section>
    </PublicShell>
  );
}
