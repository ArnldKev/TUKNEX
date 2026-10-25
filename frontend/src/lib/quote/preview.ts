import { resolveVisualPreferences, type VisualPreferences } from './visual';
import { FEATURES, PROJECT_TYPES, type QuoteInput } from '../pricing';

export const PREVIEW_FIELDS = [
  'projectType',
  'features',
  'businessName',
  'sector',
  'offering',
  'goal',
  'design',
  'stylePreference',
  'colorsLiked',
  'firstImpression',
  'visualPreferences',
] as const;

export interface PreviewContext {
  goal?: string;
  sector?: string;
  offering?: string;
  stylePreference?: string;
  colorsLiked?: string;
  firstImpression?: string;
  visualPreferences?: VisualPreferences;
}
export type PreviewKind = 'web' | 'catalog' | 'system';
export type PreviewSector =
  'food' | 'tourism' | 'commerce' | 'services' | 'health' | 'education' | 'sports' | 'other';
export type PreviewStyle = 'modern' | 'minimal' | 'elegant' | 'corporate' | 'bold';
export interface PreviewPalette {
  name: string;
  accent: string;
  onAccent: string;
  accentText: string;
  surface: string;
  border: string;
  ink: string;
}
export interface PreviewSection {
  id: string;
  label: string;
}
export interface PreviewProduct {
  id: string;
  name: string;
  category: string;
  note: string;
}
export interface PreviewModule {
  id: string;
  label: string;
  description: string;
  records: string[];
}
export interface SolutionPreviewModel {
  key: string;
  kind: PreviewKind;
  projectType: QuoteInput['projectType'];
  solutionName: string;
  businessName: string;
  sector: PreviewSector;
  sectorName: string;
  style: PreviewStyle;
  styleName: string;
  design: QuoteInput['design'];
  palette: PreviewPalette;
  presentation: VisualPreferences;
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    action: 'products' | 'contact' | 'bookings' | 'create' | 'services';
  };
  sections: PreviewSection[];
  offerings: string[];
  products: PreviewProduct[];
  modules: PreviewModule[];
  featureLabels: string[];
  featureFlags: {
    gallery: boolean;
    bookings: boolean;
    whatsapp: boolean;
    contact: boolean;
    search: boolean;
    variations: boolean;
    cart: boolean;
  };
  disclaimer: string;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
function clean(value: string | undefined, limit: number) {
  const text = Array.from(value ?? '')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const letters = Array.from(text);
  return letters.length > limit ? letters.slice(0, limit - 1).join('') + '…' : text;
}
function channel(hex: string) {
  return Number.parseInt(hex, 16);
}
function rgb(hex: string): [number, number, number] {
  const expanded = hex.length === 4 ? '#' + [...hex.slice(1)].map((v) => v + v).join('') : hex;
  return [channel(expanded.slice(1, 3)), channel(expanded.slice(3, 5)), channel(expanded.slice(5, 7))];
}
function toHex(values: number[]) {
  return (
    '#' +
    values
      .map((value) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function mix(a: string, b: string, amount: number) {
  const left = rgb(a),
    right = rgb(b);
  return toHex(left.map((value, index) => value + (right[index] - value) * amount));
}
export function previewContrast(a: string, b: string) {
  const luminance = (color: string) =>
    rgb(color)
      .map((value) => {
        const n = value / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const palettes = [
  { name: 'Turquesa', color: '#078d89', pattern: /turques|teal|cyan|cian/ },
  { name: 'Azul', color: '#2254a3', pattern: /azul|blue|marino/ },
  { name: 'Verde', color: '#36785a', pattern: /verde|green|bosque|natural/ },
  { name: 'Cálido', color: '#ad552e', pattern: /calid|naranja|orange|tierra|terracota|warm/ },
  { name: 'Violeta', color: '#7446a8', pattern: /violeta|morado|purple|lila/ },
  { name: 'Coral', color: '#b74854', pattern: /rojo|red|coral|rosa|pink/ },
  { name: 'Dorado', color: '#9b7429', pattern: /amarillo|dorado|yellow|gold/ },
  { name: 'Neutro', color: '#263d48', pattern: /negro|black|gris|gray|grey|neutro/ },
  { name: 'Claro', color: '#edf3f3', pattern: /blanco|white|claro/ },
];
export function resolvePreviewPalette(colors = '', style = 'modern'): PreviewPalette {
  const text = normalize(colors);
  const hex = colors.match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])/i)?.[0];
  const semantic = palettes.find((palette) => palette.pattern.test(text));
  const fallback =
    style === 'elegant'
      ? palettes[6]
      : style === 'corporate'
        ? palettes[1]
        : style === 'minimal'
          ? palettes[7]
          : style === 'bold'
            ? palettes[4]
            : palettes[0];
  const accent = hex ? toHex(rgb(hex)) : (semantic ?? fallback).color;
  const surface = mix(accent, '#ffffff', 0.94);
  let accentText = accent;
  for (let i = 0; i < 16 && Math.min(previewContrast(accentText, '#ffffff'), previewContrast(accentText, surface), previewContrast(accentText, '#fffdf9')) < 4.5; i++)
    accentText = mix(accentText, '#000000', 0.18);
  return {
    name: hex ? 'Color personalizado ' + accent.toUpperCase() : (semantic ?? fallback).name,
    accent,
    onAccent: previewContrast(accent, '#ffffff') >= 4.5 ? '#ffffff' : '#000000',
    accentText,
    surface,
    border: mix(accent, '#ffffff', 0.73),
    ink: '#173346',
  };
}

const sectors: Record<
  PreviewSector,
  {
    name: string;
    eyebrow: string;
    title: string;
    description: string;
    products: string[];
    offerings: string[];
  }
> = {
  food: {
    name: 'Gastronomía',
    eyebrow: 'SABORES QUE INVITAN A VOLVER',
    title: 'Tu próximo antojo empieza aquí.',
    description: 'Descubre nuestra propuesta, encuentra tu favorito y acércate a una nueva experiencia.',
    products: ['Plato de la casa', 'Café de especialidad', 'Postre del día', 'Selección para compartir'],
    offerings: ['Nuestra propuesta', 'Una experiencia cercana', 'Elige tu favorito'],
  },
  tourism: {
    name: 'Turismo y hospedaje',
    eyebrow: 'DESCONÉCTATE. DESCUBRE ALGO NUEVO.',
    title: 'Un nuevo lugar para tus mejores recuerdos.',
    description: 'Conoce experiencias, explora los espacios y encuentra tu próxima escapada.',
    products: ['Escapada al bosque', 'Cabaña acogedora', 'Ruta de aventura', 'Experiencia en pareja'],
    offerings: ['Conoce los espacios', 'Explora la zona', 'Planea tu visita'],
  },
  commerce: {
    name: 'Comercio',
    eyebrow: 'TU PRÓXIMO FAVORITO, MÁS CERCA',
    title: 'Encuentra algo que se sienta muy tuyo.',
    description: 'Explora una selección organizada y conoce los detalles que hacen especial cada opción.',
    products: ['Colección esencial', 'Edición especial', 'Favorito de temporada', 'Nuevo descubrimiento'],
    offerings: ['Nuestra colección', 'Detalles que importan', 'Atención personalizada'],
  },
  services: {
    name: 'Servicios',
    eyebrow: 'BUENAS IDEAS. SOLUCIONES CERCANAS.',
    title: 'El siguiente paso empieza con confianza.',
    description: 'Conoce cómo podemos ayudarte y encuentra una solución a la medida de lo que necesitas.',
    products: ['Asesoría inicial', 'Servicio a tu medida', 'Paquete integral', 'Acompañamiento'],
    offerings: ['Conoce nuestros servicios', 'Un proceso sencillo', 'Hablemos de tu idea'],
  },
  health: {
    name: 'Salud y bienestar',
    eyebrow: 'UN ESPACIO PARA TU BIENESTAR',
    title: 'Cuidar de ti puede empezar hoy.',
    description: 'Conoce los servicios y los canales de atención en un espacio claro y cercano.',
    products: ['Consulta de bienestar', 'Sesión personalizada', 'Evaluación inicial', 'Plan de seguimiento'],
    offerings: ['Conoce los servicios', 'Encuentra orientación', 'Coordina una consulta'],
  },
  education: {
    name: 'Educación',
    eyebrow: 'EL PRÓXIMO PASO ES APRENDER',
    title: 'Nuevas ideas. Más posibilidades.',
    description: 'Descubre una propuesta de aprendizaje, explora los programas y conoce cómo empezar.',
    products: ['Taller introductorio', 'Curso esencial', 'Sesión práctica', 'Programa de ejemplo'],
    offerings: ['Nuestra propuesta', 'Explora los programas', 'Aprende a tu ritmo'],
  },
  sports: {
    name: 'Deporte',
    eyebrow: 'UNA COLECCIÓN QUE SIGUE TU RITMO',
    title: 'Prepárate para lo que viene.',
    description: 'Explora artículos, descubre opciones y prepara una selección para tu próxima actividad.',
    products: ['Camiseta deportiva', 'Zapatilla urbana', 'Mochila de entrenamiento', 'Accesorio activo'],
    offerings: ['Encuentra tu estilo', 'Explora la selección', 'Da el siguiente paso'],
  },
  other: {
    name: 'Tu negocio',
    eyebrow: 'UNA IDEA CON MUCHO POR DELANTE',
    title: 'Tu negocio tiene algo especial.',
    description: 'Un espacio para contar tu historia, mostrar lo que ofreces y facilitar el primer contacto.',
    products: ['Producto destacado', 'Servicio a tu medida', 'Nueva propuesta', 'Favorito de ejemplo'],
    offerings: ['Lo que ofrecemos', 'Lo que nos hace diferentes', 'Conversemos'],
  },
};
const moduleData: Record<string, { label: string; description: string; records: string[] }> = {
  overview: {
    label: 'Vista general',
    description: 'Tus módulos aparecerán según las funciones que elijas.',
    records: ['Actividad de ejemplo', 'Pendiente de ejemplo', 'Registro de ejemplo'],
  },
  clients: {
    label: 'Clientes',
    description: 'Una vista clara de tus contactos y oportunidades.',
    records: ['Cliente de ejemplo 01', 'Cliente de ejemplo 02', 'Cliente de ejemplo 03'],
  },
  inventory: {
    label: 'Inventario',
    description: 'Una forma sencilla de consultar productos y movimientos.',
    records: ['Producto de ejemplo 01', 'Producto de ejemplo 02', 'Producto de ejemplo 03'],
  },
  reports: {
    label: 'Reportes',
    description: 'Información organizada para revisar la actividad.',
    records: ['Resumen de ejemplo', 'Actividad de ejemplo', 'Reporte de ejemplo'],
  },
  orders: {
    label: 'Pedidos',
    description: 'Sigue una solicitud desde una sola vista.',
    records: ['Pedido de ejemplo 01', 'Pedido de ejemplo 02', 'Pedido de ejemplo 03'],
  },
  bookings: {
    label: 'Reservas',
    description: 'Organiza solicitudes y fechas por confirmar.',
    records: ['Reserva de ejemplo 01', 'Reserva de ejemplo 02', 'Reserva de ejemplo 03'],
  },
};

/** Pure and deterministic. Contact, budget and pricing never enter this visual model. */
export function buildSolutionPreview(
  input: Pick<QuoteInput, 'projectType' | 'features' | 'design'>,
  businessName = '',
  context: PreviewContext = {},
): SolutionPreviewModel {
  const name = clean(businessName, 72) || 'Tu negocio';
  const offering = clean(context.offering, 145);
  const topic = normalize(name + ' ' + offering);
  const sector: PreviewSector = /deport|sport|zapatilla|entrenamiento/.test(topic)
    ? 'sports'
    : context.sector && Object.prototype.hasOwnProperty.call(sectors, context.sector)
      ? (context.sector as PreviewSector)
      : 'other';
  const copy = sectors[sector];
  const style: PreviewStyle = ['modern', 'minimal', 'elegant', 'corporate', 'bold'].includes(
    context.stylePreference ?? '',
  )
    ? (context.stylePreference as PreviewStyle)
    : 'modern';
  const kind: PreviewKind =
    input.projectType === 'system'
      ? 'system'
      : input.projectType === 'catalog' || input.projectType === 'store'
        ? 'catalog'
        : 'web';
  const selected = new Set(input.features.filter((id) => FEATURES.some((feature) => feature.id === id)));
  const featureFlags = {
    gallery: selected.has('gallery'),
    bookings: selected.has('bookings'),
    whatsapp: selected.has('whatsapp'),
    contact: selected.has('contact'),
    search: selected.has('search'),
    variations: selected.has('variations'),
    cart: selected.has('cart'),
  };
  const chosenModules = Object.keys(moduleData).filter((id) => id !== 'overview' && selected.has(id));
  const modules = (chosenModules.length ? chosenModules : ['overview']).map((id) => ({
    id,
    ...moduleData[id],
    records: [...moduleData[id].records],
  }));
  const presentation = resolveVisualPreferences(context.visualPreferences);
  const customTitle = clean(context.firstImpression, 100);
  const sections: PreviewSection[] =
    kind === 'system'
      ? modules.map((module) => ({ id: module.id, label: module.label }))
      : kind === 'catalog'
        ? [
            { id: 'products', label: sector === 'food' ? 'La carta' : 'Colección' },
            { id: 'about', label: 'Nuestra propuesta' },
          ]
        : [
            { id: 'inicio', label: 'Inicio' },
            { id: 'services', label: sector === 'food' ? 'Nuestra propuesta' : 'Servicios' },
          ];
  if (kind !== 'system' && featureFlags.contact) sections.push({ id: 'contact', label: 'Contacto' });
  if (kind !== 'system' && presentation.sectionOrder === 'contact' && featureFlags.contact) {
    const contactIndex = sections.findIndex(section => section.id === 'contact');
    sections.splice(1, 0, ...sections.splice(contactIndex, 1));
  }
  let action: SolutionPreviewModel['hero']['action'] =
    kind === 'catalog'
      ? 'products'
      : kind === 'system'
        ? 'create'
        : featureFlags.bookings
          ? 'bookings'
          : featureFlags.contact
            ? 'contact'
            : 'services';
  let cta =
    kind === 'system'
      ? 'Crear un registro demo'
      : kind === 'catalog'
        ? sector === 'food'
          ? 'Ver la carta'
          : 'Explorar productos'
        : featureFlags.bookings
          ? 'Explorar fechas'
          : context.goal === 'orders'
            ? 'Preparar una consulta'
            : 'Conoce nuestra propuesta';
  if (kind === 'web' && context.goal === 'visibility' && !featureFlags.contact && !featureFlags.bookings) {
    action = 'services';
    cta = 'Descubre lo que hacemos';
  }
  const description =
    kind === 'system'
      ? 'Tus procesos y registros, organizados en un espacio diseñado para simplificar tu día.'
      : offering
        ? offering
        : copy.description;
  const suppliedOfferings = (context.offering ?? '')
    .split(/[,;\n]/)
    .map((value) => clean(value, 48))
    .filter(Boolean)
    .slice(0, 3);
  return {
    key: input.projectType + ':' + sector + ':' + [...selected].sort().join(','),
    kind,
    projectType: input.projectType,
    solutionName: PROJECT_TYPES.find((project) => project.id === input.projectType)?.name ?? 'Tu solución',
    businessName: name,
    sector,
    sectorName: copy.name,
    style,
    styleName: {
      modern: 'Moderno',
      minimal: 'Minimalista',
      elegant: 'Elegante',
      corporate: 'Corporativo',
      bold: 'Con personalidad',
    }[style],
    design: input.design,
    palette: resolvePreviewPalette(context.colorsLiked, style),
    presentation,
    hero: {
      eyebrow: kind === 'system' ? 'TU NEGOCIO, EN SINTONÍA' : copy.eyebrow,
      title: customTitle || (kind === 'system' ? 'Tu día a día, mucho más claro.' : copy.title),
      description,
      cta,
      action,
    },
    sections,
    offerings: suppliedOfferings.length ? suppliedOfferings : [...copy.offerings],
    products: copy.products.map((product, index) => ({
      id: sector + '-' + index,
      name: product,
      category: index < 2 ? 'Destacados' : 'Más opciones',
      note: 'Ejemplo de producto o servicio',
    })),
    modules,
    featureLabels: FEATURES.filter((feature) => selected.has(feature.id)).map((feature) => feature.name),
    featureFlags,
    disclaimer:
      'Maqueta orientativa en vivo. No representa el diseño final ni realiza compras, reservas o envíos reales.',
  };
}

export interface PreviewInteractionState {
  section: string;
  search: string;
  category: string;
  selection: Record<string, number>;
  day: number | null;
  reviewed: string[];
  created: number;
  reviewing: boolean;
  notice: string;
}
export type PreviewAction =
  | { type: 'section'; id: string }
  | { type: 'search'; value: string }
  | { type: 'category'; value: string }
  | { type: 'quantity'; id: string; delta: number }
  | { type: 'day'; value: number }
  | { type: 'row'; id: string }
  | { type: 'create' }
  | { type: 'review-selection' }
  | { type: 'clear-selection' }
  | { type: 'notice'; text: string }
  | { type: 'reset' };

export function initialPreviewInteraction(): PreviewInteractionState {
  return {
    section: '',
    search: '',
    category: 'Todos',
    selection: {},
    day: null,
    reviewed: [],
    created: 0,
    reviewing: false,
    notice: '',
  };
}
export function previewInteractionReducer(
  state: PreviewInteractionState,
  action: PreviewAction,
): PreviewInteractionState {
  switch (action.type) {
    case 'section':
      return { ...state, section: action.id, reviewing: false, notice: '' };
    case 'search':
      return { ...state, search: action.value.slice(0, 100) };
    case 'category':
      return { ...state, category: action.value };
    case 'quantity': {
      const count = Math.max(0, Math.min(9, (state.selection[action.id] ?? 0) + action.delta));
      return {
        ...state,
        selection: { ...state.selection, [action.id]: count },
        notice: count
          ? 'Selección de ejemplo actualizada. No se realiza una compra.'
          : 'Artículo retirado de la selección de ejemplo.',
      };
    }
    case 'day':
      return {
        ...state,
        day: action.value,
        notice: 'Día ' + action.value + ' elegido en la maqueta. No se realiza una reserva.',
      };
    case 'row':
      return {
        ...state,
        reviewed: state.reviewed.includes(action.id)
          ? state.reviewed.filter((id) => id !== action.id)
          : [...state.reviewed, action.id],
        notice: 'Estado del registro de ejemplo actualizado sólo en esta maqueta.',
      };
    case 'create':
      return {
        ...state,
        created: Math.min(4, state.created + 1),
        notice: 'Nuevo registro de ejemplo añadido a la maqueta. No se guarda en un servidor.',
      };
    case 'review-selection':
      return { ...state, reviewing: !state.reviewing };
    case 'clear-selection':
      return { ...state, selection: {}, reviewing: false, notice: 'Selección de ejemplo vaciada.' };
    case 'notice':
      return { ...state, notice: action.text };
    case 'reset':
      return initialPreviewInteraction();
  }
}

export function filterPreviewProducts(model: SolutionPreviewModel, search: string, category = 'Todos') {
  const query = normalize(search.trim());
  return model.products.filter(
    (product) =>
      (category === 'Todos' || product.category === category) &&
      (!model.featureFlags.search || normalize(product.name).includes(query)),
  );
}
