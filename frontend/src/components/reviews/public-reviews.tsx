'use client';

import Link from 'next/link';
import {DEMO_MODE} from '@/config/environment';
import { ArrowLeft, ArrowRight, MessageSquareHeart, ShieldCheck, Sparkles } from 'lucide-react';
import { usePlatformData } from '@/lib/platform/repository';
import { RatingStars } from './review-editor';
import '@/components/auth/platform.css';

export function PublicReviews() {
  const data = usePlatformData(),
    examples = data.reviews.filter((r) => r.status === 'published' && r.isDemo);
  return (
    <section className="public-reviews">
      <div className="public-reviews-content">
        <Link href="/" className="platform-text-link">
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>
        <span className="platform-pill">
          <MessageSquareHeart size={14} />
          EXPERIENCIAS QUE IMPORTAN
        </span>
        <h1>
          La confianza se construye.
          <br />
          <em>Una experiencia a la vez.</em>
        </h1>
        <p className="public-reviews-intro">
          Queremos que conozcas lo que nuestros clientes tienen para contar. Siempre con opiniones auténticas
          y vinculadas a un proyecto.
        </p>
        <section className="public-review-empty">
          <div>
            <MessageSquareHeart size={38} />
            <Sparkles size={18} />
          </div>
          <h2>Pronto podrás conocer las experiencias de nuestros clientes.</h2>
          <p>
            Estamos preparando un espacio de reseñas verificadas. En esta etapa no publicamos opiniones
            ficticias como testimonios reales ni calculamos calificaciones comerciales.
          </p>
          <Link className="platform-button" href="/proyectos">
            Conocer proyectos reales
            <ArrowUpRightIcon />
          </Link>
          <span>
            <ShieldCheck size={16} />
            Transparencia desde el primer día.
          </span>
        </section>
        <div className="public-review-principles">
          <article>
            <strong>Vinculadas a un proyecto</strong>
            <p>El futuro sistema validará que el servicio haya finalizado antes de aceptar una opinión.</p>
          </article>
          <article>
            <strong>Honestas, también al mejorar</strong>
            <p>La moderación respeta las críticas legítimas y evita spam o datos privados.</p>
          </article>
          <article>
            <strong>Con tu consentimiento</strong>
            <p>El cliente elige qué nombre puede mostrarse junto a su experiencia.</p>
          </article>
        </div>
        {DEMO_MODE && examples.length > 0 && (
          <details className="public-review-demo">
            <summary>Explorar ejemplos del prototipo · DATOS DE DEMOSTRACIÓN</summary>
            <p>
              Estos registros son ficticios y sólo muestran el funcionamiento del sistema. No son testimonios
              reales ni reseñas verificadas.
            </p>
            <div>
              {examples.map((r) => (
                <article key={r.id}>
                  <span className="portal-demo-badge">DEMO · NO VERIFICADA</span>
                  <RatingStars rating={r.rating} />
                  <h3>{r.title}</h3>
                  <p>{r.comment}</p>
                  <small>{r.displayName} · Ejemplo ficticio</small>
                  {r.businessReply && <blockquote>{r.businessReply}</blockquote>}
                </article>
              ))}
            </div>
          </details>
        )}
        <div className="public-review-client-link">
          <span>¿Ya tienes un proyecto con nosotros?</span>
          <Link href="/acceder">
            Acceder a mi cuenta
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
