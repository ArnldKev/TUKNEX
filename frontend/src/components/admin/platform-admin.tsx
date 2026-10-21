'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { moderationReasons, platformRepository, usePlatformData } from '@/lib/platform/repository';
import type { FaqItem, ModerationReason, Project } from '@/lib/platform/types';
import { RatingStars, reviewStatusLabels } from '@/components/reviews/review-editor';
import '@/components/auth/platform.css';
import './platform-admin.css';
import { useAccessibleModal } from '@/components/auth/use-accessible-modal';

export type PlatformAdminSection = 'projects' | 'reviews' | 'users' | 'faq';
const menuItems = [
  { href: '/admin/contratos', label: 'Contratos', icon: FileText },
  { href: '/admin/pagos', label: 'Pagos', icon: FileText },
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: MessageCircle },
  { href: '/proyectos', label: 'Portafolio', icon: FolderKanban },
  { href: '/admin', label: 'Vista general', icon: LayoutDashboard },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { href: '/admin/clientes', label: 'Clientes y leads', icon: Users },
  { href: '/admin/proyectos', label: 'Proyectos', icon: FolderKanban, section: 'projects' },
  { href: '/admin/embudo', label: 'Embudo comercial', icon: Workflow },
  { href: '/admin/conversaciones', label: 'Conversaciones', icon: MessageCircle },
  { href: '/admin/resenas', label: 'Reseñas', icon: Star, section: 'reviews' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: UserRound, section: 'users' },
  { href: '/admin/precios', label: 'Precios base', icon: SlidersHorizontal },
  { href: '/admin/servicios', label: 'Servicios y paquetes', icon: Package },
  { href: '/admin/faq', label: 'Preguntas frecuentes', icon: CircleHelp, section: 'faq' },
];
const titles = {
  projects: ['Proyectos que toman forma.', 'Una vista compartida con el portal de tu cliente demo.'],
  reviews: ['Escuchar también es crecer.', 'Modera con criterios objetivos, cuidando cada opinión.'],
  users: ['Personas detrás de las ideas.', 'Fichas ficticias, proyectos y actividad en un solo lugar.'],
  faq: ['Respuestas que dan claridad.', 'Edita el contenido de demostración y revisa cómo se verá.'],
};
const statusLabels: Record<Project['status'], string> = {
  planning: 'Planificación',
  development: 'En desarrollo',
  review: 'En revisión',
  completed: 'Finalizado',
  paused: 'Pausado',
};
export function PlatformAdminView({ section }: { section: PlatformAdminSection }) {
  return (
    <RoleGate allowed={['admin']}>
      <PlatformAdminContent section={section} />
    </RoleGate>
  );
}
function PlatformAdminContent({ section }: { section: PlatformAdminSection }) {
  const auth = useDemoAuth(),
    router = useRouter();
  const [menu, setMenu] = useState(false),
    [notice, setNotice] = useState('');
  return (
    <div className="client-portal platform-admin">
      {menu && <button className="portal-scrim" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}
      <aside className={`portal-sidebar ${menu ? 'open' : ''}`}>
        <Link href="/" className="platform-brand">
          <img
            className="official"
            src="/images/brand-logo.png"
            alt="TUKNEX · La base de tu siguiente nivel"
          />
        </Link>
        <div className="portal-workspace">
          <span>
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>TUKNEX Studio</strong>
            <small>Administración demo</small>
          </div>
        </div>
        <p className="portal-nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Administración">
          {menuItems.map(({ href, label, icon: Icon, section: item }) => (
            <Link
              key={href}
              href={href}
              className={item === section ? 'active' : ''}
              aria-current={item === section ? 'page' : undefined}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <Link className="portal-back-public" href="/">
            Ver sitio público
            <ArrowUpRight size={15} />
          </Link>
          <button
            className="portal-logout"
            onClick={async () => {
              await auth.logout();
              router.push('/acceder');
            }}
          >
            <LogOut size={16} />
            Cerrar sesión demo
          </button>
        </div>
      </aside>
      <main className="portal-main">
        <header className="portal-topbar">
          <div>
            <button className="portal-mobile-menu" aria-label="Abrir menú" onClick={() => setMenu(true)}>
              <Menu size={22} />
            </button>
            <span>Administración</span>
            <ChevronRight size={14} />
            <strong>{menuItems.find((m) => m.section === section)?.label}</strong>
          </div>
          <span className="portal-demo-badge">
            <span />
            Administrador demo
          </span>
        </header>
        <div className="portal-content">
          <div className="portal-demo-notice">
            <ShieldCheck size={17} />
            <span>
              <strong>Datos de demostración.</strong> Cambios sólo en memoria. El rol es un control visual; la
              seguridad real requiere backend.
            </span>
          </div>
          <div className="portal-page-heading">
            <div>
              <p className="platform-kicker">TUKNEX · ADMINISTRACIÓN</p>
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
          </div>
          {notice && (
            <div className="platform-success pa-notice" role="status">
              <CheckCircle2 size={17} />
              {notice}
              <button aria-label="Cerrar aviso" onClick={() => setNotice('')}>
                <X size={15} />
              </button>
            </div>
          )}
          {section === 'projects' && <ProjectsAdmin notify={setNotice} />}
          {section === 'reviews' && <ReviewsAdmin notify={setNotice} />}
          {section === 'users' && <UsersAdmin notify={setNotice} />}
          {section === 'faq' && <FaqAdmin notify={setNotice} />}
          <footer className="portal-footer">
            <span>TUKNEX · La base de tu siguiente nivel</span>
            <span>Adaptador de datos en memoria · DEMO</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function AdminSearch({
  value,
  setValue,
  placeholder,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="pa-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
function ProjectsAdmin({ notify }: { notify: (v: string) => void }) {
  const data = usePlatformData();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [quoteId, setQuoteId] = useState('');
  const candidates = data.quotes.filter(
    (q) => q.status === 'Aprobado' && q.userId && !data.projects.some((p) => p.quoteId === q.id),
  );
  const projects = data.projects.filter(
    (p) =>
      `${p.name} ${p.manager} ${data.users.find((u) => u.id === p.userId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'all' || p.status === filter),
  );
  return (
    <>
      <section className="portal-panel pa-create-project">
        <div>
          <span className="portal-feature-icon">
            <Plus size={21} />
          </span>
          <div>
            <h2>Una propuesta aprobada. Un nuevo comienzo.</h2>
            <p>Convierte una cotización en proyecto y compártelo con su cliente demo.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              platformRepository.createProjectFromQuote(quoteId || candidates[0]?.id);
              notify('Proyecto demo creado y sincronizado con el portal del cliente.');
              setQuoteId('');
            } catch (err) {
              notify(err instanceof Error ? err.message : 'No se pudo crear.');
            }
          }}
        >
          <select
            aria-label="Cotización aprobada para convertir"
            required
            value={quoteId || candidates[0]?.id || ''}
            onChange={(e) => setQuoteId(e.target.value)}
          >
            {!candidates.length && <option value="">No hay cotizaciones aprobadas disponibles</option>}
            {candidates.map((q) => (
              <option key={q.id} value={q.id}>
                {q.project} · {q.name}
              </option>
            ))}
          </select>
          <button className="platform-button" type="submit" disabled={!candidates.length}>
            <Plus size={16} />
            Crear proyecto demo
          </button>
        </form>
      </section>
      <div className="pa-toolbar">
        <AdminSearch value={query} setValue={setQuery} placeholder="Buscar proyecto o cliente..." />
        <select aria-label="Filtrar proyectos" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <span>{projects.length} proyectos demo</span>
      </div>
      <div className="pa-project-grid">
        {projects.map((p) => (
          <article className="portal-panel pa-project" key={p.id}>
            <div className="pa-project-heading">
              <span className="portal-feature-icon">
                <FolderKanban size={23} />
              </span>
              <span className="portal-demo-badge">DEMO</span>
            </div>
            <p className="platform-kicker">{p.type}</p>
            <h2>{p.name}</h2>
            <p className="pa-project-client">
              <UserRound size={14} />
              {data.users.find((u) => u.id === p.userId)?.name || 'Cliente demo'}
            </p>
            <p>{p.description}</p>
            <div className="portal-project-progress">
              <div>
                <span>Avance simulado</span>
                <strong>{p.progress}%</strong>
              </div>
              <div>
                <span style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="platform-form-grid">
              <label className="platform-field">
                Estado
                <select
                  value={p.status}
                  onChange={(e) => {
                    platformRepository.updateProject(p.id, { status: e.target.value as Project['status'] });
                    notify('Estado de proyecto actualizado.');
                  }}
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="platform-field">
                Responsable ficticio
                <input
                  key={`${p.id}-${p.manager}`}
                  defaultValue={p.manager}
                  maxLength={70}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== p.manager) {
                      platformRepository.updateProject(p.id, { manager: e.target.value.trim() });
                      notify('Responsable demo actualizado.');
                    }
                  }}
                />
              </label>
            </div>
            <div className="pa-milestone-list">
              <h3>Hitos del proyecto</h3>
              {p.milestones.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={() => platformRepository.toggleMilestone(p.id, m.id)}
                  />
                  <span>{m.title}</span>
                  {m.completed && <Check size={13} />}
                </label>
              ))}
            </div>
            <small>Cliente y administrador consultan la misma fuente en memoria.</small>
          </article>
        ))}
      </div>
      {!projects.length && (
        <AdminEmpty
          title="No hay proyectos con estos filtros."
          text="Prueba otro estado o convierte una cotización aprobada."
        />
      )}
    </>
  );
}
function ReviewsAdmin({ notify }: { notify: (v: string) => void }) {
  const data = usePlatformData();
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('pending'),
    [rating, setRating] = useState('all'),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [reason, setReason] = useState<ModerationReason>('spam'),
    [note, setNote] = useState(''),
    [reply, setReply] = useState('');
  useAccessibleModal(selectedId !== null, () => setSelectedId(null));
  const reviews = data.reviews.filter(
    (r) =>
      r.status !== 'draft' &&
      (status === 'all' || r.status === status) &&
      (rating === 'all' || r.rating === Number(rating)) &&
      `${r.title} ${r.comment} ${r.displayName}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = data.reviews.find((r) => r.id === selectedId);
  const moderate = (target: 'published' | 'rejected') => {
    if (!selected) return;
    try {
      platformRepository.moderateReview(selected.id, target, {
        reason: target === 'rejected' ? reason : undefined,
        note,
        reply,
      });
      notify(
        target === 'published'
          ? 'Reseña aprobada en la demo. No se mostrará como testimonio real.'
          : 'Reseña demo rechazada con motivo objetivo.',
      );
      setSelectedId(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo moderar.');
    }
  };
  return (
    <>
      <div className="pa-review-policy">
        <ShieldCheck size={23} />
        <div>
          <strong>Las críticas honestas también tienen su lugar.</strong>
          <p>
            Publica independientemente de las estrellas. Rechaza sólo por spam, insultos, datos privados o
            contenido ilegal. Las reseñas demo permanecen fuera de los testimonios reales.
          </p>
        </div>
        <Link href="/resenas">
          Ver página pública
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="pa-toolbar">
        <AdminSearch value={query} setValue={setQuery} placeholder="Buscar reseñas..." />
        <select aria-label="Estado de reseñas" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="published">Aprobadas demo</option>
          <option value="rejected">Rechazadas</option>
        </select>
        <select aria-label="Filtrar por estrellas" value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="all">Todas las estrellas</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} estrellas
            </option>
          ))}
        </select>
      </div>
      <div className="pa-review-grid">
        {reviews.map((r) => (
          <article className="portal-panel pa-review-card" key={r.id}>
            <div>
              <RatingStars rating={r.rating} />
              <span className={`platform-status ${r.status === 'published' ? 'success' : ''}`}>
                {reviewStatusLabels[r.status]}
              </span>
            </div>
            <h2>{r.title || 'Opinión sin título'}</h2>
            <p>{r.comment}</p>
            <span className="pa-review-author">
              <UserRound size={15} />
              {r.displayName} · DEMO
            </span>
            <small>
              {data.projects.find((p) => p.id === r.projectId)?.name || 'Proyecto ficticio'} ·{' '}
              {new Date(r.createdAt).toLocaleDateString('es-PE')}
            </small>
            {r.businessReply && (
              <blockquote>
                <strong>Respuesta TUKNEX · Demo</strong>
                <p>{r.businessReply}</p>
              </blockquote>
            )}
            <button
              className="platform-secondary"
              onClick={() => {
                setSelectedId(r.id);
                setReply(r.businessReply);
                setNote(r.moderationNote || '');
                setReason(r.moderationReason || 'spam');
              }}
            >
              <Pencil size={15} />
              Revisar y responder
              <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>
      {!reviews.length && (
        <AdminEmpty
          title="La cola está al día."
          text="No hay reseñas con los filtros seleccionados. Las nuevas reseñas demo aparecerán aquí."
        />
      )}
      {selected && (
        <div className="platform-modal-backdrop" onClick={() => setSelectedId(null)}>
          <section
            className="platform-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="platform-modal-close"
              aria-label="Cerrar moderación"
              onClick={() => setSelectedId(null)}
            >
              <X size={20} />
            </button>
            <p className="platform-kicker">MODERACIÓN DEMO · {selected.displayName}</p>
            <h2 id="moderation-title">Una opinión, con contexto.</h2>
            <RatingStars rating={selected.rating} size={22} />
            <h3>{selected.title}</h3>
            <p className="pa-modal-comment">{selected.comment}</p>
            <p className="platform-info">
              Una valoración baja es válida. No debe rechazarse por ser negativa.
            </p>
            <label className="platform-field">
              Respuesta profesional del negocio
              <textarea
                rows={3}
                maxLength={1200}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Gracias por compartir tu experiencia..."
              />
            </label>
            <label className="platform-field">
              Motivo objetivo, si corresponde rechazar
              <select value={reason} onChange={(e) => setReason(e.target.value as ModerationReason)}>
                {Object.entries(moderationReasons).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="platform-field">
              Nota de moderación
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explica qué debe revisarse, sin descalificar al cliente."
              />
            </label>
            <div className="portal-form-actions">
              <button className="platform-secondary pa-danger" onClick={() => moderate('rejected')}>
                Rechazar con motivo
              </button>
              <button className="platform-button" onClick={() => moderate('published')}>
                <CheckCircle2 size={16} />
                Aprobar demo
              </button>
            </div>
            <small className="platform-muted">
              Aprobar un registro ficticio no lo convierte en una opinión verificada.
            </small>
          </section>
        </div>
      )}
    </>
  );
}
function UsersAdmin({ notify }: { notify: (v: string) => void }) {
  const data = usePlatformData();
  const [query, setQuery] = useState(''),
    [selectedId, setSelectedId] = useState<string | null>(null);
  useAccessibleModal(selectedId !== null, () => setSelectedId(null));
  const users = data.users.filter((u) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
    ),
    selected = data.users.find((u) => u.id === selectedId),
    profile = data.profiles.find((p) => p.userId === selectedId);
  const projects = data.projects.filter((p) => p.userId === selectedId),
    quotes = data.quotes.filter((q) => q.userId === selectedId),
    reviews = data.reviews.filter((r) => r.userId === selectedId);
  const ids = new Set([
    selectedId,
    ...quotes.map((q) => q.id),
    ...projects.map((p) => p.id),
    ...reviews.map((r) => r.id),
  ]);
  return (
    <>
      <div className="pa-toolbar">
        <AdminSearch
          value={query}
          setValue={setQuery}
          placeholder="Buscar persona, correo ficticio o rol..."
        />
        <span>{users.length} usuarios de demostración</span>
      </div>
      <div className="pa-users-grid">
        {users.map((u) => (
          <article className="portal-panel pa-user-card" key={u.id}>
            <div className="pa-user-avatar">
              <UserRound size={25} />
            </div>
            <h2>{u.name}</h2>
            <p>{u.email}</p>
            <span className="platform-status">{u.role === 'admin' ? 'Administrador' : 'Cliente'} · Demo</span>
            <div>
              <span>
                {data.projects.filter((p) => p.userId === u.id).length}
                <small>Proyectos</small>
              </span>
              <span>
                {data.quotes.filter((q) => q.userId === u.id).length}
                <small>Cotizaciones</small>
              </span>
            </div>
            <button className="platform-secondary" onClick={() => setSelectedId(u.id)}>
              Abrir ficha
              <ArrowUpRight size={15} />
            </button>
          </article>
        ))}
      </div>
      {!users.length && (
        <AdminEmpty title="No encontramos usuarios." text="Prueba con otro nombre o rol de ejemplo." />
      )}
      {selected && (
        <div className="platform-modal-backdrop" onClick={() => setSelectedId(null)}>
          <section
            className="platform-modal pa-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="platform-modal-close"
              aria-label="Cerrar ficha"
              onClick={() => setSelectedId(null)}
            >
              <X size={20} />
            </button>
            <p className="platform-kicker">FICHA UNIFICADA · DATOS FICTICIOS</p>
            <h2 id="user-detail-title">{selected.name}</h2>
            <p className="platform-muted">{selected.email}</p>
            <div className="pa-profile-data">
              <span>
                Negocio<strong>{profile?.business || 'No definido'}</strong>
              </span>
              <span>
                Ciudad<strong>{profile?.city || 'No definida'}</strong>
              </span>
              <span>
                ID de relación<strong>{selected.id}</strong>
              </span>
              <span>
                Rol de ficha
                <select
                  aria-label="Cambiar rol de ficha demo"
                  value={selected.role}
                  onChange={(e) => {
                    platformRepository.updateUserRole(selected.id, e.target.value as 'client' | 'admin');
                    notify('Rol de la ficha demo modificado. No cambia permisos reales.');
                  }}
                >
                  <option value="client">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </span>
            </div>
            <p className="platform-info">
              El rol de esta ficha es una demostración. Cambiarlo no altera el rol elegido para tu sesión
              actual ni concede permisos de producción.
            </p>
            <h3>Cotizaciones vinculadas</h3>
            {quotes.map((q) => (
              <div className="pa-related-row" key={q.id}>
                <FileText size={15} />
                <span>
                  {q.project}
                  <small>{q.id}</small>
                </span>
                <b>{q.status}</b>
              </div>
            ))}
            {!quotes.length && <p className="platform-muted">Sin cotizaciones asociadas.</p>}
            <h3>Proyectos vinculados</h3>
            {projects.map((p) => (
              <div className="pa-related-row" key={p.id}>
                <FolderKanban size={15} />
                <span>
                  {p.name}
                  <small>{p.id}</small>
                </span>
                <b>{p.progress}%</b>
              </div>
            ))}
            {!projects.length && <p className="platform-muted">Sin proyectos asociados.</p>}
            <h3>Reseñas</h3>
            {reviews.map((r) => (
              <div className="pa-related-row" key={r.id}>
                <RatingStars rating={r.rating} />
                <span>{r.title || 'Sin título'}</span>
                <b>{reviewStatusLabels[r.status]}</b>
              </div>
            ))}
            {!reviews.length && <p className="platform-muted">Sin reseñas asociadas.</p>}
            <h3>Actividad relacionada</h3>
            {data.activities
              .filter((a) => ids.has(a.entityId) || a.actorId === selected.id)
              .slice(0, 10)
              .map((a) => (
                <div className="pa-activity" key={a.id}>
                  <CheckCircle2 size={14} />
                  <span>
                    {a.action}
                    <small>{new Date(a.date).toLocaleString('es-PE')}</small>
                  </span>
                </div>
              ))}
            {!data.activities.some((a) => ids.has(a.entityId) || a.actorId === selected.id) && (
              <p className="platform-muted">Las acciones de esta sesión aparecerán aquí.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function FaqAdmin({ notify }: { notify: (v: string) => void }) {
  const data = usePlatformData();
  const [editing, setEditing] = useState<FaqItem | null>(null),
    [previewId, setPreviewId] = useState<string | null>(null);
  useAccessibleModal(editing !== null, () => setEditing(null));
  return (
    <>
      <div className="pa-toolbar">
        <p className="platform-muted">Contenido editable en memoria para mostrar el futuro CMS.</p>
        <button
          className="platform-button"
          onClick={() => setEditing({ id: `faq-${Date.now()}`, question: '', answer: '', active: true })}
        >
          <Plus size={16} />
          Nueva pregunta demo
        </button>
      </div>
      <section className="portal-panel pa-faq-list">
        {data.faqs.map((faq) => (
          <article key={faq.id}>
            <div>
              <span className={`platform-status ${faq.active ? 'success' : ''}`}>
                {faq.active ? 'Activa' : 'Oculta'}
              </span>
              <h2>{faq.question}</h2>
              <p>{faq.answer}</p>
            </div>
            <div>
              <button
                className="platform-secondary"
                onClick={() => setPreviewId(previewId === faq.id ? null : faq.id)}
                aria-expanded={previewId === faq.id}
              >
                Vista previa
              </button>
              <button
                className="pa-icon-button"
                aria-label={`Editar ${faq.question}`}
                onClick={() => setEditing({ ...faq })}
              >
                <Pencil size={17} />
              </button>
              <button
                className="pa-icon-button pa-danger"
                aria-label={`Eliminar pregunta demo ${faq.question}`}
                onClick={() => {
                  platformRepository.deleteFaq(faq.id);
                  notify('Pregunta eliminada del contenido demo.');
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
            {previewId === faq.id && (
              <div className="pa-faq-preview">
                <span className="platform-kicker">VISTA PREVIA DEMO</span>
                <details open>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              </div>
            )}
          </article>
        ))}
      </section>
      {!data.faqs.length && (
        <AdminEmpty
          title="Aún no hay preguntas."
          text="Añade una pregunta de demostración para previsualizarla."
        />
      )}
      {editing && (
        <div className="platform-modal-backdrop" onClick={() => setEditing(null)}>
          <form
            className="platform-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-editor-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              try {
                platformRepository.saveFaq(editing);
                notify('Contenido de FAQ demo guardado en memoria.');
                setEditing(null);
              } catch (err) {
                notify(err instanceof Error ? err.message : 'Revisa el contenido.');
              }
            }}
          >
            <button
              type="button"
              className="platform-modal-close"
              aria-label="Cerrar editor"
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>
            <p className="platform-kicker">CONTENIDO DEMO</p>
            <h2 id="faq-editor-title">Una respuesta más clara.</h2>
            <label className="platform-field">
              Pregunta
              <input
                required
                minLength={5}
                maxLength={150}
                value={editing.question}
                onChange={(e) => setEditing({ ...editing, question: e.target.value })}
              />
            </label>
            <label className="platform-field">
              Respuesta
              <textarea
                required
                minLength={15}
                maxLength={1200}
                rows={5}
                value={editing.answer}
                onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
              />
            </label>
            <label className="platform-check">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              <span>Mostrar como activa en el contenido demo</span>
            </label>
            <div className="portal-form-actions">
              <button className="platform-secondary" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="platform-button" type="submit">
                <Save size={16} />
                Guardar pregunta
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
function AdminEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="portal-empty">
      <CheckCircle2 size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
