'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  LayoutTemplate,
  ShoppingBag,
  Layers3,
  Grid2X2,
  ChevronDown,
  RefreshCw,
  MessageCircle,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { usePrices } from '@/lib/use-prices';
import { money } from '@/lib/pricing';
import { services, serviceFromSearch } from '@/data/services';
import { PublicShell, PageIntro, openNexi } from './public-shell';
import { SolutionPreview, type SolutionKind } from './solution-preview';

const icons = {
  landing: LayoutTemplate,
  business: Globe2,
  catalog: Grid2X2,
  store: ShoppingBag,
  system: Layers3,
};
export function ExploreExperience() {
  const [kind, setKind] = useState<SolutionKind>('landing');
  const [compare, setCompare] = useState(false);
  const [device, setDevice] = useState<'wide' | 'mobile'>('wide');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const prices = usePrices();
  const selected = services.find((item) => item.id === kind)!;
  const index = services.indexOf(selected);
  const Icon = icons[kind];
  useEffect(() => {
    const sync = () => {
      const value = serviceFromSearch(window.location.search);
      if (value) setKind(value);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  function choose(next: number, focus = false) {
    const position = (next + services.length) % services.length;
    setKind(services[position].id);
    if (focus) tabs.current[position]?.focus();
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, position: number) {
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = position + 1;
    if (event.key === 'ArrowLeft') next = position - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = services.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      choose(next, true);
    }
  }
  return (
    <PublicShell>
      <PageIntro
        className="v5-explore-intro"
        eyebrow="ELIGE TU PRÓXIMO NIVEL"
        title={
          <>
            Una necesidad real.
            <br />
            <span>La solución correcta.</span>
          </>
        }
        text="Mira cómo funciona cada opción. Compara lo esencial y encuentra el punto de partida para tu negocio."
      />
      <section className="xp-container v5-services">
        <div className="v5-service-tabs" role="tablist" aria-label="Servicios TUKNEX">
          {services.map((service, position) => {
            const ServiceIcon = icons[service.id];
            return (
              <button
                key={service.id}
                ref={(node) => {
                  tabs.current[position] = node;
                }}
                id={'service-tab-' + service.id}
                type="button"
                role="tab"
                tabIndex={kind === service.id ? 0 : -1}
                aria-selected={kind === service.id}
                aria-controls="service-panel"
                onKeyDown={(event) => onTabKey(event, position)}
                onClick={() => setKind(service.id)}
              >
                <span>{service.number}</span>
                <ServiceIcon size={20} />
                <strong>{service.title}</strong>
              </button>
            );
          })}
        </div>
        <div
          className="v5-service-showcase"
          id="service-panel"
          role="tabpanel"
          aria-labelledby={'service-tab-' + kind}
        >
          <div className="v5-service-copy">
            <span className="v5-service-label">
              <Icon size={19} />
              {selected.short}
            </span>
            <h2>{selected.phrase}</h2>
            <p>{selected.description}</p>
            <ul>
              {selected.scope.map((item) => (
                <li key={item}>
                  <Check size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="v5-service-price">
              <span>Inversión orientativa</span>
              <strong>{kind === 'store' ? 'A tu medida' : <>Desde {money(prices[kind])}</>}</strong>
              <small>
                {kind === 'store'
                  ? 'Evaluamos pagos, entregas e integraciones antes de darte un precio.'
                  : kind === 'system'
                    ? 'Referencia para uno o dos módulos básicos. El alcance complejo se evalúa aparte.'
                    : 'Sujeto al alcance. Dominio y alojamiento se confirman por separado.'}
              </small>
            </div>
            <Link className="button button-primary" href={'/cotizar?tipo=' + kind}>
              Cotizar {selected.title.toLowerCase()} <ArrowUpRight size={18} />
            </Link>
            <span className="v5-service-duration">Plazo orientativo · {selected.duration}</span>
          </div>
          <div className="v5-service-visual">
            <div className="v5-service-visual-top">
              <span>
                <i /> ASÍ PODRÍA FUNCIONAR
              </span>
              <div role="group" aria-label="Formato del ejemplo">
                <button
                  type="button"
                  aria-pressed={device === 'wide'}
                  aria-label="Pantalla amplia"
                  onClick={() => setDevice('wide')}
                >
                  <Monitor size={17} />
                </button>
                <button
                  type="button"
                  aria-pressed={device === 'mobile'}
                  aria-label="Vista móvil"
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone size={17} />
                </button>
              </div>
            </div>
            <div className="v5-screen-stage" data-device={device}>
              <SolutionPreview key={kind} kind={kind} />
            </div>
            <div className="v5-service-difference">
              <span>{selected.number} / 05</span>
              <p>{selected.difference}</p>
              <div>
                <button type="button" aria-label="Servicio anterior" onClick={() => choose(index - 1)}>
                  <ArrowLeft size={18} />
                </button>
                <button type="button" aria-label="Siguiente servicio" onClick={() => choose(index + 1)}>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="v5-example-note">
          <SparkleMark />
          <span>
            Maqueta orientativa. Puedes probar sus controles; no realiza compras, reservas ni envíos reales.
          </span>
        </div>
        <button
          className="xp-compare-toggle"
          type="button"
          onClick={() => setCompare(!compare)}
          aria-expanded={compare}
        >
          Comparar las cinco soluciones <ChevronDown size={18} />
        </button>
        {compare && (
          <div className="xp-comparison">
            <table>
              <thead>
                <tr>
                  <th>Solución</th>
                  <th>¿Para qué te sirve?</th>
                  <th>Referencia inicial</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <th>{service.title}</th>
                    <td>{service.ideal}</td>
                    <td>{service.id === 'store' ? 'Evaluación personalizada' : money(prices[service.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="v5-services-help">
          <div>
            <span className="xp-eyebrow">NO TIENES QUE DECIDIRLO SOLO</span>
            <h3>Una buena conversación aclara el camino.</h3>
            <p>NEXI te orienta con palabras simples. También podemos revisar una web que ya tengas.</p>
          </div>
          <button className="button button-outline" onClick={openNexi}>
            <MessageCircle size={18} /> Hablar con NEXI
          </button>
          <Link className="xp-text-link" href="/cotizar?tipo=redesign">
            <RefreshCw size={16} /> Mejorar mi web <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="xp-explore-proof">
          <span>La idea también puede convertirse en un proyecto real.</span>
          <Link href="/proyectos">
            Conoce El Gringo J&M y CORRY SPORT <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
function SparkleMark() {
  return (
    <span className="v5-example-mark" aria-hidden="true">
      ✦
    </span>
  );
}
