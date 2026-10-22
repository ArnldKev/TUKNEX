import { z } from 'zod';
import { FEATURES, type ProjectType } from '../pricing';

export const paymentPreferenceLabels = {unsure:'Por acordar',daily:'Diario',weekly:'Semanal',fortnightly:'Quincenal',monthly:'Mensual'} as const;

const featureIds = FEATURES.map((item) => item.id);
export const quoteFormSchema = z.object({
  projectType: z.enum(['landing', 'business', 'catalog', 'store', 'system', 'redesign']),
  goal: z.enum(['visibility', 'products', 'orders', 'sales', 'organize', 'modernize', 'unsure']),
  businessName: z.string().trim().max(100),
  offering: z.string().trim().min(3, 'Cuéntanos qué vendes u ofreces (mínimo 3 caracteres).').max(300),
  sector: z
    .enum(['', 'food', 'tourism', 'commerce', 'services', 'health', 'education', 'other'])
    .refine((value): boolean => value !== '', 'Selecciona el rubro.'),
  city: z.string().trim().max(120),
  website: z.string().trim().max(300),
  customers: z.string().trim().max(300),
  salesChannels: z.array(z.enum(['whatsapp', 'phone', 'social', 'physical', 'website', 'other'])),
  salesProcess: z.string().trim().max(600),
  problem: z.string().trim().min(5, 'Describe en una frase qué quieres mejorar.').max(1000),
  features: z.array(z.enum(featureIds)),
  productsRange: z.enum(['none', '1-20', '21-100', '100+']),
  userRange: z.enum(['1-2', '3-5', '6+']),
  otherFunctions: z.string().trim().max(1000),
  design: z.enum(['essential', 'custom', 'premium']),
  materials: z.array(z.enum(['logo', 'colors', 'photos', 'texts', 'prices', 'help'])),
  stylePreference: z.enum(['modern', 'elegant', 'minimal', 'corporate', 'bold', 'unsure']),
  colorsLiked: z.string().trim().max(150),
  colorsDisliked: z.string().trim().max(150),
  references: z.string().trim().max(500),
  competitor: z.string().trim().max(200),
  firstImpression: z.string().trim().max(300),
  timeline: z.enum(['flexible', 'standard', 'urgent']),
  launchDate: z.string().max(20),
  hardDeadline: z.boolean(),
  deadlineReason: z.string().trim().max(300),
  budget: z.enum(['unsure', 'under300', '300-550', '550-800', '800-1000', '1000+']),
  paymentPreference: z.enum(['unsure','daily','weekly','fortnightly','monthly']).optional(),
  domain: z.enum(['yes', 'no', 'unsure']),
  existingDomain: z.string().trim().max(200),
  hosting: z.enum(['yes', 'no', 'unsure']),
  management: z.enum(['self', 'tuknex', 'unsure']),
  training: z.boolean(),
  maintenance: z.boolean(),
  corporateEmail: z.boolean(),
  approver: z.string().trim().max(120),
  name: z.string().trim().max(120),
  email: z.union([z.literal(''), z.email('Escribe un correo válido.')]),
  phone: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, 'Escribe un teléfono válido.'),
  ]),
  privacyAcknowledged: z
    .boolean()
    .refine(Boolean, 'Confirma que entiendes el uso de tus datos para gestionar la cotización.'),
  marketingConsent: z.boolean(),
});
export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
export const QUOTE_STEP_FIELDS: (keyof QuoteFormValues)[][] = [
  ['projectType', 'goal'],
  [
    'businessName',
    'offering',
    'sector',
    'city',
    'website',
    'customers',
    'salesChannels',
    'salesProcess',
    'problem',
  ],
  ['features', 'productsRange', 'userRange', 'otherFunctions'],
  [
    'design',
    'materials',
    'stylePreference',
    'colorsLiked',
    'colorsDisliked',
    'references',
    'competitor',
    'firstImpression',
  ],
  [
    'timeline',
    'launchDate',
    'hardDeadline',
    'deadlineReason',
    'budget',
    'domain',
    'existingDomain',
    'hosting',
    'management',
    'training',
    'maintenance',
    'corporateEmail',
    'approver',
  ],
  ['name', 'email', 'phone', 'privacyAcknowledged', 'marketingConsent'],
];

export function firstInvalidQuoteStep(
  errors: Partial<Record<keyof QuoteFormValues, unknown>>,
): number | null {
  const index = QUOTE_STEP_FIELDS.findIndex((fields) => fields.some((field) => Boolean(errors[field])));
  return index < 0 ? null : index;
}
export const quoteDefaults: QuoteFormValues = {
  projectType: 'landing',
  goal: 'visibility',
  businessName: '',
  offering: '',
  sector: '',
  city: '',
  website: '',
  customers: '',
  salesChannels: ['whatsapp'],
  salesProcess: '',
  problem: '',
  features: ['information', 'whatsapp', 'contact'],
  productsRange: '1-20',
  userRange: '1-2',
  otherFunctions: '',
  design: 'essential',
  materials: [],
  stylePreference: 'modern',
  colorsLiked: '',
  colorsDisliked: '',
  references: '',
  competitor: '',
  firstImpression: '',
  timeline: 'standard',
  launchDate: '',
  hardDeadline: false,
  deadlineReason: '',
  budget: 'unsure',
  paymentPreference: 'unsure',
  domain: 'unsure',
  existingDomain: '',
  hosting: 'unsure',
  management: 'unsure',
  training: false,
  maintenance: false,
  corporateEmail: false,
  approver: '',
  name: '',
  email: '',
  phone: '',
  privacyAcknowledged: false,
  marketingConsent: false,
};
export const featuresByProject: Record<ProjectType, string[]> = {
  landing: ['information', 'whatsapp', 'contact', 'gallery'],
  business: ['information', 'whatsapp', 'contact', 'gallery', 'catalog', 'bookings', 'notifications'],
  catalog: ['information', 'whatsapp', 'catalog', 'gallery', 'search', 'variations', 'contact'],
  store: [
    'catalog',
    'search',
    'variations',
    'cart',
    'payments',
    'shipping',
    'inventory',
    'einvoice',
    'integrations',
  ],
  system: [
    'login',
    'admin',
    'clients',
    'inventory',
    'reports',
    'orders',
    'bookings',
    'notifications',
    'roles',
    'einvoice',
    'integrations',
  ],
  redesign: ['information', 'whatsapp', 'contact', 'gallery', 'catalog', 'bookings'],
};
export const defaultFeatures: Record<ProjectType, QuoteFormValues['features']> = {
  landing: ['information', 'whatsapp', 'contact'],
  business: ['information', 'whatsapp', 'contact'],
  catalog: ['information', 'whatsapp', 'catalog'],
  store: ['catalog', 'cart', 'payments'],
  system: ['login', 'clients'],
  redesign: ['information', 'whatsapp'],
};

export type QuotePrefill = Partial<Pick<QuoteFormValues, 'projectType' | 'features' | 'goal' | 'sector'>>;
export function quotePrefillFromSearch(search: string | URLSearchParams): QuotePrefill {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const prefill: QuotePrefill = {};
  const type = quoteFormSchema.shape.projectType.safeParse(params.get('tipo'));
  if (type.success) {
    prefill.projectType = type.data;
    prefill.features = [...defaultFeatures[type.data]];
    const suggested = params.get('funciones')?.split(',') ?? [];
    const features = FEATURES.filter(
      (feature) => suggested.includes(feature.id) && featuresByProject[type.data].includes(feature.id),
    ).map((feature) => feature.id);
    if (features.length) prefill.features = features;
  }
  const goal = quoteFormSchema.shape.goal.safeParse(params.get('objetivo'));
  if (goal.success) prefill.goal = goal.data;
  const sector = quoteFormSchema.shape.sector.safeParse(params.get('sector'));
  if (sector.success) prefill.sector = sector.data;
  return prefill;
}

// Only enumerated choices can enter the anonymous draft. Free text and contact fields never do.
export const anonymousDraftSchema = quoteFormSchema.pick({
  projectType: true,
  goal: true,
  salesChannels: true,
  features: true,
  productsRange: true,
  userRange: true,
  design: true,
  materials: true,
  stylePreference: true,
  timeline: true,
  budget: true,
  paymentPreference: true,
  domain: true,
  hosting: true,
  management: true,
  training: true,
  maintenance: true,
  corporateEmail: true,
});
export type AnonymousQuoteDraft = z.infer<typeof anonymousDraftSchema>;
export function toAnonymousDraft(values: QuoteFormValues): AnonymousQuoteDraft {
  return anonymousDraftSchema.parse(values);
}
export function restoreAnonymousDraft(current: QuoteFormValues, draft: AnonymousQuoteDraft): QuoteFormValues {
  const choices = anonymousDraftSchema.parse(draft);
  return {
    ...current,
    ...choices,
    features: choices.features.filter((id) => featuresByProject[choices.projectType].includes(id)),
  };
}
export const ANONYMOUS_DRAFT_KEY = 'tuknex-quote-draft-v3';

export const goalRecommendations: Record<
  QuoteFormValues['goal'],
  { type: ProjectType; reason: string } | null
> = {
  visibility: {
    type: 'landing',
    reason:
      'Una página enfocada puede presentar tu oferta y facilitar el contacto, sin añadir funciones que todavía no necesitas.',
  },
  products: {
    type: 'catalog',
    reason: 'Un catálogo organiza tus productos o tu menú y ayuda a preparar consultas por WhatsApp.',
  },
  orders: {
    type: 'catalog',
    reason:
      'Podemos mostrar tu oferta y facilitar pedidos por WhatsApp. Si necesitas cobros online, revisaremos una tienda.',
  },
  organize: {
    type: 'system',
    reason:
      'Un sistema puede simplificar una o dos tareas internas. Más módulos o permisos requieren revisar el alcance.',
  },
  sales: {
    type: 'store',
    reason:
      'Vender y cobrar por internet implica definir pagos, pedidos y entregas. Necesita una evaluación personalizada.',
  },
  modernize: {
    type: 'redesign',
    reason: 'Primero revisamos tu web actual para conservar lo útil y definir qué mejoras necesita.',
  },
  unsure: null,
};
