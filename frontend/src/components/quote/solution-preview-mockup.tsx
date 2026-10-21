'use client';

import { memo, useId, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChefHat,
  ChevronRight,
  Footprints,
  HeartPulse,
  LayoutDashboard,
  MessageCircle,
  Minus,
  Mountain,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { filterPreviewProducts } from '@/lib/quote/preview';
import type {
  PreviewAction,
  PreviewInteractionState,
  PreviewSector,
  SolutionPreviewModel,
} from '@/lib/quote/preview';

interface MockupProps {
  model: SolutionPreviewModel;
  state: PreviewInteractionState;
  onAction: (action: PreviewAction) => void;
  expanded?: boolean;
}
const sectorIcons: Record<PreviewSector, LucideIcon> = {
  food: ChefHat,
  tourism: Mountain,
  commerce: Store,
  services: BriefcaseBusiness,
  health: HeartPulse,
  education: BookOpen,
  sports: Footprints,
  other: Sparkles,
};

function CalendarPreview({ state, onAction }: Pick<MockupProps, 'state' | 'onAction'>) {
  return (
    <section className="lp-calendar" aria-label="Calendario de demostración">
      <div>
        <CalendarDays size={20} />
        <span>
          <strong>Una fecha para tu próximo paso</strong>
          <small>Disponibilidad ilustrativa · no se reserva una cita</small>
        </span>
      </div>
      <div className="lp-calendar-days" role="group" aria-label="Elegir un día de ejemplo">
        {[12, 13, 14, 15, 16].map((day, index) => (
          <button
            type="button"
            key={day}
            aria-pressed={state.day === day}
            onClick={() => onAction({ type: 'day', value: day })}
          >
            <small>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie'][index]}</small>
            <strong>{day}</strong>
            {state.day === day && <Check size={13} />}
          </button>
        ))}
      </div>
      {state.day !== null && (
        <p className="lp-calendar-confirmation">
          <CheckCheck size={16} /> Día {state.day} seleccionado en el ejemplo.
        </p>
      )}
    </section>
  );
}

function WebPreview({ model, state, onAction }: MockupProps) {
  const Icon = sectorIcons[model.sector];
  const section = state.section || model.sections[0]?.id;
  if (section === 'bookings')
    return (
      <div className="lp-detail-view">
        <button
          type="button"
          className="lp-text-button"
          onClick={() => onAction({ type: 'section', id: 'inicio' })}
        >
          <ArrowLeft size={16} /> Volver al inicio de la maqueta
        </button>
        <CalendarPreview state={state} onAction={onAction} />
      </div>
    );
  if (section === 'contact')
    return (
      <div className="lp-contact-view">
        <span className="lp-kicker">CONTACTO · EJEMPLO</span>
        <h4>Una conversación puede ser un gran comienzo.</h4>
        <p>Así podría verse un acceso claro para que tus clientes contacten a {model.businessName}.</p>
        <div className="lp-contact-example">
          <MessageCircle size={30} />
          <strong>Cuéntanos lo que necesitas</strong>
          <span>Formulario o canales de atención según el alcance.</span>
          <button
            type="button"
            className="lp-primary"
            onClick={() =>
              onAction({
                type: 'notice',
                text: 'Consulta de ejemplo preparada. No se envió ningún mensaje ni se guardaron datos personales.',
              })
            }
          >
            Probar una consulta de ejemplo <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    );
  if (section === 'services' || section === 'about')
    return (
      <div className="lp-services-view">
        <span className="lp-kicker">{model.sectorName.toUpperCase()} · DEMOSTRACIÓN</span>
        <h4>Lo que hace especial a {model.businessName}.</h4>
        <p>{model.hero.description}</p>
        <div className="lp-service-cards">
          {model.offerings.map((offering, index) => (
            <article key={offering}>
              <span>0{index + 1}</span>
              <Icon size={25} />
              <h5>{offering}</h5>
              <button
                type="button"
                className="lp-text-button"
                onClick={() =>
                  onAction({
                    type: 'notice',
                    text:
                      offering +
                      ': aquí podrías presentar sus detalles y el siguiente paso. Es contenido orientativo.',
                  })
                }
              >
                Explorar ejemplo <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  return (
    <section className="lp-web-hero">
      <div className="lp-hero-copy">
        <span className="lp-kicker">{model.hero.eyebrow}</span>
        <h4>{model.hero.title}</h4>
        <p>{model.hero.description}</p>
        <button
          type="button"
          className="lp-primary"
          onClick={() => onAction({ type: 'section', id: model.hero.action })}
        >
          {model.hero.cta} <ArrowUpRight size={17} />
        </button>
      </div>
      <div className={'lp-hero-art lp-art-' + model.sector} aria-hidden="true">
        <div className="lp-art-orbit" />
        <div className="lp-art-tile">
          <Icon size={76} strokeWidth={1.2} />
        </div>
        <span className="lp-art-caption">{model.sectorName}</span>
        <i className="lp-art-dot" />
      </div>
    </section>
  );
}

function CatalogPreview({ model, state, onAction, expanded = false }: MockupProps) {
  const Icon = sectorIcons[model.sector],
    searchId = useId();
  const filtered = filterPreviewProducts(model, state.search, state.category);
  const visible = expanded ? filtered : filtered.slice(0, 2);
  const selected = model.products.filter((product) => (state.selection[product.id] ?? 0) > 0);
  const total = selected.reduce((sum, product) => sum + state.selection[product.id], 0);
  return (
    <section className="lp-catalog">
      <header>
        <span className="lp-kicker">{model.hero.eyebrow}</span>
        <h4>{model.hero.title}</h4>
        <p>{model.hero.description}</p>
      </header>
      {model.featureFlags.search && (
        <label className="lp-search" htmlFor={searchId}>
          <Search size={18} />
          <input
            id={searchId}
            type="search"
            value={state.search}
            onChange={(event) => onAction({ type: 'search', value: event.target.value })}
            placeholder="Buscar en los ejemplos"
            autoComplete="off"
          />
        </label>
      )}
      <div className="lp-category-tabs" role="group" aria-label="Categorías de ejemplo">
        {['Todos', 'Destacados', 'Más opciones'].map((category) => (
          <button
            type="button"
            key={category}
            aria-pressed={state.category === category}
            onClick={() => onAction({ type: 'category', value: category })}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="lp-products">
        {visible.map((product) => {
          const quantity = state.selection[product.id] ?? 0;
          return (
            <article key={product.id}>
              <div className={'lp-product-art lp-product-' + model.sector} aria-hidden="true">
                <Icon size={50} strokeWidth={1.25} />
                <i />
              </div>
              <span className="lp-product-example">PRODUCTO DE EJEMPLO</span>
              <h5>{product.name}</h5>
              {model.featureFlags.variations && (
                <span className="lp-product-options">Opciones o variantes disponibles</span>
              )}
              <div className="lp-product-actions">
                <button
                  type="button"
                  className="lp-product-add"
                  onClick={() => onAction({ type: 'quantity', id: product.id, delta: 1 })}
                  disabled={quantity >= 9}
                  aria-label={'Añadir ' + product.name + ' a la selección demo'}
                >
                  {quantity > 0 ? (
                    <>
                      <Check size={16} /> {quantity}
                    </>
                  ) : (
                    <>
                      {model.featureFlags.cart ? 'Añadir' : 'Elegir'} <Plus size={16} />
                    </>
                  )}
                </button>
                {quantity > 0 && (
                  <button
                    type="button"
                    className="lp-product-remove"
                    aria-label={'Quitar una unidad de ' + product.name}
                    onClick={() => onAction({ type: 'quantity', id: product.id, delta: -1 })}
                  >
                    <Minus size={16} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="lp-empty">
          <Search size={26} />
          <strong>No hay ejemplos con esa búsqueda.</strong>
          <button
            type="button"
            className="lp-text-button"
            onClick={() => {
              onAction({ type: 'search', value: '' });
              onAction({ type: 'category', value: 'Todos' });
            }}
          >
            Ver todos los ejemplos
          </button>
        </div>
      )}
      {!expanded && filtered.length > 2 && (
        <p className="lp-compact-hint">Amplía la maqueta para explorar la colección completa.</p>
      )}
      {total > 0 && (
        <div className="lp-selection">
          <div>
            <ShoppingBag size={21} />
            <span>
              <strong>{total} en tu selección</strong>
              <small>Ejemplo · sin compra ni cobro</small>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onAction({ type: 'review-selection' })}
            aria-expanded={state.reviewing}
          >
            {state.reviewing ? 'Ocultar' : 'Revisar'} <ChevronRight size={16} />
          </button>
        </div>
      )}
      {state.reviewing && total > 0 && (
        <div className="lp-selection-detail">
          <h5>Tu selección de ejemplo</h5>
          <ul>
            {selected.map((product) => (
              <li key={product.id}>
                <span>{product.name}</span>
                <strong>×{state.selection[product.id]}</strong>
              </li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              className="lp-text-button"
              onClick={() => onAction({ type: 'clear-selection' })}
            >
              Vaciar selección
            </button>
            <button
              type="button"
              className="lp-primary"
              onClick={() =>
                onAction({
                  type: 'notice',
                  text: 'Pedido de ejemplo preparado. No se ha enviado a un negocio ni se ha realizado ningún cobro.',
                })
              }
            >
              Probar pedido <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SystemPreview({ model, state, onAction }: MockupProps) {
  const module = model.modules.find((item) => item.id === state.section) ?? model.modules[0];
  const rows = [
    ...module.records,
    ...Array.from({ length: Math.min(state.created, 4) }, (_, index) => 'Nuevo registro demo ' + (index + 1)),
  ];
  return (
    <section className="lp-system">
      <div className="lp-system-intro">
        <span className="lp-kicker">ESPACIO DE TRABAJO · DATOS DEMO</span>
        <h4>{model.hero.title}</h4>
        <p>{model.hero.description}</p>
      </div>
      <div className="lp-system-stats">
        <div>
          <span>Registros de ejemplo</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Módulos elegidos</span>
          <strong>{model.modules[0].id === 'overview' ? 'Por definir' : model.modules.length}</strong>
        </div>
      </div>
      <div className="lp-system-toolbar">
        <div>
          <h5>{module.label}</h5>
          <p>{module.description}</p>
        </div>
        <button
          type="button"
          className="lp-primary"
          disabled={state.created >= 4}
          title="Puedes añadir hasta cuatro registros de ejemplo"
          onClick={() => onAction({ type: 'create' })}
        >
          <Plus size={17} /> Registro demo
        </button>
      </div>
      <div className="lp-system-rows" aria-label={'Registros ficticios de ' + module.label}>
        {rows.map((row, index) => {
          const id = module.id + '-' + index,
            reviewed = state.reviewed.includes(id);
          return (
            <button
              type="button"
              key={id}
              aria-pressed={reviewed}
              onClick={() => onAction({ type: 'row', id })}
            >
              <span className="lp-row-icon">
                {reviewed ? <CheckCheck size={18} /> : <LayoutDashboard size={18} />}
              </span>
              <span>
                <strong>{row}</strong>
                <small>{reviewed ? 'Revisado en la maqueta' : 'Toca para cambiar su estado demo'}</small>
              </span>
              <i>{reviewed ? 'Revisado' : 'Pendiente'}</i>
            </button>
          );
        })}
      </div>
      <p className="lp-system-disclaimer">
        Registros e indicadores ficticios. Las operaciones afectan sólo esta maqueta.
      </p>
    </section>
  );
}

export const SolutionPreviewMockup = memo(function SolutionPreviewMockup({
  model,
  state,
  onAction,
  expanded = false,
}: MockupProps) {
  const Icon = model.kind === 'system' ? LayoutDashboard : sectorIcons[model.sector];
  const section = model.sections.some((item) => item.id === state.section)
    ? state.section
    : model.sections[0]?.id;
  const commonPage = model.kind !== 'system' && ['contact', 'about', 'bookings'].includes(state.section);
  const style = {
    '--lp-accent': model.palette.accent,
    '--lp-on-accent': model.palette.onAccent,
    '--lp-accent-text': model.palette.accentText,
    '--lp-surface': model.palette.surface,
    '--lp-border': model.palette.border,
    '--lp-ink': model.palette.ink,
  } as CSSProperties;
  return (
    <div
      className={'lp-prototype ' + (expanded ? 'lp-prototype-expanded' : 'lp-prototype-compact')}
      style={style}
      data-kind={model.kind}
      data-style={model.style}
      data-design={model.design}
      aria-label={'Maqueta orientativa de ' + model.businessName}
    >
      <div className="lp-browser-bar" aria-hidden="true">
        <span>
          <i />
          <i />
          <i />
        </span>
        <small>Tu proyecto · vista de ejemplo</small>
        <ArrowUpRight size={13} />
      </div>
      <header className="lp-site-header">
        <div>
          <span className="lp-site-icon">
            <Icon size={20} />
          </span>
          <strong title={model.businessName}>
            {model.businessName}
            <i>.</i>
          </strong>
        </div>
        <span className="lp-demo-badge">MAQUETA</span>
      </header>
      <nav className="lp-site-nav" aria-label="Secciones del prototipo">
        {model.sections.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={section === item.id}
            onClick={() => onAction({ type: 'section', id: item.id })}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {model.kind === 'system' ? (
        <SystemPreview model={model} state={state} onAction={onAction} />
      ) : commonPage || model.kind === 'web' ? (
        <WebPreview model={model} state={state} onAction={onAction} />
      ) : (
        <CatalogPreview model={model} state={state} onAction={onAction} expanded={expanded} />
      )}
      {model.featureFlags.gallery && model.kind === 'web' && !commonPage && state.section !== 'services' && (
        <section className="lp-gallery" aria-label="Galería de ejemplo">
          <span>ESPACIOS PARA TUS IMÁGENES</span>
          <div>
            {[1, 2, 3].map((number) => (
              <div key={number} aria-label={'Imagen orientativa ' + number}>
                <Icon size={25} strokeWidth={1.2} />
              </div>
            ))}
          </div>
        </section>
      )}
      {expanded && model.featureFlags.bookings && state.section !== 'bookings' && model.kind !== 'system' && (
        <CalendarPreview state={state} onAction={onAction} />
      )}
      {model.featureFlags.whatsapp && model.kind !== 'system' && (
        <button
          type="button"
          className="lp-whatsapp"
          onClick={() =>
            onAction({
              type: 'notice',
              text: 'Así podría verse tu acceso a WhatsApp. Es una muestra: no abre un chat ni envía mensajes.',
            })
          }
        >
          <MessageCircle size={20} />
          <span>
            {model.kind === 'catalog' ? 'Consultar mi selección' : 'Conversemos de tu próximo paso'}
          </span>
          <ArrowUpRight size={17} />
        </button>
      )}
      <div className="lp-interaction-status" role="status" aria-live="polite">
        {state.notice || 'Puedes probar los controles. Todo lo que ves es una demostración.'}
      </div>
    </div>
  );
});
