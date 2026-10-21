'use client';
import { useState } from 'react';
import {
  Check,
  ArrowRight,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  MessageCircle,
  BarChart3,
  Coffee,
  Leaf,
  Gift,
  MapPin,
  BriefcaseBusiness,
  ChevronRight,
} from 'lucide-react';
export type SolutionKind = 'landing' | 'business' | 'catalog' | 'store' | 'system';
const products = [
  { name: 'Café de origen', category: 'Café', price: 28, icon: Coffee, art: 'coffee' },
  { name: 'Miel del bosque', category: 'Natural', price: 35, icon: Leaf, art: 'honey' },
  { name: 'Kit de regalo', category: 'Selección', price: 65, icon: Gift, art: 'box' },
];
export function SolutionPreview({ kind, compact = false }: { kind: SolutionKind; compact?: boolean }) {
  const commerce = kind === 'catalog' || kind === 'store';
  const [page, setPage] = useState(kind === 'system' ? 'Resumen' : commerce ? 'Productos' : 'Inicio');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState(0);
  const [notice, setNotice] = useState('');
  const [tasks, setTasks] = useState([false, false, true]);
  const nav =
    kind === 'system'
      ? ['Resumen', 'Clientes', 'Tareas', 'Reportes']
      : kind === 'store'
        ? ['Productos', 'Mi pedido']
        : kind === 'catalog'
          ? ['Productos', 'Nosotros']
          : kind === 'business'
            ? ['Inicio', 'Servicios', 'Nosotros', 'Contacto']
            : ['Inicio', 'Oferta', 'Contacto'];
  const filtered = products.filter((item) =>
    item.name
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .includes(
        query
          .toLocaleLowerCase('es')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      ),
  );
  return (
    <div className={'xp-demo ' + (compact ? 'compact' : '')} aria-label="Pantalla conceptual interactiva">
      <div className="xp-demo-toolbar">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>Tu negocio · ejemplo interactivo</span>
        <span className="v5-screen-safe">DEMO</span>
      </div>
      <div className="xp-demo-body">
        <div className="xp-demo-nav">
          <strong>
            {kind === 'system' ? 'nexo' : commerce ? 'origen.' : 'tu marca.'}
            <i />
          </strong>
          <nav aria-label="Páginas del ejemplo">
            {nav.map((tab) => (
              <button
                type="button"
                key={tab}
                aria-pressed={page === tab}
                className={page === tab ? 'active' : ''}
                onClick={() => {
                  setPage(tab);
                  setNotice('');
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
          {commerce && (
            <button
              type="button"
              aria-label={'Ver selección, ' + cart + ' artículos'}
              onClick={() =>
                kind === 'store'
                  ? setPage('Mi pedido')
                  : setNotice(
                      cart
                        ? cart +
                            ' productos en tu selección de ejemplo. La consulta continuaría por WhatsApp.'
                        : 'Elige un producto para probar la selección.',
                    )
              }
            >
              <ShoppingBag size={17} />
              <small>{cart}</small>
            </button>
          )}
        </div>
        {kind === 'system' ? (
          <div className="xp-demo-system">
            <span className="xp-demo-label">TU ESPACIO DE TRABAJO · EJEMPLO</span>
            <h3>
              {page === 'Clientes'
                ? 'Tus clientes, en un lugar.'
                : page === 'Tareas'
                  ? 'Un paso a la vez.'
                  : page === 'Reportes'
                    ? 'Una mirada a lo que avanza.'
                    : 'Todo conectado. Más simple.'}
            </h3>
            <div className="xp-demo-stats">
              <div>
                <span>Registros demo</span>
                <b>12</b>
              </div>
              <div>
                <span>Tareas listas</span>
                <b>{tasks.filter(Boolean).length}/3</b>
              </div>
              <div>
                <span>Estado</span>
                <b>
                  En marcha <i />
                </b>
              </div>
            </div>
            {page === 'Clientes' ? (
              <div className="v5-demo-clients">
                {['Negocio Bosque', 'Café Local', 'Taller Creativo'].map((name, i) => (
                  <div key={name}>
                    <span>{name.charAt(0)}</span>
                    <div>
                      <strong>{name} · Demo</strong>
                      <small>Cliente ficticio {i + 1}</small>
                    </div>
                    <span className="v5-client-status">En seguimiento</span>
                  </div>
                ))}
              </div>
            ) : page === 'Reportes' ? (
              <div className="xp-demo-report">
                <BarChart3 size={24} />
                <div>
                  {[23, 48, 36, 70, 56, 85, 72, 96].map((height, i) => (
                    <i style={{ height }} key={i} />
                  ))}
                </div>
                <span>Datos ilustrativos</span>
              </div>
            ) : (
              <div className="xp-demo-tasks">
                {[
                  'Revisar una nueva consulta',
                  'Confirmar la propuesta',
                  'Organizar el siguiente pedido',
                ].map((task, i) => (
                  <button
                    type="button"
                    aria-pressed={tasks[i]}
                    key={task}
                    onClick={() =>
                      setTasks((previous) => previous.map((value, idx) => (idx === i ? !value : value)))
                    }
                  >
                    <span className={tasks[i] ? 'done' : ''}>{tasks[i] && <Check size={13} />}</span>
                    {task}
                    <small>{tasks[i] ? 'Listo' : 'Pendiente'}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : commerce ? (
          page === 'Mi pedido' ? (
            <div className="v5-demo-checkout">
              <span className="xp-demo-label">TU PEDIDO · SIMULACIÓN</span>
              <h3>Un siguiente paso claro.</h3>
              <div className="v5-checkout-steps">
                <span className="active">01 · Carrito</span>
                <ChevronRight size={15} />
                <span>02 · Entrega</span>
                <ChevronRight size={15} />
                <span>03 · Pago</span>
              </div>
              <div className="v5-order-summary">
                <ShoppingBag size={28} />
                <strong>{cart} productos de ejemplo</strong>
                <p>En el proyecto final definimos medios de pago, entrega y confirmación del pedido.</p>
              </div>
              <button
                type="button"
                className="v5-demo-action"
                onClick={() =>
                  setNotice(
                    'Simulación sin cobro. La pasarela de pago y las entregas requieren definir el alcance.',
                  )
                }
              >
                Probar siguiente paso <ArrowRight size={16} />
              </button>
            </div>
          ) : page === 'Nosotros' ? (
            <div className="xp-demo-copy">
              <span className="xp-demo-label">EL ORIGEN DE LO QUE HACEMOS</span>
              <h3>Productos con una historia.</h3>
              <p>Aquí podrías presentar tu negocio y lo que hace especial a tu oferta.</p>
              <button type="button" onClick={() => setPage('Productos')}>
                Volver a los productos <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="xp-demo-collection-title">
                <div>
                  <span className="xp-demo-label">PRODUCTOS DE EJEMPLO</span>
                  <h3>
                    Hecho cerca.
                    <br />
                    Pensado para ti.
                  </h3>
                </div>
                <label>
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar productos"
                    aria-label="Buscar en el catálogo de demostración"
                  />
                </label>
              </div>
              <div className="xp-demo-products">
                {filtered.map((product) => (
                  <article key={product.name}>
                    <div className={'v5-product-visual ' + product.art} aria-hidden="true">
                      <product.icon size={58} strokeWidth={1.2} />
                      <span>{product.category}</span>
                    </div>
                    <span>{product.category}</span>
                    <h4>{product.name}</h4>
                    <div>
                      <b>S/ {product.price}</b>
                      <button
                        type="button"
                        aria-label={'Agregar ' + product.name}
                        onClick={() => {
                          setCart((value) => Math.min(value + 1, 99));
                          setNotice(product.name + ' añadido a la selección de ejemplo.');
                        }}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </article>
                ))}
                {filtered.length === 0 && (
                  <p className="xp-demo-empty">No encontramos productos. Prueba “café”.</p>
                )}
              </div>
              <div className="xp-demo-order">
                <span>{cart} productos seleccionados</span>
                <button
                  type="button"
                  onClick={() =>
                    kind === 'store'
                      ? setPage('Mi pedido')
                      : setNotice(
                          cart
                            ? 'Consulta de ejemplo preparada. El contacto real continuaría por WhatsApp.'
                            : 'Añade un producto para probar la consulta.',
                        )
                  }
                >
                  {kind === 'store' ? 'Ver pedido' : 'Consultar selección'} <ArrowRight size={15} />
                </button>
                {cart > 0 && (
                  <button
                    type="button"
                    aria-label="Vaciar selección"
                    onClick={() => {
                      setCart(0);
                      setNotice('Selección vaciada.');
                    }}
                  >
                    <Minus size={16} />
                  </button>
                )}
              </div>
            </>
          )
        ) : page === 'Contacto' ? (
          <div className="xp-demo-copy">
            <span className="xp-demo-label">UN CONTACTO MÁS SIMPLE</span>
            <h3>Empieza con un hola.</h3>
            <p>Así podrías facilitar que tus próximos clientes te escriban.</p>
            <button
              type="button"
              onClick={() =>
                setNotice('Contacto de ejemplo. El botón final conectaría con el WhatsApp del negocio.')
              }
            >
              <MessageCircle size={17} /> Probar contacto
            </button>
          </div>
        ) : page === 'Servicios' ? (
          <div className="xp-demo-copy">
            <span className="xp-demo-label">LO QUE PODEMOS HACER POR TI</span>
            <h3>Un espacio para cada servicio.</h3>
            <div className="v5-mini-services">
              {['Asesoría cercana', 'Trabajo a medida', 'Acompañamiento'].map((name, i) => (
                <div key={name}>
                  <BriefcaseBusiness size={23} />
                  <strong>{name}</strong>
                  <span>0{i + 1}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setPage('Contacto')}>
              Consultar un servicio <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="xp-demo-landing">
            <div>
              <span className="xp-demo-label">
                {page === 'Nosotros'
                  ? 'UNA HISTORIA PROPIA'
                  : kind === 'landing'
                    ? 'UNA PÁGINA. TU PRÓXIMA OPORTUNIDAD.'
                    : 'BIENVENIDO A TU NEGOCIO'}
              </span>
              <h3>
                {page === 'Nosotros' ? (
                  <>
                    Tu negocio.
                    <br />
                    Tu propia esencia.
                  </>
                ) : page === 'Oferta' ? (
                  <>
                    Lo que necesitas.
                    <br />
                    En un solo lugar.
                  </>
                ) : (
                  <>
                    Buenas ideas.
                    <br />
                    Nuevas posibilidades.
                  </>
                )}
              </h3>
              <p>
                {kind === 'landing'
                  ? 'Presenta tu oferta y convierte una visita en una conversación.'
                  : 'Muestra lo que haces y conecta con quienes necesitan tu trabajo.'}
              </p>
              <button type="button" onClick={() => setPage('Contacto')}>
                Conversemos <ArrowRight size={16} />
              </button>
              <span className="v5-demo-location">
                <MapPin size={13} /> Cerca de ti · Negocio de ejemplo
              </span>
            </div>
            <div className="v5-page-map">
              <div className="v5-page-map-cover">
                <GlobeArt />
                <span>{kind === 'landing' ? 'TU PROPUESTA, CLARA' : 'UNA MARCA CON IDENTIDAD'}</span>
              </div>
              {[
                kind === 'landing' ? 'Presenta tu oferta' : 'Conoce nuestros servicios',
                'Lo que nos hace diferentes',
                'Una forma de contactarnos',
              ].map((text, i) => (
                <div className="v5-map-row" key={text}>
                  <span>0{i + 1}</span>
                  <strong>{text}</strong>
                  <ArrowRight size={13} />
                </div>
              ))}
            </div>
          </div>
        )}
        {notice && (
          <p className="xp-demo-notice" role="status">
            {notice}
            <button type="button" aria-label="Cerrar aviso de demostración" onClick={() => setNotice('')}>
              ×
            </button>
          </p>
        )}
      </div>
      <div className="xp-demo-caption">MAQUETA ORIENTATIVA · SIN COMPRAS NI ENVÍOS REALES</div>
    </div>
  );
}
function GlobeArt() {
  return (
    <svg viewBox="0 0 160 90" aria-hidden="true">
      <circle cx="80" cy="46" r="34" />
      <ellipse cx="80" cy="46" rx="16" ry="34" />
      <path d="M46 46h68M52 26h56M52 66h56" />
      <circle className="v5-map-node" cx="111" cy="32" r="5" />
      <circle className="v5-map-node" cx="52" cy="62" r="4" />
    </svg>
  );
}
