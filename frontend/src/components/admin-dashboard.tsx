'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quoteChartPeriods } from '@/lib/platform/metrics';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers3,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Workflow,
} from 'lucide-react';
import {
  AdminConversation,
  AdminPackage,
  AdminQuote,
  adminMoney,
  adminPriceLabels,
  defaultAdminPackages,
  defaultAdminPrices,
  LeadStatus,
  pipelineStatuses,
} from '@/lib/admin-data';
import { platformRepository } from '@/lib/platform/repository';
import { RoleGate, useDemoAuth } from '@/lib/platform/auth';
import { LeadActions } from '@/components/admin/lead-actions';
import { AdvancedPricingFields } from '@/components/admin/advanced-pricing';
import { DEFAULT_PRICES } from '@/lib/pricing';
import { billingRequest, hasBillingSession } from '@/lib/billing/api';
import './admin.css';
import { BillingWorkspace } from './billing/billing-workspace';
import { BillingLinks } from './billing/billing-links';

export type AdminTab = 'overview' | 'quotes' | 'leads' | 'pipeline' | 'conversations' | 'prices' | 'packages';
type Tab = AdminTab;
const tabRoutes: Record<Tab, string> = {
  overview: '/admin',
  quotes: '/admin/cotizaciones',
  leads: '/admin/clientes',
  pipeline: '/admin/embudo',
  conversations: '/admin/conversaciones',
  prices: '/admin/precios',
  packages: '/admin/servicios',
};
const sections: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Vista general', icon: LayoutDashboard },
  { id: 'quotes', label: 'Cotizaciones', icon: FileText },
  { id: 'leads', label: 'Clientes y leads', icon: Users },
  { id: 'pipeline', label: 'Embudo comercial', icon: Workflow },
  { id: 'conversations', label: 'Conversaciones', icon: MessageCircle },
  { id: 'prices', label: 'Precios base', icon: SlidersHorizontal },
  { id: 'packages', label: 'Servicios y paquetes', icon: Package },
];
const titles: Record<Tab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Cada gran proyecto empieza aquí.',
    subtitle: 'Todo lo que necesitas para impulsar tu próximo nivel.',
  },
  quotes: { title: 'Cotizaciones', subtitle: 'De una buena idea a tu próximo proyecto.' },
  leads: { title: 'Clientes y leads', subtitle: 'Conoce a las personas detrás de cada oportunidad.' },
  pipeline: { title: 'Embudo comercial', subtitle: 'Acompaña cada proyecto, desde el primer hola.' },
  conversations: {
    title: 'Conversaciones del asistente',
    subtitle: 'Escucha lo que tus futuros clientes necesitan.',
  },
  prices: { title: 'Configuración de precios', subtitle: 'Precios claros, ajustados a tu mercado.' },
  packages: { title: 'Servicios y paquetes', subtitle: 'Soluciones listas para el siguiente nivel.' },
};
const projectLabels: Record<string, string> = {
  landing: 'Landing page',
  business: 'Web de negocio',
  catalog: 'Catálogo digital',
  store: 'Tienda online',
  system: 'Sistema web',
  redesign: 'Rediseño web',
};
const featureLabels: Record<string, string> = {
  information: 'Información del negocio',
  whatsapp: 'WhatsApp',
  contact: 'Formulario',
  gallery: 'Galería',
  catalog: 'Catálogo',
  cart: 'Carrito',
  payments: 'Pagos',
  bookings: 'Reservas',
  login: 'Usuarios',
  admin: 'Panel administrativo',
  clients: 'Clientes',
  inventory: 'Inventario',
  reports: 'Reportes',
  notifications: 'Avisos',
  integrations: 'Integraciones',
};
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
function valueText(...values: unknown[]) {
  return values.find((v) => typeof v === 'string' && v.trim()) as string | undefined;
}
function normalizeQuote(value: unknown, index: number): AdminQuote {
  const q = asRecord(value),
    contact = asRecord(q.contact),
    business = asRecord(q.business),
    estimate = asRecord(q.estimate || q.result || q.pricing),
    data = asRecord(q.data);
  const project = valueText(q.project, q.projectType, q.type, data.projectType) || 'Proyecto web';
  const rawAmount =
    q.amount ?? q.total ?? q.price ?? estimate.total ?? estimate.price ?? estimate.min ?? estimate.minimum;
  const amount =
    q.amount === null || estimate.custom
      ? 0
      : typeof rawAmount === 'number'
        ? rawAmount
        : Number(rawAmount) || 0;
  return {
    id: valueText(q.id) || `WEB-${index + 1}`,
    name: valueText(q.name, q.customerName, contact.name, data.name) || 'Nuevo contacto',
    business:
      valueText(q.business, q.businessName, business.name, data.businessName) || 'Negocio por definir',
    project: projectLabels[project] || project,
    date: valueText(q.date, q.createdAt) || new Date().toISOString(),
    status: pipelineStatuses.includes(q.status as LeadStatus) ? (q.status as LeadStatus) : 'Nuevo',
    amount,
    email: valueText(q.email, contact.email, data.email) || '',
    phone: valueText(q.phone, q.whatsapp, contact.phone, contact.whatsapp, data.phone) || '',
    notes:
      valueText(q.notes, q.description, q.goal, business.description, data.description) ||
      'Cotización recibida desde el sitio web.',
    demo: false,
    extras: Array.isArray(q.features)
      ? q.features.filter((v): v is string => typeof v === 'string').map((v) => featureLabels[v] || v)
      : undefined,
    timeline: valueText(estimate.duration, q.timeline, estimate.timeline),
  };
}
function normalizeConversation(value: unknown, index: number): AdminConversation {
  const c = asRecord(value),
    messages = Array.isArray(c.messages) ? c.messages : [];
  return {
    id: valueText(c.id) || `CHAT-${index}`,
    name: valueText(c.name, c.visitor) || 'Visitante del sitio',
    date: valueText(c.date, c.createdAt, c.updatedAt) || new Date().toISOString(),
    topic: valueText(c.topic, c.title) || 'Consulta del asistente',
    demo: false,
    messages: messages
      .map((m) => {
        const item = asRecord(m);
        return {
          role: valueText(item.role, item.sender) || 'user',
          text: valueText(item.text, item.content, item.message) || '',
        };
      })
      .filter((m) => m.text),
  };
}
function dateLabel(value: string, includeTime = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      });
}
function initials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function statusClass(status: string) {
  return `adm-status adm-status-${pipelineStatuses.indexOf(status as LeadStatus)}`;
}
function useModalAccessibility(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('.adm-modal button, .adm-modal input')?.focus(),
    );
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.adm-modal button:not([disabled]), .adm-modal input, .adm-modal select, .adm-modal textarea, .adm-modal a[href]',
        ),
      );
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
}

export function AdminDashboard({ initialTab = 'overview' }: { initialTab?: AdminTab }) {
  return (
    <RoleGate allowed={['admin']}>
      <AdminDashboardContent initialTab={initialTab} />
    </RoleGate>
  );
}
function AdminDashboardContent({ initialTab = 'overview' }: { initialTab?: AdminTab }) {
  const { logout } = useDemoAuth();
  const [tab, setTab] = useState<Tab>(initialTab),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [query, setQuery] = useState(''),
    [toast, setToast] = useState(''),
    [notifications, setNotifications] = useState(false);
  const [incoming, setIncoming] = useState<AdminQuote[]>([]),
    [contacts, setContacts] = useState<AdminQuote[]>([]),
    [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES, ...defaultAdminPrices }),
    [packages, setPackages] = useState(defaultAdminPackages),
    [selected, setSelected] = useState<string | null>(null);
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('Nuevo'),
    [leadNotes, setLeadNotes] = useState('');
  useModalAccessibility(selected !== null, () => setSelected(null));
  const notify = useCallback((message: string) => setToast(message), []);
  const refresh = useCallback(() => {
    const data = platformRepository.getSnapshot();
    setIncoming(data.quotes.map((item, index) => ({ ...normalizeQuote(item, index), demo: true })));
    setContacts(
      data.leads.map((item, index) => ({
        ...normalizeQuote(item, index),
        business: item.business || 'Consulta demo',
        project: 'Asesoría digital',
        notes: item.notes || item.message,
        demo: true,
      })),
    );
    setConversations(data.conversations.map(normalizeConversation));
    setPrices({ ...DEFAULT_PRICES, ...defaultAdminPrices, ...readStorage('tuknex-prices', {}) });
    const storedPackages = readStorage<unknown>('tuknex-packages', null);
    if (Array.isArray(storedPackages)) setPackages(storedPackages as AdminPackage[]);
  }, []);
  useEffect(() => {
    refresh();
    const syncTab = () => {
      const value =
        new URLSearchParams(window.location.search).get('tab') ||
        Object.entries(tabRoutes).find(([, path]) => path === window.location.pathname)?.[0];
      if (sections.some((s) => s.id === value)) setTab(value as Tab);
    };
    syncTab();
    const unsubscribe = platformRepository.subscribe(refresh);
    window.addEventListener('popstate', syncTab);
    window.addEventListener('storage', refresh);
    window.addEventListener('tuknex-data', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('tuknex-data', refresh);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const quotes = useMemo(
    () => [...incoming].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [incoming],
  );
  const leads = useMemo(
    () => [...quotes, ...contacts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [quotes, contacts],
  );
  const selectedQuote = leads.find((q) => q.id === selected);
  const go = (next: Tab) => {
    setTab(next);
    setSidebarOpen(false);
    setQuery('');
    window.history.pushState({}, '', tabRoutes[next]);
  };
  const save = (key: string, value: unknown, message: string) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('tuknex-data'));
      notify(message);
      return true;
    } catch {
      notify('No se pudo guardar. Revisa el espacio disponible del navegador.');
      return false;
    }
  };
  const changeStatus = (id: string, status: LeadStatus, notes?: string) => {
    const q = leads.find((item) => item.id === id);
    if (platformRepository.getSnapshot().quotes.some((item) => item.id === id))
      platformRepository.updateQuote(id, { status, notes: notes ?? q?.notes ?? '' });
    else platformRepository.updateLead(id, { status, notes: notes ?? q?.notes ?? '' });
    notify('Oportunidad demo actualizada en memoria.');
  };
  const openQuote = (q: AdminQuote) => {
    setSelected(q.id);
    setLeadStatus(q.status);
    setLeadNotes(q.notes);
  };
  return (
    <div className="admin-app">
      {sidebarOpen && (
        <button
          className="adm-sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`adm-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <Link href="/" className="adm-brand" aria-label="TUKNEX, ir al inicio">
          <img
            className="adm-official-logo"
            src="/images/brand-logo.png"
            alt="TUKNEX · La base de tu siguiente nivel"
          />
        </Link>
        <div className="adm-workspace">
          <div className="adm-workspace-icon">T</div>
          <div>
            <strong>TUKNEX Studio</strong>
            <span>Espacio de trabajo</span>
          </div>
          <span className="adm-workspace-dot" />
        </div>
        <p className="adm-nav-label">PRINCIPAL</p>
        <nav aria-label="Panel administrativo">
          {sections.slice(0, 5).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`adm-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'quotes' && <small>{quotes.length}</small>}
              {tab === id && id !== 'quotes' && <span className="adm-active-dot" />}
            </button>
          ))}
        </nav>
        <nav className="adm-v3-links" aria-label="Gestión de proyectos y calidad">
          <BillingLinks />
          <Link href="/admin/proyectos">
            <Layers3 size={17} />
            Proyectos
          </Link>
          <Link href="/admin/resenas">
            <Sparkles size={17} />
            Reseñas
          </Link>
          <Link href="/admin/usuarios">
            <Users size={17} />
            Usuarios
          </Link>
          <Link href="/admin/faq">
            <CircleHelp size={17} />
            Contenido y FAQ
          </Link>
        </nav>
        <p className="adm-nav-label adm-settings-label">CONFIGURACIÓN</p>
        <nav aria-label="Configuración del panel">
          {sections.slice(5).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`adm-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <div className="adm-sidebar-help">
            <div className="adm-help-icon">
              <Sparkles size={19} />
            </div>
            <strong>El siguiente nivel empieza hoy.</strong>
            <p>Construyendo oportunidades, un negocio a la vez.</p>
            <Link href="/" className="adm-website-link">
              Ver sitio público <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="adm-profile">
            <div className="adm-avatar">TN</div>
            <div>
              <strong>Equipo TUKNEX</strong>
              <span>Administrador · demo</span>
            </div>
            <span className="adm-online-dot" />
          </div>
        </div>
      </aside>
      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-breadcrumb">
            <button className="adm-menu" aria-label="Abrir menú" onClick={() => setSidebarOpen(true)}>
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{sections.find((s) => s.id === tab)?.label}</strong>
          </div>
          <div className="adm-top-actions">
            <span className="adm-live">
              <span />
              Todo en orden
            </span>
            <div className="adm-notifications">
              <button
                className="adm-icon-button"
                aria-label="Ver actividad reciente"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                <span className="adm-bell-dot" />
              </button>
              {notifications && (
                <div className="adm-notification-panel">
                  <strong>Actividad reciente</strong>
                  {quotes.slice(0, 3).map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        openQuote(q);
                        setNotifications(false);
                      }}
                    >
                      <span className="adm-avatar small">{initials(q.name)}</span>
                      <span>
                        <b>{q.business}</b>
                        <small>
                          {q.project} · {dateLabel(q.date)}
                        </small>
                      </span>
                    </button>
                  ))}
                  <p>Datos de demostración y actividad local.</p>
                </div>
              )}
            </div>
            <button className="adm-logout" onClick={() => void logout()}>
              Cerrar sesión
            </button>
            <div className="adm-top-avatar">TN</div>
          </div>
        </header>
        <div className="adm-content">
          <div className="adm-demo-bar">
            <span>
              <span className="adm-demo-dot" />
              <strong>Modo demostración</strong>
              <span className="adm-demo-copy">
                CRM de ejemplo en memoria. Contratos y pagos se guardan en la gestión conectada.
              </span>
            </span>
            <span className="adm-demo-badge">CRM DEMO</span>
          </div>
          <div className="adm-page-heading">
            <div>
              <p className="adm-eyebrow">TU ESPACIO DE CRECIMIENTO</p>
              <h1>{titles[tab].title}</h1>
              <p>{titles[tab].subtitle}</p>
            </div>
            <div className="adm-heading-actions">
              {tab === 'overview' ? (
                <>
                  <span className="adm-date">
                    17 oct. 2026 <ChevronDown size={13} />
                  </span>
                  <button className="adm-primary" onClick={() => go('quotes')}>
                    <FileText size={16} />
                    Ver cotizaciones
                    <ArrowUpRight size={15} />
                  </button>
                </>
              ) : (
                <Link href="/cotizar" className="adm-primary">
                  <Plus size={17} />
                  Nueva cotización
                </Link>
              )}
            </div>
          </div>
          {tab === 'overview' && (
            <>
              <BillingWorkspace section="overview" embedded />
              <Overview quotes={quotes} leads={leads} go={go} openQuote={openQuote} />
            </>
          )}
          {tab === 'quotes' && <BillingWorkspace section="quotes" embedded />}
          {tab === 'quotes' && (
            <details className="billing-legacy">
              <summary>Consultar cotizaciones del CRM demo de esta sesión</summary>
              <QuotesView quotes={quotes} query={query} setQuery={setQuery} openQuote={openQuote} />
            </details>
          )}
          {tab === 'leads' && (
            <>
              <BillingWorkspace section="clients" embedded />
              <details className="billing-legacy">
                <summary>Solicitudes y leads de la sesión demo</summary>
                <LeadActions />
                <LeadsView quotes={leads} query={query} setQuery={setQuery} openQuote={openQuote} />
              </details>
            </>
          )}
          {tab === 'pipeline' && (
            <PipelineView quotes={leads} changeStatus={changeStatus} openQuote={openQuote} />
          )}
          {tab === 'conversations' && <ConversationsView conversations={conversations} />}
          {tab === 'prices' && (
            <PricesView
              prices={prices}
              onSave={(next) => {
                if (
                  save('tuknex-prices', next, 'Precios base guardados. El cotizador usará estos valores.')
                ) {
                  setPrices(next);
                  if (hasBillingSession())
                    void billingRequest('billing/prices', { method: 'PATCH', body: JSON.stringify(next) })
                      .then(() => {
                        window.dispatchEvent(new Event('tuknex-data'));
                        notify('Tarifas sincronizadas con los PDFs del servidor.');
                      })
                      .catch((e) =>
                        notify(e instanceof Error ? e.message : 'No se pudieron sincronizar las tarifas.'),
                      );
                  else
                    notify(
                      'Tarifas guardadas para la demo. Conecta la gestión de documentos y vuelve a guardar para sincronizar los PDFs.',
                    );
                }
              }}
            />
          )}
          {tab === 'packages' && (
            <PackagesView
              packages={packages}
              onSave={(next) => {
                if (save('tuknex-packages', next, 'Paquetes actualizados')) setPackages(next);
              }}
            />
          )}
          <footer className="adm-footer">
            <span>© 2026 TUKNEX · La base de tu siguiente nivel</span>
            <span>
              <span className="adm-local-dot" />
              CRM demo · Gestión documental conectada
            </span>
          </footer>
        </div>
      </main>
      {selectedQuote && (
        <div className="adm-modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="adm-modal-close" aria-label="Cerrar detalle" onClick={() => setSelected(null)}>
              <X size={20} />
            </button>
            <p className="adm-eyebrow">
              {selectedQuote.id} · {selectedQuote.demo ? 'DATOS DE DEMOSTRACIÓN' : 'RECIBIDO DESDE LA WEB'}
            </p>
            <div className="adm-detail-person">
              <div className="adm-avatar large">{initials(selectedQuote.name)}</div>
              <div>
                <h2 id="lead-detail-title">{selectedQuote.name}</h2>
                <p>{selectedQuote.business}</p>
              </div>
            </div>
            <div className="billing-callout">
              <Link
                className="adm-primary"
                href={'/admin/contratos?origen=' + encodeURIComponent(selectedQuote.id)}
              >
                Preparar contrato desde esta cotización
              </Link>
            </div>
            <div className="adm-detail-summary">
              <div>
                <span>Proyecto</span>
                <strong>{selectedQuote.project}</strong>
              </div>
              <div>
                <span>Monto estimado</span>
                <strong>
                  {selectedQuote.amount > 0 ? adminMoney(selectedQuote.amount) : 'Evaluación personalizada'}
                </strong>
              </div>
              <div>
                <span>Fecha de solicitud</span>
                <strong>{dateLabel(selectedQuote.date, true)}</strong>
              </div>
              <div>
                <span>Origen</span>
                <strong>
                  {selectedQuote.demo
                    ? 'Demostración'
                    : selectedQuote.project === 'Asesoría digital'
                      ? 'Formulario de contacto'
                      : 'Cotizador web'}
                </strong>
              </div>
            </div>
            <div className="adm-detail-contact">
              <Mail size={16} />
              <span>{selectedQuote.email || 'Correo no registrado'}</span>
            </div>
            <div className="adm-detail-contact">
              <MessageCircle size={16} />
              <span>{selectedQuote.phone || 'WhatsApp no registrado'}</span>
            </div>
            {selectedQuote.extras && selectedQuote.extras.length > 0 && (
              <p className="adm-detail-extras">Funciones: {selectedQuote.extras.join(', ')}</p>
            )}
            <label className="adm-field">
              Estado de la oportunidad
              <select value={leadStatus} onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}>
                {pipelineStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              Observaciones
              <textarea value={leadNotes} onChange={(e) => setLeadNotes(e.target.value)} rows={4} />
            </label>
            <div className="adm-modal-actions">
              {platformRepository.getSnapshot().leads.some((item) => item.id === selectedQuote.id) && (
                <button
                  className="adm-secondary"
                  onClick={() => {
                    platformRepository.deleteLead(selectedQuote.id);
                    setSelected(null);
                    notify('Lead demo eliminado de esta sesión.');
                  }}
                >
                  Eliminar lead demo
                </button>
              )}
              <button className="adm-secondary" onClick={() => setSelected(null)}>
                Cancelar
              </button>
              <button
                className="adm-primary"
                onClick={() => {
                  changeStatus(selectedQuote.id, leadStatus, leadNotes);
                  setSelected(null);
                }}
              >
                <Save size={16} />
                Guardar cambios
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="adm-toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label="Cerrar aviso" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
  accent?: boolean;
}) {
  return (
    <article className={`adm-stat ${accent ? 'adm-stat-accent' : ''}`}>
      <div className="adm-stat-top">
        <span>{label}</span>
        <span className="adm-stat-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong className="adm-stat-value">{value}</strong>
      <p>
        <TrendingUp size={13} />
        {detail}
      </p>
      <svg className="adm-stat-spark" width="82" height="30" viewBox="0 0 82 30" aria-hidden="true">
        <path
          d="M1 26L13 20L22 23L35 12L46 16L57 7L68 10L81 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </article>
  );
}

function Overview({
  quotes,
  leads,
  go,
  openQuote,
}: {
  quotes: AdminQuote[];
  leads: AdminQuote[];
  go: (tab: Tab) => void;
  openQuote: (q: AdminQuote) => void;
}) {
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');
  const total = quotes.reduce((sum, q) => sum + q.amount, 0),
    approved = quotes.filter((q) => ['Aprobado', 'En desarrollo', 'Finalizado'].includes(q.status)).length;
  const unique = new Set(leads.map((q) => q.email || q.name)).size;
  const services = Object.entries(
    quotes.reduce<Record<string, number>>((acc, q) => {
      acc[q.project] = (acc[q.project] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const chart = quoteChartPeriods(
    quotes.map((quote) => quote.date),
    chartRange,
  );
  const counts = chart.periods.map((period) => period.count);
  const maxCount = Math.max(3, ...counts),
    chartPoints = counts
      .map((c, i) => `${36 + i * (570 / (counts.length - 1))},${170 - (c / maxCount) * 135}`)
      .join(' ');
  return (
    <>
      <div className="adm-stats-grid">
        <StatCard
          label="Cotizaciones generadas"
          value={String(quotes.length).padStart(2, '0')}
          detail={`${quotes.filter((q) => q.status === 'Nuevo').length} nuevas oportunidades`}
          icon={FileText}
        />
        <StatCard
          label="Clientes y leads"
          value={String(unique).padStart(2, '0')}
          detail="Negocios con mucho potencial"
          icon={Users}
        />
        <StatCard
          label="Valor del pipeline"
          value={adminMoney(total)}
          detail="Monto estimado acumulado"
          icon={Wallet}
          accent
        />
        <StatCard
          label="Tasa de conversión"
          value={`${Math.round((approved / Math.max(quotes.length, 1)) * 100)}%`}
          detail={`${approved} proyectos aprobados o avanzados`}
          icon={TrendingUp}
        />
      </div>
      <div className="adm-overview-charts">
        <section className="adm-panel adm-chart-panel">
          <div className="adm-panel-heading">
            <div>
              <h2>Así crecen tus oportunidades</h2>
              <p>Cotizaciones recibidas · {chart.monthLabel}</p>
            </div>
            <select
              aria-label="Periodo del gráfico"
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value as 'week' | 'month')}
            >
              <option value="week">Últimos 7 días</option>
              <option value="month">Este mes</option>
            </select>
          </div>
          <div className="adm-chart-legend">
            <span className="adm-legend-dot" />
            Cotizaciones
            <span className="adm-chart-total">
              {counts.reduce((s, c) => s + c, 0)} <small>en el periodo</small>
            </span>
          </div>
          <div className="adm-chart">
            <div className="adm-chart-y">
              {[maxCount, Math.round(maxCount / 2), 0].map((n, i) => (
                <span key={i}>{n}</span>
              ))}
            </div>
            <svg
              viewBox="0 0 640 200"
              role="img"
              aria-label={`Gráfico de cotizaciones: ${counts.join(', ')} por periodo`}
            >
              <defs>
                <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10c5b1" stopOpacity=".2" />
                  <stop offset="100%" stopColor="#10c5b1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[35, 102, 170].map((y) => (
                <line key={y} x1="36" x2="606" y1={y} y2={y} stroke="#edf0f5" strokeDasharray="5 5" />
              ))}
              <polygon points={`36,170 ${chartPoints} 606,170`} fill="url(#admArea)" />
              <polyline
                points={chartPoints}
                fill="none"
                stroke="#0bb9a8"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {counts.map((c, i) => (
                <g key={i}>
                  <circle
                    cx={36 + (i * 570) / (counts.length - 1)}
                    cy={170 - (c / maxCount) * 135}
                    r="5"
                    fill="#fff"
                    stroke="#0bb9a8"
                    strokeWidth="2.5"
                  />
                  <text
                    x={36 + (i * 570) / (counts.length - 1)}
                    y="195"
                    textAnchor="middle"
                    fill="#8d98ab"
                    fontSize="11"
                  >
                    {chart.periods[i].label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>
        <section className="adm-panel adm-services-panel">
          <div className="adm-panel-heading">
            <div>
              <h2>Servicios más solicitados</h2>
              <p>Lo que tus clientes están buscando</p>
            </div>
            <span className="adm-section-icon">
              <Sparkles size={17} />
            </span>
          </div>
          <div className="adm-service-list">
            {services.map(([name, count], i) => (
              <div className="adm-service-item" key={name}>
                <div>
                  <span className={`adm-service-dot adm-service-dot-${i}`} />
                  <strong>{name}</strong>
                  <span>{count}</span>
                </div>
                <div className="adm-progress-track">
                  <span style={{ width: `${(count / quotes.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button className="adm-text-link" onClick={() => go('quotes')}>
            Explorar cotizaciones
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <div className="adm-overview-bottom">
        <section className="adm-panel adm-recent-panel">
          <div className="adm-panel-heading">
            <div>
              <h2>Las últimas oportunidades</h2>
              <p>Ideas de hoy. Proyectos de mañana.</p>
            </div>
            <button className="adm-text-link" onClick={() => go('quotes')}>
              Ver todas
              <ArrowUpRight size={15} />
            </button>
          </div>
          <QuoteTable quotes={quotes.slice(0, 4)} openQuote={openQuote} compact />
        </section>
        <section className="adm-growth-card">
          <div className="adm-growth-orb">
            <Sparkles size={27} />
          </div>
          <span className="adm-growth-tag">HECHO PARA CRECER</span>
          <h2>Tu próximo gran proyecto está más cerca.</h2>
          <p>
            {
              quotes.filter((q) => ['Nuevo', 'Cotizado', 'Contactado', 'Negociación'].includes(q.status))
                .length
            }{' '}
            oportunidades esperan el siguiente paso. Conecta, conversa y construye.
          </p>
          <button onClick={() => go('pipeline')}>
            Ver mi embudo
            <ArrowUpRight size={18} />
          </button>
          <div className="adm-growth-lines" />
        </section>
      </div>
    </>
  );
}

function QuoteTable({
  quotes,
  openQuote,
  compact = false,
}: {
  quotes: AdminQuote[];
  openQuote: (q: AdminQuote) => void;
  compact?: boolean;
}) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>CLIENTE / NEGOCIO</th>
            <th>PROYECTO</th>
            {!compact && <th>FECHA</th>}
            <th>ESTADO</th>
            <th>ESTIMADO</th>
            <th>
              <span className="adm-sr-only">Ver detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => (
            <tr key={q.id}>
              <td>
                <button className="adm-table-person" onClick={() => openQuote(q)}>
                  <span className={`adm-avatar small adm-avatar-${i % 4}`}>{initials(q.name)}</span>
                  <span>
                    <strong>{q.business}</strong>
                    <small>
                      {q.name}
                      {q.demo ? ' · Demo' : ' · Web'}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span className="adm-project-type">{q.project}</span>
              </td>
              {!compact && <td className="adm-table-date">{dateLabel(q.date)}</td>}
              <td>
                <span className={statusClass(q.status)}>
                  <span />
                  {q.status}
                </span>
              </td>
              <td className="adm-table-amount">{q.amount > 0 ? adminMoney(q.amount) : 'A evaluar'}</td>
              <td>
                <button
                  className="adm-table-more"
                  aria-label={`Ver cotización de ${q.name}`}
                  onClick={() => openQuote(q)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {quotes.length === 0 && (
        <EmptyState
          title="No encontramos cotizaciones"
          description="Prueba con otro nombre, negocio o estado."
        />
      )}
    </div>
  );
}

function QuotesView({
  quotes,
  query,
  setQuery,
  openQuote,
}: {
  quotes: AdminQuote[];
  query: string;
  setQuery: (v: string) => void;
  openQuote: (q: AdminQuote) => void;
}) {
  const [status, setStatus] = useState('all'),
    [sort, setSort] = useState('recent');
  const filtered = quotes
    .filter(
      (q) =>
        `${q.name} ${q.business} ${q.project} ${q.id}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()) &&
        (status === 'all' || q.status === status),
    )
    .sort((a, b) =>
      sort === 'amount'
        ? b.amount - a.amount
        : sort === 'oldest'
          ? Date.parse(a.date) - Date.parse(b.date)
          : Date.parse(b.date) - Date.parse(a.date),
    );
  return (
    <section className="adm-panel">
      <div className="adm-view-toolbar">
        <SearchBox query={query} setQuery={setQuery} placeholder="Buscar cliente, negocio o proyecto..." />
        <div className="adm-filter-actions">
          <select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            {pipelineStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Ordenar cotizaciones" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="amount">Mayor monto</option>
          </select>
        </div>
      </div>
      <div className="adm-result-count">
        {filtered.length} cotizaciones<span>Los registros «Demo» son ejemplos ficticios.</span>
      </div>
      <QuoteTable quotes={filtered} openQuote={openQuote} />
      <div className="adm-table-footer">
        <span>
          Mostrando {filtered.length} de {quotes.length} cotizaciones
        </span>
        <span>
          <CheckCircle2 size={14} />
          Actualizado en este navegador
        </span>
      </div>
    </section>
  );
}

function LeadsView({
  quotes,
  query,
  setQuery,
  openQuote,
}: {
  quotes: AdminQuote[];
  query: string;
  setQuery: (v: string) => void;
  openQuote: (q: AdminQuote) => void;
}) {
  const [status, setStatus] = useState('all');
  const filtered = quotes.filter(
    (q) =>
      `${q.name} ${q.business} ${q.email}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === 'all' || q.status === status),
  );
  return (
    <>
      <div className="adm-view-toolbar adm-toolbar-outside">
        <SearchBox query={query} setQuery={setQuery} placeholder="Busca una persona o negocio..." />
        <select
          aria-label="Filtrar clientes por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          {pipelineStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="adm-leads-grid">
        {filtered.map((q, i) => (
          <article className="adm-lead-card" key={q.id}>
            <div className="adm-lead-card-top">
              <span className={`adm-avatar adm-avatar-${i % 4}`}>{initials(q.name)}</span>
              <span className={statusClass(q.status)}>
                <span />
                {q.status}
              </span>
            </div>
            <h2>{q.name}</h2>
            <p className="adm-lead-business">
              {q.business} {q.demo && <span>DEMO</span>}
            </p>
            <div className="adm-lead-contact">
              <Mail size={14} />
              <span>{q.email || 'Sin correo registrado'}</span>
            </div>
            <div className="adm-lead-contact">
              <MessageCircle size={14} />
              <span>{q.phone || 'Sin WhatsApp registrado'}</span>
            </div>
            <p className="adm-lead-note">{q.notes}</p>
            <div className="adm-lead-card-bottom">
              <span>{q.project}</span>
              <button aria-label={`Ver y editar a ${q.name}`} onClick={() => openQuote(q)}>
                Ver detalle
                <ArrowUpRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          title="Aún no hay coincidencias"
          description="Cambia la búsqueda para encontrar tus contactos."
        />
      )}
    </>
  );
}

function PipelineView({
  quotes,
  changeStatus,
  openQuote,
}: {
  quotes: AdminQuote[];
  changeStatus: (id: string, status: LeadStatus) => void;
  openQuote: (q: AdminQuote) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const moveQuote = (quoteId: string, status: LeadStatus) => {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote || !pipelineStatuses.includes(status)) {
      setAnnouncement('No se pudo mover la oportunidad. Actualiza el embudo e inténtalo de nuevo.');
      return;
    }
    if (quote.status === status) {
      setAnnouncement(`${quote.business} ya está en ${status}.`);
      return;
    }
    const controlId = `adm-kanban-status-${quote.id}`;
    const restoreControlFocus = document.activeElement?.id === controlId;
    changeStatus(quote.id, status);
    if (restoreControlFocus) requestAnimationFrame(() => document.getElementById(controlId)?.focus());
    setAnnouncement(`${quote.business} se movió de ${quote.status} a ${status}.`);
  };
  return (
    <>
      <div className="adm-pipeline-summary">
        <span>
          <Workflow size={16} />
          {quotes.length} oportunidades en el embudo
        </span>
        <strong>
          {adminMoney(quotes.reduce((s, q) => s + q.amount, 0))} <small>en proyectos estimados</small>
        </strong>
      </div>
      <p className="adm-kanban-help" id="adm-kanban-help">
        Arrastra una tarjeta a otra columna o utiliza su selector «Mover a» con teclado o pantalla táctil.
      </p>
      <p className="adm-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div
        className="adm-kanban"
        tabIndex={0}
        aria-label="Embudo comercial, desplázate horizontalmente para ver las ocho etapas"
        aria-describedby="adm-kanban-help"
      >
        {pipelineStatuses.map((status, index) => {
          const items = quotes.filter((q) => q.status === status);
          return (
            <section
              className={`adm-kanban-column ${dropTarget === status ? 'is-drop-target' : ''}`}
              key={status}
              aria-label={`${status}, ${items.length} oportunidades`}
              onDragOver={(event) => {
                if (!draggedId || !quotes.some((quote) => quote.id === draggedId)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTarget(status);
              }}
              onDragLeave={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  setDropTarget((current) => (current === status ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const quoteId = event.dataTransfer.getData('application/x-tuknex-opportunity');
                if (quoteId && quoteId === draggedId && quotes.some((quote) => quote.id === quoteId)) {
                  moveQuote(quoteId, status);
                } else {
                  setAnnouncement('La tarjeta no pertenece a las oportunidades disponibles.');
                }
                setDraggedId(null);
                setDropTarget(null);
              }}
            >
              <div className="adm-kanban-heading">
                <span className={`adm-kanban-dot adm-dot-${index}`} />
                <h2>{status}</h2>
                <span>{items.length}</span>
              </div>
              <p className="adm-kanban-total">{adminMoney(items.reduce((s, q) => s + q.amount, 0))}</p>
              <div className="adm-kanban-cards">
                {items.map((q) => (
                  <article
                    className={`adm-kanban-card ${draggedId === q.id ? 'is-dragging' : ''}`}
                    key={q.id}
                    draggable
                    aria-describedby="adm-kanban-help"
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/x-tuknex-opportunity', q.id);
                      event.dataTransfer.setData('text/plain', q.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedId(q.id);
                      setAnnouncement(`Moviendo ${q.business}. Suelta la tarjeta en la etapa deseada.`);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTarget(null);
                    }}
                  >
                    <div className="adm-kanban-card-label">
                      <span>{q.project}</span>
                      {q.demo && <small>DEMO</small>}
                    </div>
                    <button className="adm-kanban-title" onClick={() => openQuote(q)}>
                      {q.business}
                      <ArrowUpRight size={14} />
                    </button>
                    <p>{q.name}</p>
                    <strong>{q.amount ? adminMoney(q.amount) : 'A evaluar'}</strong>
                    <div className="adm-kanban-card-footer">
                      <span className="adm-avatar tiny">{initials(q.name)}</span>
                      <span>{dateLabel(q.date)}</span>
                    </div>
                    <label className="adm-kanban-move">
                      <span>Mover a</span>
                      <select
                        id={`adm-kanban-status-${q.id}`}
                        aria-label={`Cambiar estado de ${q.business}`}
                        value={q.status}
                        onChange={(e) => moveQuote(q.id, e.target.value as LeadStatus)}
                      >
                        {pipelineStatuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
                {!items.length && (
                  <div className="adm-kanban-empty">Las próximas oportunidades aparecerán aquí.</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function ConversationsView({ conversations }: { conversations: AdminConversation[] }) {
  const [activeId, setActiveId] = useState<string | null>(null),
    [query, setQuery] = useState('');
  const filtered = conversations.filter((c) =>
    `${c.name} ${c.topic} ${c.messages.map((m) => m.text).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const active = filtered.find((c) => c.id === activeId) || filtered[0];
  return (
    <section className="adm-panel adm-conversations">
      <div className="adm-conversation-list">
        <div className="adm-conversation-list-heading">
          <h2>
            Mensajes <span>{conversations.length}</span>
          </h2>
          <SearchBox query={query} setQuery={setQuery} placeholder="Buscar conversación..." />
        </div>
        <div className="adm-conversation-list-items">
          {filtered.map((c) => (
            <button
              className={`adm-conversation-item ${active?.id === c.id ? 'selected' : ''}`}
              key={c.id}
              onClick={() => setActiveId(c.id)}
            >
              <div className="adm-conversation-avatar">
                <MessageCircle size={19} />
              </div>
              <span>
                <strong>{c.name}</strong>
                <small>{c.topic}</small>
                <span>
                  {dateLabel(c.date)}
                  {c.demo ? ' · Demo' : ' · Web'}
                </span>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </div>
      <div className="adm-chat-history">
        {active ? (
          <>
            <div className="adm-chat-history-heading">
              <div className="adm-conversation-avatar">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2>{active.topic}</h2>
                <p>
                  {active.name} · {dateLabel(active.date, true)}
                </p>
              </div>
              <span className="adm-chat-label">{active.demo ? 'DEMO' : 'LOCAL'}</span>
            </div>
            <div className="adm-chat-message-list">
              <p className="adm-chat-date">Historial de conversación · {dateLabel(active.date)}</p>
              {active.messages.map((m, i) => (
                <div className={`adm-chat-row ${m.role === 'user' ? 'user' : 'assistant'}`} key={i}>
                  {m.role !== 'user' && (
                    <div className="adm-chat-bot">
                      <Sparkles size={15} />
                    </div>
                  )}
                  <div>
                    <span>{m.role === 'user' ? 'Visitante' : 'Asistente TUKNEX'}</span>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {active.messages.length === 0 && (
                <EmptyState
                  title="Sin mensajes guardados"
                  description="La conversación aún no tiene mensajes disponibles."
                />
              )}
            </div>
            <div className="adm-chat-history-note">
              <CircleHelp size={15} />
              Vista de historial. Las respuestas del asistente son simuladas.
            </div>
          </>
        ) : (
          <EmptyState
            title="No hay conversaciones"
            description="Las consultas del asistente aparecerán aquí."
          />
        )}
      </div>
    </section>
  );
}

function PricesView({
  prices,
  onSave,
}: {
  prices: Record<string, number>;
  onSave: (v: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState(prices),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(prices);
    setDirty(false);
  }, [prices]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
        setDirty(false);
      }}
    >
      <div className="adm-info-banner">
        <Settings2 size={20} />
        <div>
          <strong>Tú defines el punto de partida.</strong>
          <p>
            Estos precios base alimentan el cotizador. Las funciones adicionales y la complejidad ajustan el
            resultado final.
          </p>
        </div>
      </div>
      <div className="adm-prices-grid">
        {Object.entries(adminPriceLabels).map(([id, item], i) => (
          <section className="adm-price-card" key={id}>
            <span className="adm-price-number">0{i + 1}</span>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <label>
              <span>{id === 'store' ? 'Referencia de planificación' : 'Precio base desde'}</span>
              <div className="adm-price-input">
                <span>S/</span>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="10"
                  required
                  aria-label={`Precio base de ${item.name}`}
                  value={draft[id] ?? 0}
                  onChange={(e) => {
                    setDraft({ ...draft, [id]: e.target.valueAsNumber || 0 });
                    setDirty(true);
                  }}
                />
                <span>PEN</span>
              </div>
            </label>
            <span className="adm-price-caption">
              {id === 'store' ? 'Requiere evaluación personalizada' : 'Estimación inicial · Sin extras'}
            </span>
          </section>
        ))}
      </div>
      <AdvancedPricingFields
        draft={draft}
        onChange={(key, value) => {
          setDraft({ ...draft, [key]: value });
          setDirty(true);
        }}
      />
      <div className="adm-save-bar">
        <span>{dirty ? 'Tienes cambios sin guardar' : 'Precios sincronizados con el cotizador local'}</span>
        <div>
          <button
            type="button"
            className="adm-secondary"
            onClick={() => {
              setDraft(prices);
              setDirty(false);
            }}
            disabled={!dirty}
          >
            Descartar
          </button>
          <button className="adm-primary" type="submit" disabled={!dirty}>
            <Save size={16} />
            Guardar precios
          </button>
        </div>
      </div>
      <p className="adm-price-footnote">
        Los proyectos con integraciones, pagos o mayor complejidad pueden requerir una evaluación
        personalizada. Los precios base son orientativos.
      </p>
    </form>
  );
}

function PackagesView({
  packages,
  onSave,
}: {
  packages: AdminPackage[];
  onSave: (v: AdminPackage[]) => void;
}) {
  const [editing, setEditing] = useState<AdminPackage | null>(null);
  useModalAccessibility(editing !== null, () => setEditing(null));
  return (
    <>
      <div className="adm-package-intro">
        <p>{packages.filter((p) => p.active).length} paquetes activos · Diseñados para pequeños negocios</p>
        <button
          className="adm-secondary"
          onClick={() =>
            setEditing({
              id: `custom-${Date.now()}`,
              name: '',
              description: '',
              price: 200,
              delivery: '5 a 7 días',
              features: '',
              active: true,
            })
          }
        >
          <Plus size={16} />
          Crear paquete
        </button>
      </div>
      <div className="adm-packages-grid">
        {packages.map((p, i) => (
          <article className={`adm-package-card ${!p.active ? 'inactive' : ''}`} key={p.id}>
            <div className="adm-package-top">
              <span className="adm-package-icon">
                <Package size={22} />
              </span>
              <span className={`adm-package-status ${p.active ? 'active' : ''}`}>
                <span />
                {p.active ? 'Activo' : 'Oculto'}
              </span>
            </div>
            <span className="adm-package-number">PAQUETE {String(i + 1).padStart(2, '0')}</span>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <div className="adm-package-price">
              <small>Desde</small>
              <strong>{adminMoney(p.price)}</strong>
            </div>
            <div className="adm-package-delivery">Entrega estimada: {p.delivery}</div>
            <ul>
              {p.features
                .split('\n')
                .filter(Boolean)
                .map((f, n) => (
                  <li key={n}>
                    <Check size={15} />
                    {f}
                  </li>
                ))}
            </ul>
            <button className="adm-secondary" onClick={() => setEditing({ ...p })}>
              <Pencil size={15} />
              Editar paquete
              <ArrowUpRight size={15} />
            </button>
          </article>
        ))}
      </div>
      {editing && (
        <div className="adm-modal-backdrop" onClick={() => setEditing(null)}>
          <form
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const exists = packages.some((p) => p.id === editing.id);
              onSave(
                exists ? packages.map((p) => (p.id === editing.id ? editing : p)) : [...packages, editing],
              );
              setEditing(null);
            }}
          >
            <button
              className="adm-modal-close"
              type="button"
              aria-label="Cerrar editor"
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>
            <p className="adm-eyebrow">SERVICIOS TUKNEX</p>
            <h2 id="package-title">{editing.name || 'Nuevo paquete'}</h2>
            <label className="adm-field">
              Nombre del paquete
              <input
                required
                maxLength={60}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label className="adm-field">
              Descripción
              <input
                required
                maxLength={160}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <div className="adm-form-row">
              <label className="adm-field">
                Precio desde (S/)
                <input
                  type="number"
                  min="0"
                  max="100000"
                  required
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.valueAsNumber || 0 })}
                />
              </label>
              <label className="adm-field">
                Entrega estimada
                <input
                  required
                  value={editing.delivery}
                  onChange={(e) => setEditing({ ...editing, delivery: e.target.value })}
                />
              </label>
            </div>
            <label className="adm-field">
              Características (una por línea)
              <textarea
                required
                rows={4}
                value={editing.features}
                onChange={(e) => setEditing({ ...editing, features: e.target.value })}
              />
            </label>
            <label className="adm-checkbox">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              <span>Paquete activo en este panel</span>
            </label>
            <div className="adm-modal-actions">
              <button className="adm-secondary" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="adm-primary" type="submit">
                <Save size={16} />
                Guardar paquete
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function SearchBox({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="adm-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
          <X size={15} />
        </button>
      )}
    </label>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="adm-empty">
      <Search size={26} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
