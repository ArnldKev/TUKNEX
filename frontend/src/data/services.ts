import type { SolutionKind } from '@/components/experience/solution-preview';

export interface ServicePresentation {
  id: SolutionKind;
  number: string;
  title: string;
  short: string;
  phrase: string;
  description: string;
  scope: string[];
  ideal: string;
  duration: string;
  difference: string;
}
export const services: ServicePresentation[] = [
  {
    id: 'landing',
    number: '01',
    title: 'Landing page',
    short: 'Haz que te conozcan',
    phrase: 'Una página. Un objetivo claro.',
    description:
      'Presenta tu negocio o una oferta y facilita el primer contacto. El punto de partida para estar en internet.',
    scope: ['Tu oferta en una sola página', 'Se adapta al celular', 'Contacto por WhatsApp'],
    ideal: 'Empezar, lanzar una oferta o recibir consultas.',
    duration: '7–12 días hábiles',
    difference: 'Toda tu propuesta en una sola página, con un siguiente paso claro.',
  },
  {
    id: 'business',
    number: '02',
    title: 'Web de negocio',
    short: 'Presenta todo lo que haces',
    phrase: 'Tu marca tiene mucho que contar.',
    description:
      'Un espacio propio para tus servicios, tu historia y tu trabajo. Ayuda a que te encuentren y elijan con confianza.',
    scope: ['Varias páginas conectadas', 'Servicios y galería', 'Consultas de clientes'],
    ideal: 'Negocios que necesitan presentar mejor su marca.',
    duration: '7–15 días hábiles',
    difference: 'Varias páginas para explicar tus servicios y dar confianza.',
  },
  {
    id: 'catalog',
    number: '03',
    title: 'Catálogo digital',
    short: 'Muestra productos o tu menú',
    phrase: 'Tu próxima vitrina está aquí.',
    description:
      'Productos y precios fáciles de explorar. Tus clientes eligen y continúan la consulta por WhatsApp.',
    scope: ['Productos organizados', 'Búsqueda y selección', 'Consulta por WhatsApp'],
    ideal: 'Restaurantes, comercios y emprendimientos.',
    duration: '10–15 días hábiles',
    difference: 'Muestra y organiza productos; la conversación sigue por WhatsApp.',
  },
  {
    id: 'store',
    number: '04',
    title: 'Tienda online',
    short: 'Prepara tu proceso de venta',
    phrase: 'De descubrir a hacer un pedido.',
    description:
      'Conecta productos, carrito y pedidos. Definimos cómo se pagará y entregará antes de confirmar el alcance.',
    scope: ['Catálogo y carrito', 'Proceso de pedido', 'Pagos y entregas a evaluar'],
    ideal: 'Vender con un proceso de compra definido.',
    duration: 'Según alcance',
    difference: 'Un proceso de compra con pagos y entregas que se define contigo.',
  },
  {
    id: 'system',
    number: '05',
    title: 'Sistema web',
    short: 'Organiza tu día a día',
    phrase: 'Menos tareas sueltas. Más control.',
    description:
      'Clientes, tareas o inventario en un mismo lugar. Empezamos con uno o dos módulos simples y evaluamos lo que sigue.',
    scope: ['Uno o dos módulos básicos', 'Acceso de usuarios', 'Registros y seguimiento'],
    ideal: 'Ordenar clientes, inventario o un proceso específico.',
    duration: '15–25 días hábiles',
    difference: 'Una herramienta para trabajar dentro de tu negocio, con acceso y registros.',
  },
];
export function serviceFromSearch(search: string): SolutionKind | null {
  const value = new URLSearchParams(search).get('servicio');
  return services.find((service) => service.id === value)?.id ?? null;
}
