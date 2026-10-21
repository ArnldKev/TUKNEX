export const pipelineStatuses = [
  'Nuevo',
  'Cotizado',
  'Contactado',
  'Negociación',
  'Aprobado',
  'En desarrollo',
  'Finalizado',
  'Pausado',
] as const;
export type LeadStatus = (typeof pipelineStatuses)[number];
export type AdminQuote = {
  id: string;
  name: string;
  business: string;
  project: string;
  date: string;
  status: LeadStatus;
  amount: number;
  email: string;
  phone: string;
  notes: string;
  demo: boolean;
  extras?: string[];
  timeline?: string;
};
export type AdminConversation = {
  id: string;
  name: string;
  date: string;
  topic: string;
  messages: { role: string; text: string }[];
  demo: boolean;
};
export type AdminPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  delivery: string;
  features: string;
  active: boolean;
};

export const demoQuotes: AdminQuote[] = [
  {
    id: 'DEMO-1048',
    name: 'Valeria Soto',
    business: 'Café Bosque Alto',
    project: 'Web de negocio',
    date: '2026-10-16T10:20:00',
    status: 'Nuevo',
    amount: 450,
    email: 'valeria@example.com',
    phone: '',
    notes: 'Cafetería en el centro de Oxapampa. Busca mostrar su carta y recibir consultas por WhatsApp.',
    demo: true,
  },
  {
    id: 'DEMO-1047',
    name: 'Mateo Rojas',
    business: 'Cabañas El Refugio',
    project: 'Web de negocio',
    date: '2026-10-15T16:45:00',
    status: 'Negociación',
    amount: 720,
    email: 'mateo@example.com',
    phone: '',
    notes: 'Hospedaje en Chontabamba. Le interesa una galería y solicitudes de reserva.',
    demo: true,
  },
  {
    id: 'DEMO-1046',
    name: 'Camila Torres',
    business: 'Miel de la Selva',
    project: 'Catálogo digital',
    date: '2026-10-15T11:10:00',
    status: 'Cotizado',
    amount: 580,
    email: 'camila@example.com',
    phone: '',
    notes: 'Catálogo de productos naturales con consultas directas. Tiene fotografías listas.',
    demo: true,
  },
  {
    id: 'DEMO-1045',
    name: 'Diego Müller',
    business: 'Oxapampa Aventura',
    project: 'Landing page',
    date: '2026-10-14T09:30:00',
    status: 'Aprobado',
    amount: 280,
    email: 'diego@example.com',
    phone: '',
    notes: 'Operador de turismo. Página para su campaña de paseos de fin de semana.',
    demo: true,
  },
  {
    id: 'DEMO-1044',
    name: 'Lucía Pérez',
    business: 'Vivero Monteverde',
    project: 'Tienda online',
    date: '2026-10-13T14:15:00',
    status: 'Contactado',
    amount: 950,
    email: 'lucia@example.com',
    phone: '',
    notes: 'Quiere vender plantas y coordinar entregas locales. Revisar alcance de pagos.',
    demo: true,
  },
  {
    id: 'DEMO-1043',
    name: 'Andrés Vega',
    business: 'Taller San José',
    project: 'Sistema web',
    date: '2026-10-12T13:00:00',
    status: 'En desarrollo',
    amount: 1000,
    email: 'andres@example.com',
    phone: '',
    notes: 'Sistema básico para registrar órdenes y estados del taller.',
    demo: true,
  },
  {
    id: 'DEMO-1042',
    name: 'Sofía Ruiz',
    business: 'Panadería La Colonia',
    project: 'Landing page',
    date: '2026-10-11T08:40:00',
    status: 'Finalizado',
    amount: 250,
    email: 'sofia@example.com',
    phone: '',
    notes: 'Proyecto de ejemplo completado. Catálogo breve y ubicación del local.',
    demo: true,
  },
  {
    id: 'DEMO-1041',
    name: 'Gabriel Flores',
    business: 'Finca Las Orquídeas',
    project: 'Rediseño web',
    date: '2026-10-10T17:20:00',
    status: 'Pausado',
    amount: 400,
    email: 'gabriel@example.com',
    phone: '',
    notes: 'Espera nuevas fotografías de la finca para continuar.',
    demo: true,
  },
];

export const demoConversations: AdminConversation[] = [
  {
    id: 'DEMO-C01',
    name: 'Visitante de Oxapampa',
    date: '2026-10-16T11:24:00',
    topic: 'Una web para mi cafetería',
    demo: true,
    messages: [
      {
        role: 'assistant',
        text: '¡Hola! Soy el asistente de TUKNEX. ¿Qué te gustaría mejorar en tu negocio?',
      },
      { role: 'user', text: 'Tengo una cafetería y quiero que vean mi carta en internet.' },
      {
        role: 'assistant',
        text: 'Una web de negocio te permitiría mostrar tu carta, fotos y ubicación. También podemos agregar un botón de WhatsApp para que te contacten fácilmente.',
      },
      { role: 'user', text: '¿Necesito saber de tecnología?' },
      {
        role: 'assistant',
        text: 'No, te acompañamos en cada paso. Puedes empezar con el cotizador y responder preguntas sencillas sobre tu negocio.',
      },
    ],
  },
  {
    id: 'DEMO-C02',
    name: 'Visitante de Chontabamba',
    date: '2026-10-15T15:40:00',
    topic: 'Reservas para un hospedaje',
    demo: true,
    messages: [
      { role: 'user', text: 'Quiero mostrar mis cabañas y recibir reservas.' },
      {
        role: 'assistant',
        text: 'Podemos crear una web con galería y un formulario para solicitar fechas. Si necesitas disponibilidad automática y cobros, evaluamos una solución a medida.',
      },
      { role: 'user', text: 'Por ahora me basta con que me escriban.' },
      {
        role: 'assistant',
        text: 'Perfecto. Una web de negocio con WhatsApp sería un buen comienzo. En el cotizador puedes elegir galería y formulario de contacto.',
      },
    ],
  },
  {
    id: 'DEMO-C03',
    name: 'Emprendedora local',
    date: '2026-10-14T10:15:00',
    topic: '¿Qué es un dominio?',
    demo: true,
    messages: [
      { role: 'user', text: '¿Qué es un dominio?' },
      {
        role: 'assistant',
        text: 'Es la dirección de tu negocio en internet, por ejemplo minegocio.com. Es como el nombre de tu local, pero en la web.',
      },
      { role: 'user', text: '¿Y el hosting?' },
      {
        role: 'assistant',
        text: 'Es el espacio donde vive tu página para que las personas puedan visitarla. Te ayudamos a elegir uno adecuado para tu negocio.',
      },
    ],
  },
];

export const defaultAdminPrices: Record<string, number> = {
  landing: 200,
  business: 250,
  catalog: 450,
  store: 800,
  system: 800,
  redesign: 250,
};
export const adminPriceLabels: Record<string, { name: string; description: string }> = {
  landing: { name: 'Landing page', description: 'Una página enfocada en presentar y convertir.' },
  business: { name: 'Web de negocio', description: 'Presencia profesional para negocios locales.' },
  catalog: { name: 'Catálogo digital', description: 'Productos organizados y consultas directas.' },
  store: {
    name: 'Tienda online',
    description: 'Referencia interna. Siempre requiere evaluación personalizada.',
  },
  system: { name: 'Sistema web', description: 'Gestión básica. La complejidad requiere evaluación.' },
  redesign: { name: 'Rediseño web', description: 'Mejoras visuales sobre una web existente.' },
};
export const defaultAdminPackages: AdminPackage[] = [
  {
    id: 'landing',
    name: 'Landing Esencial',
    description: 'El primer paso para estar en internet.',
    price: 200,
    delivery: '3 a 5 días',
    features: 'Diseño responsive\nHasta 5 secciones\nBotón de WhatsApp\nFormulario de contacto',
    active: true,
  },
  {
    id: 'business',
    name: 'Web Negocio',
    description: 'Una presencia que inspira confianza.',
    price: 250,
    delivery: '5 a 8 días',
    features: 'Hasta 5 páginas\nGalería de imágenes\nUbicación y contacto\nSEO básico',
    active: true,
  },
  {
    id: 'catalog',
    name: 'Catálogo Digital',
    description: 'Tus productos, siempre a la mano.',
    price: 450,
    delivery: '7 a 10 días',
    features: 'Catálogo de productos\nCategorías y filtros\nConsultas por WhatsApp\nDiseño responsive',
    active: true,
  },
  {
    id: 'system',
    name: 'Sistema Básico',
    description: 'Ordena la operación de tu negocio.',
    price: 800,
    delivery: '15 a 20 días',
    features: 'Acceso de usuarios\nPanel de gestión\nRegistro de datos\nAlcance definido en evaluación',
    active: true,
  },
];

export const adminMoney = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(
    amount,
  );
