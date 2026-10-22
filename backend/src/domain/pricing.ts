export type ProjectType = 'landing' | 'business' | 'catalog' | 'store' | 'system' | 'redesign';
export type DesignStyle = 'essential' | 'custom' | 'premium';
export type Timeline = 'flexible' | 'standard' | 'urgent';

export const PROJECT_TYPES = [
  {
    id: 'landing',
    name: 'Landing page',
    description: 'Una página que convierte visitas en clientes.',
    price: 200,
    icon: 'layout',
  },
  {
    id: 'business',
    name: 'Web para mi negocio',
    description: 'Tu negocio, servicios e historia en un solo lugar.',
    price: 250,
    icon: 'building',
  },
  {
    id: 'catalog',
    name: 'Catálogo digital',
    description: 'Tus productos organizados y listos para mostrar.',
    price: 450,
    icon: 'catalog',
  },
  {
    id: 'store',
    name: 'Tienda online',
    description: 'Vende por internet con una solución a tu medida.',
    price: null,
    icon: 'cart',
  },
  {
    id: 'system',
    name: 'Sistema web',
    description: 'Organiza y simplifica los procesos de tu negocio.',
    price: 800,
    icon: 'system',
  },
  {
    id: 'redesign',
    name: 'Mejorar mi web',
    description: 'Una nueva etapa para tu página actual.',
    price: 250,
    icon: 'sparkles',
  },
] as const;

export const FEATURES = [
  { id: 'information', name: 'Información del negocio', detail: 'Quién eres y qué ofreces', price: 0 },
  { id: 'whatsapp', name: 'Botón de WhatsApp', detail: 'Contacto directo y sencillo', price: 0 },
  { id: 'contact', name: 'Formulario de contacto', detail: 'Recibe consultas de clientes', price: 0 },
  { id: 'gallery', name: 'Galería de imágenes', detail: 'Muestra tu trabajo', price: 50 },
  { id: 'catalog', name: 'Catálogo de productos', detail: 'Organiza tu oferta', price: 100 },
  { id: 'cart', name: 'Carrito de compras', detail: 'Compra de varios productos', price: null },
  { id: 'payments', name: 'Pagos online', detail: 'Requiere definir proveedor y flujo', price: null },
  { id: 'bookings', name: 'Reservas o citas', detail: 'Agenda para tus clientes', price: 150 },
  { id: 'login', name: 'Acceso de usuarios', detail: 'Cuentas y permisos básicos', price: 100 },
  { id: 'admin', name: 'Panel administrativo', detail: 'Gestiona tu contenido', price: 150 },
  { id: 'clients', name: 'Gestión de clientes', detail: 'Tu cartera organizada', price: 100 },
  { id: 'inventory', name: 'Inventario', detail: 'Control básico de productos', price: 150 },
  { id: 'reports', name: 'Reportes', detail: 'Consulta tus indicadores', price: 100 },
  { id: 'notifications', name: 'Correos y avisos', detail: 'Notificaciones automáticas', price: 80 },
  { id: 'integrations', name: 'Otras integraciones', detail: 'Conecta herramientas externas', price: null },
  { id: 'search', name: 'Búsqueda y filtros', detail: 'Encuentra productos con facilidad', price: 50 },
  { id: 'variations', name: 'Tallas o variantes', detail: 'Opciones básicas de producto', price: 50 },
  { id: 'orders', name: 'Gestión de pedidos', detail: 'Registro sencillo de solicitudes', price: 100 },
  { id: 'shipping', name: 'Entregas y envíos', detail: 'Define zonas y reglas de entrega', price: null },
  { id: 'roles', name: 'Roles y permisos avanzados', detail: 'Accesos con reglas diferentes', price: null },
  { id: 'einvoice', name: 'Facturación electrónica', detail: 'Evaluar proveedor e integración', price: null },
] as const;

export const DEFAULT_PRICES: Record<string, number> = {
  landing: 200,
  business: 250,
  catalog: 450,
  system: 800,
  redesign: 250,
  gallery: 50,
  bookings: 150,
  login: 100,
  admin: 150,
  clients: 100,
  inventory: 150,
  reports: 100,
  notifications: 80,
  'feature-catalog': 100,
  'design-custom': 100,
  'design-premium': 200,
  'urgent-percent': 20,
  search: 50,
  variations: 50,
  orders: 100,
  'limit-landing': 300,
  'limit-business': 550,
  'limit-catalog': 800,
  'limit-system': 1000,
  'limit-redesign': 550,
  'validity-days': 15,
};

export interface QuoteInput {
  projectType: ProjectType;
  features: string[];
  design: DesignStyle;
  timeline: Timeline;
  budget?: string;
  paymentPreference?: 'unsure'|'daily'|'weekly'|'fortnightly'|'monthly';
  productsRange?: string;
  userRange?: string;
  otherFunctions?: string;
}

export interface QuoteEstimate {
  base: number;
  extras: { id: string; name: string; amount: number }[];
  designAmount: number;
  urgencyAmount: number;
  total: number;
  min: number;
  max: number;
  custom: boolean;
  complexity: 'Esencial' | 'Intermedia' | 'Personalizada';
  duration: string;
  reasons: string[];
  includedModules: string[];
  thirdPartyCosts: string[];
  validityDays: number;
  scope: string[];
  exclusions: string[];
  conditions: string;
  rulesApplied: string[];
}

export interface PricingRuleContext {
  input: QuoteInput;
  selected: Set<string>;
  total: number;
  prices: Record<string, number>;
  moduleCount: number;
}
export interface PricingRule {
  id: string;
  description: string;
  evaluate(context: PricingRuleContext): string | null;
}

export const SYSTEM_MODULES = ['clients', 'inventory', 'reports', 'orders', 'bookings'] as const;
export const PRICING_RULES: PricingRule[] = [
  {
    id: 'commerce-scope',
    description: 'Las tiendas requieren validación de compra y logística.',
    evaluate: ({ input }) =>
      input.projectType === 'store'
        ? 'La tienda requiere definir productos, pedidos, pagos y logística antes de fijar un precio.'
        : null,
  },
  {
    id: 'system-module-limit',
    description: 'Sistema básico limitado a uno o dos módulos sencillos.',
    evaluate: ({ input, moduleCount, prices }) =>
      input.projectType === 'system' && (moduleCount < 1 || moduleCount > 2)
        ? `El rango de ${money(prices.system)}–${money(prices['limit-system'])} aplica únicamente a uno o dos módulos sencillos. Tu sistema necesita una revisión de alcance.`
        : null,
  },
  {
    id: 'manual-feature-review',
    description: 'Pagos, logística e integraciones requieren validar su alcance.',
    evaluate: ({ selected }) => {
      const manual = FEATURES.filter((feature) => feature.price === null && selected.has(feature.id));
      return manual.length
        ? `${manual.map((feature) => feature.name).join(', ')}: debemos evaluar el alcance y los proveedores necesarios.`
        : null;
    },
  },
  {
    id: 'unknown-feature-review',
    description: 'Una función desconocida nunca se interpreta como un extra gratuito.',
    evaluate: ({ selected }) =>
      [...selected].some((id) => !FEATURES.some((feature) => feature.id === id))
        ? 'Hay funciones fuera de nuestro catálogo de reglas. Revisaremos esos requisitos antes de confirmar un importe.'
        : null,
  },
  {
    id: 'system-outside-package',
    description: 'No cobrar un sistema como una landing.',
    evaluate: ({ input, selected }) =>
      input.projectType !== 'system' &&
      ['login', 'admin', ...SYSTEM_MODULES.filter((id) => id !== 'bookings')].some((id) => selected.has(id))
        ? 'La gestión de usuarios o datos requiere lógica de sistema. Revisemos juntos el alcance.'
        : null,
  },
  {
    id: 'package-ceiling',
    description: 'El alcance que supera el límite se revisa manualmente.',
    evaluate: ({ input, prices, total }) =>
      input.projectType !== 'store' && total > prices[`limit-${input.projectType}`]
        ? 'Las funciones o el diseño superan el alcance orientativo de este paquete. Necesitamos conversar para darte un precio responsable.'
        : null,
  },
  {
    id: 'volume-and-requirements',
    description: 'Volúmenes altos y requisitos libres deben validarse.',
    evaluate: ({ input }) =>
      (['catalog', 'store'].includes(input.projectType) && input.productsRange === '100+') ||
      (input.projectType === 'system' && input.userRange === '6+') ||
      !!input.otherFunctions?.trim()
        ? 'El volumen o las funciones adicionales necesitan validación antes de confirmar el importe y el plazo.'
        : null,
  },
];

export interface QuoteRecord extends QuoteInput {
  id: string;
  name: string;
  client: string;
  business: string;
  sector: string;
  goal: string;
  notes: string;
  email: string;
  phone: string;
  project: string;
  amount: number | null;
  estimate: QuoteEstimate;
  status: string;
  date: string;
  createdAt: string;
}

export function estimateQuote(input: QuoteInput, overrides: Record<string, number> = {}): QuoteEstimate {
  const prices = { ...DEFAULT_PRICES };
  for (const [key, value] of Object.entries(overrides)) {
    if (Number.isFinite(value) && value >= 0) prices[key] = value;
  }
  const base = input.projectType === 'store' ? 0 : prices[input.projectType];
  const selected = new Set(input.features);
  const extras: QuoteEstimate['extras'] = [];
  const reasons: string[] = [];
  for (const feature of FEATURES) {
    if (!selected.has(feature.id)) continue;
    if (feature.price === null) {
      continue;
    }
    const included =
      feature.price === 0 ||
      (feature.id === 'catalog' && input.projectType === 'catalog') ||
      (input.projectType === 'system' &&
        (['login', 'admin', ...SYSTEM_MODULES] as readonly string[]).includes(feature.id));
    const key = feature.id === 'catalog' ? 'feature-catalog' : feature.id;
    if (!included) extras.push({ id: feature.id, name: feature.name, amount: prices[key] ?? feature.price });
  }
  const designAmount = input.design === 'essential' ? 0 : prices[`design-${input.design}`];
  const subtotal = base + extras.reduce((sum, item) => sum + item.amount, 0) + designAmount;
  const urgencyAmount =
    input.timeline === 'urgent' ? Math.round((subtotal * prices['urgent-percent']) / 100) : 0;
  const total = subtotal + urgencyAmount;
  const moduleCount = SYSTEM_MODULES.filter((id) => selected.has(id)).length;
  const context: PricingRuleContext = { input, selected, total, prices, moduleCount };
  const rulesApplied: string[] = [];
  for (const rule of PRICING_RULES) {
    const reason = rule.evaluate(context);
    if (reason) {
      reasons.push(reason);
      rulesApplied.push(rule.id);
    }
  }
  const uniqueReasons = [...new Set(reasons)];
  const custom = uniqueReasons.length > 0;
  const duration = custom
    ? 'Por definir según alcance'
    : input.timeline === 'urgent'
      ? '5–10 días hábiles, sujeto a disponibilidad'
      : input.projectType === 'system'
        ? '15–25 días hábiles'
        : input.projectType === 'catalog'
          ? '10–15 días hábiles'
          : '7–12 días hábiles';
  return {
    base,
    extras,
    designAmount,
    urgencyAmount,
    total,
    min: total,
    max: Math.max(
      total,
      Math.min(
        prices[`limit-${input.projectType}`] ?? Infinity,
        input.projectType === 'system'
          ? Math.max(total, prices['limit-system'])
          : Math.ceil((total * 1.2) / 10) * 10,
      ),
    ),
    custom,
    complexity: custom
      ? 'Personalizada'
      : extras.length > 1 || input.projectType === 'system'
        ? 'Intermedia'
        : 'Esencial',
    duration,
    reasons: uniqueReasons,
    includedModules: FEATURES.filter((item) => selected.has(item.id)).map((item) => item.name),
    thirdPartyCosts: [
      'Dominio y hosting: costo y renovación por confirmar.',
      'Licencias, pasarela de pago y proveedores externos: por separado cuando apliquen.',
      'Mantenimiento opcional: se cotiza después de definir la frecuencia.',
    ],
    validityDays: Math.max(1, Math.round(prices['validity-days'])),
    scope:
      input.projectType === 'system' && custom
        ? [
            'Módulos y permisos por definir tras revisar tus requisitos.',
            'El alcance final se detallará en una propuesta personalizada.',
          ]
        : input.projectType === 'system'
          ? [
              'Uno o dos módulos sencillos, sin reglas avanzadas.',
              'Usuarios y acceso básicos; alcance por validar.',
            ]
          : [
              'Diseño responsive para celular y escritorio.',
              input.projectType === 'landing'
                ? 'Una página con secciones esenciales y materiales entregados por el cliente.'
                : input.projectType === 'catalog'
                  ? 'Estructura de catálogo; la cantidad de fichas y carga de contenido se confirma antes de desarrollar.'
                  : 'Contenido y funciones seleccionadas dentro de un alcance acordado.',
            ],
    exclusions: [
      'Dominio, hosting, licencias y cobros de terceros.',
      'Redacción, fotografía o carga masiva de productos no acordada.',
      'Integraciones, roles complejos y automatizaciones fuera del alcance.',
    ],
    conditions:
      'Estimación preliminar sujeta a validación de requisitos. Impuestos, forma de pago y condiciones se confirman en la propuesta final.',
    rulesApplied,
  };
}

export function readPriceOverrides(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem('tuknex-prices') ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, amount]) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export function money(amount: number): string {
  return `S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(amount)}`;
}
