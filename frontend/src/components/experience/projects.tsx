'use client';
import './evolution-pages.css';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ExternalLink, Monitor, Smartphone, ChevronDown } from 'lucide-react';
import { portfolio } from '@/data/portfolio';
import { PublicShell, PageIntro } from './public-shell';

export function ProjectsExperience() {
  const [expanded, setExpanded] = useState<string | null>('el-gringo');
  const [mobileByProject, setMobileByProject] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<string | null>(null);
  function setDevice(projectId: string, mobile: boolean) {
    setMobileByProject((previous) => ({ ...previous, [projectId]: mobile }));
  }
  function togglePreview(projectId: string, show: boolean) {
    setPreview(show ? projectId : null);
    window.requestAnimationFrame(() => {
      document.getElementById((show ? 'restore-' : 'load-') + projectId)?.focus();
    });
  }
  return (
    <PublicShell>
      <PageIntro
        eyebrow="PROYECTOS DESARROLLADOS"
        title={
          <>
            Proyectos que ya
            <br />
            <span>están en línea.</span>
          </>
        }
        text="Conoce cómo una pollería acerca su carta a sus clientes y un negocio deportivo muestra su catálogo en internet."
      />
      <section className="xp-projects xp-container">
        {portfolio.map((project) => (
          <article
            key={project.id}
            id={project.id}
            className="xp-real-project"
            style={{ '--project-color': project.color } as React.CSSProperties}
          >
            <div className="xp-project-overview">

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
                  aria-controls={'caso-' + project.id}
                >
                  Conoce el caso <ChevronDown size={16} />
                </button>
                <div className="xp-project-case" id={'caso-' + project.id} hidden={expanded !== project.id}>
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

                <Link className="xp-text-link" href={`/cotizar?tipo=${project.type}`}>
                  Quiero un proyecto para mi negocio <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className={`xp-project-live ${mobileByProject[project.id] ? 'mobile' : ''}`}>
                <div className="xp-project-browser">
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{new URL(project.url).hostname}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setDevice(project.id, false)}
                      aria-label="Vista de escritorio"
                      aria-pressed={!mobileByProject[project.id]}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDevice(project.id, true)}
                      aria-label="Vista de celular"
                      aria-pressed={!!mobileByProject[project.id]}
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
                  <div className="xp-project-live-cover xp-project-cover">
                    <img className="xp-project-screenshot" src={project.cover} alt={"Pantalla de inicio de la web de "+project.name} width={1265} height={712} loading="lazy"/>
                    <div className="xp-project-cover-actions">
                      <div className="xp-project-cover-identity">
                        <img src={project.logo} alt="" width={38} height={38} />
                        <div><strong>{project.name}</strong><small>Página de inicio</small></div>
                      </div>
                      <button id={'load-' + project.id} type="button" className="button button-primary" onClick={() => togglePreview(project.id, true)}>
                        Explorar web en vivo <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="xp-project-live-actions">
                  {preview === project.id && (
                    <button id={'restore-' + project.id} type="button" className="xp-project-restore" onClick={() => togglePreview(project.id, false)}>
                      Volver a la captura
                    </button>
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
