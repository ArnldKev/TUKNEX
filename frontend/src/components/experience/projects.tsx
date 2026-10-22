'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ExternalLink, Monitor, Smartphone, ChevronDown } from 'lucide-react';
import { portfolio } from '@/data/portfolio';
import { PublicShell, PageIntro } from './public-shell';

export function ProjectsExperience() {
  const [expanded, setExpanded] = useState<string | null>('el-gringo');
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <PublicShell>
      <PageIntro
        eyebrow="PROYECTOS DESARROLLADOS"
        title={
          <>
            El siguiente nivel
            <br />
            <span>ya tiene dirección.</span>
          </>
        }
        text="Dos negocios, necesidades concretas y experiencias digitales propias. Visita los proyectos reales y descubre cómo cada idea encontró su forma."
      />
      <section className="xp-projects xp-container">
        {portfolio.map((project, index) => (
          <article
            key={project.id}
            id={project.id}
            className="xp-real-project"
            style={{ '--project-color': project.color } as React.CSSProperties}
          >
            <div className="xp-project-overview">
              <span className="xp-project-index">0{index + 1} / PROYECTO REAL</span>
              <div>
                <h2>{project.name}</h2>
                <span>{project.tagline}</span>
              </div>
              <a
                className="button button-outline"
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visitar proyecto <ExternalLink size={15} />
              </a>
            </div>
            <div className="xp-project-body">
              <div className="xp-project-info">
                <span className="xp-eyebrow">{project.category}</span>
                <h3>{project.description}</h3>
                <button
                  className="xp-case-toggle"
                  onClick={() => setExpanded(expanded === project.id ? null : project.id)}
                  aria-expanded={expanded === project.id}
                >
                  Conoce el caso <ChevronDown size={16} />
                </button>
                {expanded === project.id && (
                  <div className="xp-project-case">
                    <p>
                      {project.id === 'el-gringo'
                        ? 'El objetivo: acercar la carta y facilitar que una persona organice su pedido antes de conversar con el restaurante.'
                        : 'El objetivo: reunir la oferta deportiva y facilitar una consulta con los artículos y opciones de interés.'}
                    </p>
                    <ul>
                      {project.features.map((feature) => (
                        <li key={feature}>
                          <Check size={14} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <small>
                      Las operaciones de compra se continúan por WhatsApp. No se atribuyen pagos online,
                      resultados comerciales ni tecnologías no comprobadas.
                    </small>
                  </div>
                )}
                <Link className="xp-text-link" href={`/cotizar?tipo=${project.type}`}>
                  Quiero un proyecto para mi negocio <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className={`xp-project-live ${mobile ? 'mobile' : ''}`}>
                <div className="xp-project-browser">
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{new URL(project.url).hostname}</span>
                  <div>
                    <button
                      onClick={() => setMobile(false)}
                      aria-label="Vista de escritorio"
                      aria-pressed={!mobile}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      onClick={() => setMobile(true)}
                      aria-label="Vista de celular"
                      aria-pressed={mobile}
                    >
                      <Smartphone size={14} />
                    </button>
                  </div>
                </div>
                {preview === project.id ? (
                  <iframe
                    src={project.url}
                    title={`Vista en vivo de ${project.name}`}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="xp-project-live-cover">
                    <img className="xp-project-logo" src={project.logo} alt={"Logo de "+project.name} width={170} height={170} loading="lazy"/>
                    <h3>{project.name}</h3>
                    <p>Explora el sitio original en una vista en vivo.</p>
                    <button className="button button-primary" onClick={() => setPreview(project.id)}>
                      Cargar vista real <ArrowUpRight size={15} />
                    </button>
                    <small>
                      Necesita conexión a internet. También puedes abrir el sitio en otra pestaña.
                    </small>
                  </div>
                )}
                <a
                  className="xp-project-live-link"
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir sitio original <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </article>
        ))}
        <div className="xp-portfolio-note">
          <h3>Tu proyecto puede ser el siguiente.</h3>
          <p>
            ¿Buscas inspiración? En nuestro showroom encontrarás conceptos de demostración para explorar otras
            posibilidades.
          </p>
          <Link href="/explorar">
            Explorar el showroom <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
