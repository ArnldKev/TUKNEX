'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageSquareHeart, Save, Send, Star } from 'lucide-react';
import { platformRepository, usePlatformData } from '@/lib/platform/repository';

export const reviewStatusLabels = {
  draft: 'Borrador',
  pending: 'Pendiente de moderación',
  published: 'Aprobada en la demo',
  rejected: 'Requiere revisión',
};
export function RatingStars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className="platform-rating" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? 'currentColor' : 'none'}
          className={n <= rating ? 'filled' : ''}
        />
      ))}
    </span>
  );
}
export function ReviewEditor({ userId }: { userId: string }) {
  const data = usePlatformData(),
    eligible = data.projects.filter((p) => p.userId === userId && p.status === 'completed');
  const [projectId, setProjectId] = useState(eligible[0]?.id || ''),
    [rating, setRating] = useState(5),
    [title, setTitle] = useState(''),
    [comment, setComment] = useState(''),
    [consent, setConsent] = useState(false),
    [displayName, setDisplayName] = useState('Cliente demo'),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false);
  const review = data.reviews.find((r) => r.userId === userId && r.projectId === projectId),
    locked = !!review && ['pending', 'published'].includes(review.status);
  useEffect(() => {
    const existing = data.reviews.find((r) => r.projectId === projectId && r.userId === userId);
    setRating(existing?.rating || 5);
    setTitle(existing?.title || '');
    setComment(existing?.comment || '');
    setConsent(existing?.displayConsent || false);
    setDisplayName(existing?.displayName || 'Cliente demo');
    setDirty(false);
    setError('');
    setMessage('');
  }, [projectId, userId]); // Keep unsaved edits while the repository emits unrelated updates.
  const edit = () => {
    setDirty(true);
    setMessage('');
    setError('');
  };
  const saveDraft = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      platformRepository.saveReview({
        projectId,
        userId,
        rating,
        title,
        comment,
        displayConsent: consent,
        displayName,
      });
      setDirty(false);
      setMessage('Borrador guardado en memoria. Revísalo antes de enviar.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revisa el comentario.');
    }
  };
  const submit = () => {
    if (!review) return;
    try {
      platformRepository.submitReview(review.id, userId);
      setMessage('Tu reseña demo se envió a moderación. No se publica como testimonio real.');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar.');
    }
  };
  if (!eligible.length)
    return (
      <div className="portal-empty">
        <MessageSquareHeart size={35} />
        <h2>Tu experiencia merece ser contada.</h2>
        <p>
          Podrás escribir una reseña cuando uno de tus proyectos esté finalizado. Los proyectos de
          demostración se identifican como ficticios.
        </p>
        <Link className="platform-button" href="/mi-cuenta/proyectos">
          Ver mis proyectos
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <div className="portal-reviews-layout">
      <section className="portal-panel portal-review-form">
        <div className="portal-panel-heading">
          <span className="portal-feature-icon">
            <MessageSquareHeart size={23} />
          </span>
          <div>
            <p className="platform-kicker">TU VOZ CUENTA</p>
            <h2>Cuéntanos cómo te fue.</h2>
            <p>Una opinión honesta nos ayuda a mejorar.</p>
          </div>
        </div>
        <label className="platform-field">
          Proyecto finalizado
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {locked && review ? (
          <div className="portal-review-sent">
            <CheckCircle2 size={30} />
            <h3>{reviewStatusLabels[review.status]}</h3>
            <RatingStars rating={review.rating} size={22} />
            <h4>{review.title}</h4>
            <p>{review.comment}</p>
            <small>Este registro es de demostración, no una reseña verificada real.</small>
            {review.businessReply && (
              <blockquote>
                <strong>Respuesta de TUKNEX · Demo</strong>
                <p>{review.businessReply}</p>
              </blockquote>
            )}
          </div>
        ) : (
          <form onSubmit={saveDraft}>
            <fieldset className="portal-star-field">
              <legend>Tu calificación</legend>
              <div>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-label={`Calificar con ${n} estrellas`}
                    aria-pressed={rating === n}
                    onClick={() => {
                      setRating(n);
                      edit();
                    }}
                  >
                    <Star
                      size={30}
                      fill={n <= rating ? 'currentColor' : 'none'}
                      className={n <= rating ? 'selected' : ''}
                    />
                  </button>
                ))}
              </div>
              <span>
                {
                  [
                    '',
                    'Podemos mejorar mucho',
                    'Hay aspectos por mejorar',
                    'Una experiencia aceptable',
                    'Una buena experiencia',
                    'Una excelente experiencia',
                  ][rating]
                }
              </span>
            </fieldset>
            <label className="platform-field">
              Título <small>Opcional · máximo 80 caracteres</small>
              <input
                maxLength={80}
                placeholder="¿Cómo resumirías tu experiencia?"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  edit();
                }}
              />
            </label>
            <label className="platform-field">
              Tu comentario
              <textarea
                required
                minLength={20}
                maxLength={1200}
                rows={5}
                placeholder="Comparte lo que salió bien y lo que podríamos mejorar. Usa un ejemplo ficticio para explorar la demo."
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  edit();
                }}
              />
              <small>{comment.length}/1,200 · Evita datos personales, enlaces y teléfonos.</small>
            </label>
            <label className="platform-field">
              Nombre que se mostraría
              <input
                required
                maxLength={50}
                placeholder="Cliente demo"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  edit();
                }}
              />
            </label>
            <label className="platform-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  edit();
                }}
              />
              <span>
                Autorizo mostrar el nombre elegido y este texto en la demostración. No usaré datos personales
                reales.
              </span>
            </label>
            {review?.status === 'rejected' && (
              <p className="platform-info">
                Moderación solicita una revisión:{' '}
                {review.moderationNote || 'Revisa el contenido antes de volver a enviarlo.'}
              </p>
            )}
            {error && (
              <p className="platform-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="platform-success" role="status">
                {message}
              </p>
            )}
            <div className="portal-form-actions">
              <button className="platform-secondary" type="submit">
                <Save size={16} />
                Guardar borrador
              </button>
              <button
                className="platform-button"
                type="button"
                disabled={!review || review.status !== 'draft' || dirty}
                onClick={submit}
              >
                <Send size={16} />
                Enviar a moderación
              </button>
            </div>
            {dirty && review && <p className="portal-form-hint">Guarda tus cambios antes de enviar.</p>}
          </form>
        )}
      </section>
      <aside className="portal-review-aside">
        <span className="platform-pill">RESEÑAS RESPONSABLES</span>
        <h3>
          Una opinión real.
          <br />
          Un servicio terminado.
        </h3>
        <p>En producción, cada reseña estará vinculada a un proyecto finalizado y a su cliente.</p>
        <ul>
          <li>
            <CheckCircle2 size={16} />
            Puedes editar el borrador antes de enviarlo.
          </li>
          <li>
            <CheckCircle2 size={16} />
            La moderación respeta las críticas legítimas.
          </li>
          <li>
            <CheckCircle2 size={16} />
            Una reseña demo nunca figura como verificada.
          </li>
        </ul>
        <small>
          Todos los registros de este entorno son ficticios. No hay publicación en una base de datos real.
        </small>
      </aside>
    </div>
  );
}
