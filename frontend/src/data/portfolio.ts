export const portfolio = [
  {
    id: 'el-gringo',
    logo: '/images/projects/el-gringo.jpeg',
    name: 'El Gringo J&M',
    tagline: 'Pollería Chifa',
    category: 'Restaurante · Carta y pedidos',
    url: 'https://el-gringo-jym.netlify.app/',
    description:
      'Una carta digital para descubrir platos, preparar un pedido y continuar la conversación por WhatsApp.',
    features: [
      'Carta de platos',
      'Búsqueda de productos',
      'Resumen del pedido',
      'Datos de entrega',
      'Continuación por WhatsApp',
    ],
    color: '#d95724',
    type: 'catalog',
  },
  {
    id: 'corry-sport',
    logo: '/images/projects/corry-sport.svg',
    name: 'CORRY SPORT',
    tagline: 'Equipa tu próximo movimiento',
    category: 'Deporte · Catálogo digital',
    url: 'https://corry-sport.netlify.app/',
    description:
      'Un catálogo deportivo que ayuda a explorar artículos, elegir opciones y consultar el pedido a través de WhatsApp.',
    features: [
      'Catálogo deportivo',
      'Buscador y filtros',
      'Selección de artículos y tallas',
      'Resumen de selección',
      'Consulta por WhatsApp',
    ],
    color: '#346646',
    type: 'catalog',
  },
] as const;
