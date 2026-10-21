'use client';

import { DEMO_MODE } from '@/config/environment';
import { RealClientPortal } from './real-client-portal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { platformRepository, usePlatformData } from '@/lib/platform/repository';
import type { Project, Quote } from '@/lib/platform/types';
import { ReviewEditor } from '@/components/reviews/review-editor';
import '@/components/auth/platform.css';
import { useAccessibleModal } from '@/components/auth/use-accessible-modal';

export type ClientSection = 'overview' | 'cotizaciones' | 'proyectos' | 'mensajes' | 'perfil' | 'resenas';
const nav = [
  { id: 'overview', href: '/mi-cuenta', title: 'Mi espacio', icon: LayoutDashboard },
  { id: 'cotizaciones', href: '/mi-cuenta/cotizaciones', title: 'Mis cotizaciones', icon: FileText },
  { id: 'proyectos', href: '/mi-cuenta/proyectos', title: 'Mis proyectos', icon: FolderKanban },
  { id: 'mensajes', href: '/mi-cuenta/mensajes', title: 'Mis mensajes', icon: MessageCircle },
  { id: 'resenas', href: '/mi-cuenta/resenas', title: 'Mis reseñas', icon: Star },
  { id: 'perfil', href: '/mi-cuenta/perfil', title: 'Mi perfil', icon: UserRound },
];
const projectStatus: Record<Project['status'], string> = {
  planning: 'Planificación',
  development: 'En desarrollo',
  review: 'En revisión',
  completed: 'Finalizado',
  paused: 'Pausado',
};
const money = (n: number | null) =>
  n === null
    ? 'Evaluación personalizada'
    : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(
        n,
      );
const date = (v: string) => new Date(v).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
export function ClientPortal({ section = 'overview' }: { section?: ClientSection }) {
  if (!DEMO_MODE) return <RealClientPortal section={section} />;
  return (
    <RoleGate allowed={['client']}>
      <ClientPortalContent section={section} />
    </RoleGate>
  );
}
function ClientPortalContent({ section }: { section: ClientSection }) {
  const auth = useDemoAuth(),
    data = usePlatformData(),
    router = useRouter(),
    userId = auth.user!.id;
  const user = data.users.find((u) => u.id === userId) || auth.user!,
    quotes = data.quotes.filter((q) => q.userId === userId),
    projects = data.projects.filter((p) => p.userId === userId);
  const [menu, setMenu] = useState(false),
    [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  useAccessibleModal(selectedQuote !== null, () => setSelectedQuote(null));
  const selected = quotes.find((q) => q.id === selectedQuote),
    title = nav.find((n) => n.id === section)?.title || 'Mi espacio';
  return (
    <div className="client-portal">
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
            <UserRound size={19} />
          </span>
          <div>
            <strong>Espacio del cliente</strong>
            <small>Todo empieza con una idea.</small>
          </div>
        </div>
        <p className="portal-nav-label">MI SIGUIENTE NIVEL</p>
        <nav aria-label="Mi cuenta">
          {nav.map(({ id, href, title, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={section === id ? 'active' : ''}
              aria-current={section === id ? 'page' : undefined}
            >
              <Icon size={18} />
              {title}
              {id === 'mensajes' && <span className="portal-nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <div className="portal-sidebar-note">
            <Sparkles size={22} />
            <h3>Tu idea puede llegar más lejos.</h3>
            <p>Descubre qué solución encaja con tu negocio.</p>
            <Link href="/explorar">
              Explorar soluciones
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="portal-back-public" href="/">
            Volver al sitio público
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
            <button
              className="portal-mobile-menu"
              aria-label="Abrir navegación"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span>Mi cuenta</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div>
            <span className="portal-demo-badge">
              <span />
              Cliente demo
            </span>
            <Link className="portal-top-profile" href="/mi-cuenta/perfil" aria-label="Abrir perfil">
              <UserRound size={18} />
            </Link>
          </div>
        </header>
        <div className="portal-content">
          <div className="portal-demo-notice">
            <ShieldIcon />
            <span>
              <strong>Este es tu espacio de demostración.</strong> Los proyectos y mensajes son ficticios. Los
              cambios viven sólo en memoria y se reinician al recargar.
            </span>
          </div>
          <div className="portal-page-heading">
            <div>
              <p className="platform-kicker">TUKNEX · CONTIGO EN CADA PASO</p>
              <h1>
                {section === 'overview'
                  ? `Hola, ${user.name.split(' ')[0]}. Tu idea ya está en marcha.`
                  : title}
              </h1>
              <p>
                {section === 'overview'
                  ? 'Aquí las ideas toman forma. Sigamos construyendo la tuya.'
                  : section === 'resenas'
                    ? 'Comparte tu experiencia de demostración, con total honestidad.'
                    : 'Todo lo que necesitas para avanzar con claridad.'}
              </p>
            </div>
            <Link className="platform-button" href="/cotizar">
              <Plus size={16} />
              Nuevo proyecto
            </Link>
          </div>
          {section === 'overview' && (
            <>
              <div className="portal-stat-grid">
                <PortalStat
                  label="Mis cotizaciones"
                  value={quotes.length}
                  icon={FileText}
                  detail="Ideas con un punto de partida"
                />
                <PortalStat
                  label="Proyectos en marcha"
                  value={projects.filter((p) => p.status !== 'completed').length}
                  icon={FolderKanban}
                  detail="Cada paso nos acerca"
                />
                <PortalStat
                  label="Proyectos finalizados"
                  value={projects.filter((p) => p.status === 'completed').length}
                  icon={CheckCircle2}
                  detail="Listos para el siguiente nivel"
                />
              </div>
              <div className="portal-overview-grid">
                <section className="portal-panel">
                  <div className="portal-panel-heading">
                    <div>
                      <h2>Tu próximo hito</h2>
                      <p>Así va tomando forma tu proyecto demo.</p>
                    </div>
                    <Link className="platform-text-link" href="/mi-cuenta/proyectos">
                      Ver proyectos
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                  {projects.find((p) => p.status !== 'completed') ? (
                    <ProjectCard project={projects.find((p) => p.status !== 'completed')!} embedded />
                  ) : (
                    <div className="portal-inner-empty">
                      <CheckCircle2 size={25} />
                      <p>Tus proyectos están al día. Un buen momento para pensar en tu siguiente idea.</p>
                    </div>
                  )}
                </section>
                <aside className="portal-next-card">
                  <span className="portal-next-icon">
                    <Sparkles size={24} />
                  </span>
                  <p className="platform-kicker">EL SIGUIENTE PASO</p>
                  <h2>Nos gusta escucharte.</h2>
                  <p>¿Tienes una idea, una pregunta o algo que compartir? Tu equipo está a un mensaje.</p>
                  <Link href="/mi-cuenta/mensajes">
                    Abrir mis mensajes
                    <ArrowRight size={17} />
                  </Link>
                </aside>
              </div>
              <section className="portal-panel">
                <div className="portal-panel-heading">
                  <div>
                    <h2>Tus últimas cotizaciones</h2>
                    <p>Estimaciones preliminares, sujetas a validación.</p>
                  </div>
                  <Link className="platform-text-link" href="/mi-cuenta/cotizaciones">
                    Ver todas
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
                <QuoteList quotes={quotes.slice(0, 3)} open={setSelectedQuote} />
              </section>
              <div className="portal-notification">
                <Bell size={20} />
                <span>
                  <strong>Notificación ficticia</strong>Tu proyecto «Landing Esencial · Demo» está finalizado.
                  Puedes explorar el formulario de reseñas.
                </span>
                <Link href="/mi-cuenta/resenas">
                  Escribir reseña
                  <ArrowRight size={15} />
                </Link>
              </div>
            </>
          )}
          {section === 'cotizaciones' && (
            <section className="portal-panel">
              <div className="portal-panel-heading">
                <div>
                  <h2>De idea a propuesta</h2>
                  <p>Los presupuestos asociados a este usuario demo.</p>
                </div>
                <span className="portal-count">{quotes.length} registros</span>
              </div>
              <QuoteList quotes={quotes} open={setSelectedQuote} />
              {!quotes.length && (
                <PortalEmpty
                  title="Tu siguiente idea empieza aquí."
                  text="Completa el configurador desde esta sesión para verla en tu historial."
                  href="/cotizar"
                  action="Diseñar mi proyecto"
                />
              )}
            </section>
          )}
          {section === 'proyectos' && (
            <div className="portal-projects-grid">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
              {!projects.length && (
                <PortalEmpty
                  title="Todavía no hay proyectos."
                  text="Cuando se apruebe una cotización, el equipo podrá convertirla en un proyecto demo."
                  href="/mi-cuenta/cotizaciones"
                  action="Ver cotizaciones"
                />
              )}
            </div>
          )}
          {section === 'mensajes' && <ClientMessages userId={userId} />}
          {section === 'perfil' && <ClientProfileForm userId={userId} />}
          {section === 'resenas' && <ReviewEditor userId={userId} />}
          <footer className="portal-footer">
            <span>TUKNEX · La base de tu siguiente nivel</span>
            <span>Demo local · Sin backend de producción</span>
          </footer>
        </div>
      </main>
      {selected && (
        <div className="platform-modal-backdrop" onClick={() => setSelectedQuote(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            className="platform-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="platform-modal-close"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedQuote(null)}
            >
              <X size={20} />
            </button>
            <p className="platform-kicker">COTIZACIÓN DEMO · VERSIÓN {selected.version}</p>
            <h2 id="quote-modal-title">{selected.project}</h2>
            <p className="platform-muted">
              {selected.business} · {date(selected.date)}
            </p>
            <div className="portal-quote-summary">
              <strong>{money(selected.amount)}</strong>
              <span className="platform-status">{selected.status}</span>
            </div>
            <p className="portal-quote-disclaimer">
              Estimación preliminar sujeta a validación de requisitos. Dominio, hosting, licencias y costos de
              terceros se evalúan por separado.
            </p>
            <h3>Respuestas de tu proyecto</h3>
            <dl className="portal-answer-list">
              {selected.answers.map((a, i) => (
                <div key={a.id || i}>
                  <dt>{a.question}</dt>
                  <dd>{a.value || 'Sin definir'}</dd>
                </div>
              ))}
            </dl>
            {selected.features.length > 0 && (
              <>
                <h3>Módulos seleccionados</h3>
                <div className="portal-feature-tags">
                  {selected.features.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
              </>
            )}
            <p className="portal-quote-disclaimer">{selected.notes}</p>
            <div className="portal-form-actions">
              <button className="platform-secondary" onClick={() => window.print()}>
                Imprimir resumen
              </button>
              <Link className="platform-button" href={`/cotizar?tipo=${selected.projectType}`}>
                Volver a cotizar
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function ShieldIcon() {
  return <ShieldCheck size={17} />;
}
function PortalStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof FileText;
}) {
  return (
    <article className="portal-stat">
      <span className="portal-stat-icon">
        <Icon size={22} />
      </span>
      <span>{label}</span>
      <strong>{String(value).padStart(2, '0')}</strong>
      <p>{detail} · Demo</p>
    </article>
  );
}
function QuoteList({ quotes, open }: { quotes: Quote[]; open: (id: string) => void }) {
  return (
    <div className="portal-quotes-list">
      {quotes.map((q) => (
        <button key={q.id} onClick={() => open(q.id)}>
          <span className="portal-quote-icon">
            <FileText size={20} />
          </span>
          <span className="portal-quote-title">
            <strong>{q.project}</strong>
            <small>
              {q.business} · {date(q.date)} · Demo
            </small>
          </span>
          <span className="platform-status">{q.status}</span>
          <strong className="portal-quote-amount">{money(q.amount)}</strong>
          <ArrowUpRight size={17} />
        </button>
      ))}
    </div>
  );
}
function ProjectCard({ project, embedded = false }: { project: Project; embedded?: boolean }) {
  return (
    <article className={`portal-project-card ${embedded ? 'embedded' : ''}`}>
      <div className="portal-project-card-top">
        <span className="portal-feature-icon">
          <FolderKanban size={23} />
        </span>
        <span className={`platform-status ${project.status === 'completed' ? 'success' : ''}`}>
          {projectStatus[project.status]}
        </span>
      </div>
      <p className="platform-kicker">PROYECTO FICTICIO · {project.type}</p>
      <h2>{project.name}</h2>
      <p className="portal-project-description">{project.description}</p>
      <div className="portal-project-progress">
        <div>
          <span>Avance simulado</span>
          <strong>{project.progress}%</strong>
        </div>
        <div>
          <span style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <ol className="portal-milestones">
        {project.milestones.map((m) => (
          <li key={m.id} className={m.completed ? 'done' : ''}>
            {m.completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
            <span>{m.title}</span>
            {m.completed && <small>Completado</small>}
          </li>
        ))}
      </ol>
      <div className="portal-project-manager">
        <UserRound size={15} />
        {project.manager}
      </div>
      {project.status === 'completed' && (
        <Link className="platform-text-link" href="/mi-cuenta/resenas">
          Compartir mi experiencia demo
          <ArrowRight size={15} />
        </Link>
      )}
    </article>
  );
}
function ClientMessages({ userId }: { userId: string }) {
  const data = usePlatformData(),
    conversation = data.conversations.find((c) => c.userId === userId);
  const [message, setMessage] = useState(''),
    [error, setError] = useState('');
  return (
    <section className="portal-panel portal-messages">
      <div className="portal-panel-heading">
        <div className="portal-message-heading">
          <span className="portal-feature-icon">
            <MessageCircle size={22} />
          </span>
          <div>
            <h2>Tu equipo TUKNEX</h2>
            <p>Canal de proyecto · Mensajes de demostración</p>
          </div>
        </div>
        <span className="portal-demo-badge">DEMO</span>
      </div>
      <div className="portal-message-history">
        {conversation?.messages.map((m) => (
          <div key={m.id} className={`portal-message ${m.role === 'user' ? 'user' : ''}`}>
            <span>{m.role === 'user' ? 'Tú · Demo' : 'Equipo TUKNEX · Simulado'}</span>
            <p>{m.content}</p>
            <small>{date(m.timestamp)}</small>
          </div>
        ))}
        {!conversation?.messages.length && (
          <p className="platform-muted">Cuéntanos tu idea para explorar la conversación de prueba.</p>
        )}
      </div>
      <form
        className="portal-message-compose"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            platformRepository.sendClientMessage(userId, message);
            setMessage('');
            setError('');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Revisa el mensaje.');
          }
        }}
      >
        <label className="platform-sr-only" htmlFor="client-message">
          Tu mensaje ficticio
        </label>
        <textarea
          id="client-message"
          required
          maxLength={2000}
          rows={2}
          placeholder="Escribe un mensaje de prueba. Evita datos personales reales."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="platform-button" type="submit">
          <Send size={17} />
          Enviar demo
        </button>
      </form>
      {error && (
        <p className="platform-error" role="alert">
          {error}
        </p>
      )}
      <p className="portal-message-notice">
        La confirmación es automática y simulada. No se envían mensajes a personas ni a servidores.
      </p>
    </section>
  );
}
function ClientProfileForm({ userId }: { userId: string }) {
  const data = usePlatformData(),
    user = data.users.find((u) => u.id === userId)!,
    profile = data.profiles.find((p) => p.userId === userId);
  const [name, setName] = useState(user.name),
    [email, setEmail] = useState(user.email),
    [business, setBusiness] = useState(profile?.business || ''),
    [city, setCity] = useState(profile?.city || ''),
    [phone, setPhone] = useState(profile?.phone || ''),
    [contact, setContact] = useState<'email' | 'message'>(profile?.preferredContact || 'message'),
    [marketing, setMarketing] = useState(profile?.marketingConsent || false),
    [saved, setSaved] = useState(false);
  return (
    <div className="portal-profile-layout">
      <form
        className="portal-panel portal-profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          platformRepository.updateProfile(
            userId,
            { business, city, phone, preferredContact: contact, marketingConsent: marketing },
            { name, email },
          );
          setSaved(true);
        }}
      >
        <div className="portal-panel-heading">
          <span className="portal-feature-icon">
            <UserRound size={22} />
          </span>
          <div>
            <h2>Un perfil a tu medida</h2>
            <p>Usa sólo datos ficticios. Los cambios duran esta carga de página.</p>
          </div>
        </div>
        <div className="portal-profile-fields">
          <div className="platform-form-grid">
            <label className="platform-field">
              Nombre de ejemplo
              <input
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="platform-field">
              Correo ficticio
              <input
                type="email"
                required
                maxLength={120}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="platform-field">
              Negocio ficticio
              <input
                required
                maxLength={80}
                value={business}
                onChange={(e) => {
                  setBusiness(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="platform-field">
              Ciudad
              <input
                maxLength={60}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="platform-field">
              Teléfono de ejemplo <small>Opcional</small>
              <input
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="platform-field">
              Canal preferido
              <select
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value as 'email' | 'message');
                  setSaved(false);
                }}
              >
                <option value="message">Mensajes de la plataforma</option>
                <option value="email">Correo (próximamente)</option>
              </select>
            </label>
          </div>
          <label className="platform-check">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => {
                setMarketing(e.target.checked);
                setSaved(false);
              }}
            />
            <span>Preferencia demo: me gustaría conocer novedades. No se envían comunicaciones reales.</span>
          </label>
          {saved && (
            <p className="platform-success" role="status">
              Perfil demo actualizado en memoria.
            </p>
          )}
          <div className="portal-form-actions">
            <button className="platform-button" type="submit">
              <Save size={16} />
              Guardar cambios demo
            </button>
          </div>
        </div>
      </form>
      <aside className="portal-profile-aside">
        <ShieldIcon />
        <h3>Tu privacidad importa.</h3>
        <p>
          Esta experiencia no es una cuenta real. No almacena estos campos en localStorage ni en un servidor.
        </p>
        <p>Al actualizar la página se recupera tu rol demo, y se restablecen los datos de ejemplo.</p>
        <Link className="platform-text-link" href="/contacto">
          Consultar al equipo
          <ArrowRight size={15} />
        </Link>
      </aside>
    </div>
  );
}
function PortalEmpty({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="portal-empty">
      <Sparkles size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="platform-button" href={href}>
        {action}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
