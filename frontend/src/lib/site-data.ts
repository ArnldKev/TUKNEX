export const services = [
  {
    id: 'landing',
    number: '01',
    name: 'Landing pages',
    description: 'Una gran primera impresión. Convierte visitas en mensajes y oportunidades para tu negocio.',
    price: '200',
    tag: 'Para empezar con todo',
    icon: 'layout',
  },
  {
    id: 'business',
    number: '02',
    name: 'Webs para negocios',
    description:
      'Tu negocio abierto al mundo. Presenta tu marca, tus servicios y todo lo que te hace diferente.',
    price: '250',
    tag: 'Tu nueva sucursal digital',
    icon: 'globe',
  },
  {
    id: 'store',
    number: '03',
    name: 'Tiendas online',
    description:
      'Dale una nueva vitrina a tus productos. Catálogos claros y una experiencia de compra sencilla.',
    price: null,
    tag: 'Vende sin fronteras',
    icon: 'bag',
  },
  {
    id: 'system',
    number: '04',
    name: 'Sistemas web',
    description:
      'Menos tareas repetitivas, más control. Organiza clientes, procesos e información en un solo lugar.',
    price: '800',
    tag: 'Haz que todo conecte',
    icon: 'layers',
  },
] as const;

export const faqs = [
  [
    '¿Qué es una landing page?',
    'Es una página enfocada en un objetivo: que te contacten, reserven o conozcan una oferta. Es una buena opción para empezar con una inversión accesible y comunicar lo esencial de tu negocio.',
  ],
  [
    '¿Qué diferencia hay entre una web y una tienda online?',
    'Una web presenta tu negocio y tus servicios. Una tienda añade productos y funciones de compra, como carrito o pagos. Si solo quieres mostrar productos y recibir pedidos por WhatsApp, un catálogo puede ser suficiente.',
  ],
  [
    '¿Qué son el dominio y el hosting?',
    'El dominio es la dirección de tu página, como tunegocio.pe. El hosting es el espacio donde vive. Son servicios que se renuevan periódicamente; te ayudamos a elegirlos y su costo se confirma por separado.',
  ],
  [
    '¿Necesito una base de datos?',
    'Si solo mostrarás información, normalmente no. Si necesitas cuentas de usuarios, reservas, inventario o guardar registros, probablemente sí. En el cotizador puedes contarnos qué quieres lograr y te orientamos.',
  ],
  [
    '¿Cuánto tiempo demora tener mi web?',
    'Una landing sencilla puede tomar entre 7 y 12 días hábiles desde que tenemos el contenido y se aprueba el alcance. Una tienda o un sistema necesita más tiempo. El cotizador muestra una referencia y confirmamos el cronograma contigo.',
  ],
  [
    '¿Cómo se realiza el pago?',
    'Antes de iniciar, definimos contigo el alcance, el importe y un esquema de pagos por etapas. Las condiciones se incluyen en la propuesta final. Esta web de demostración no procesa pagos.',
  ],
  [
    '¿Puedo mejorar mi página más adelante?',
    'Sí. Podemos empezar con lo que hoy necesita tu negocio y después sumar páginas, un catálogo, reservas o nuevas funciones. También evaluamos y mejoramos páginas que ya existen.',
  ],
] as const;

export const projects = [
  {
    id: 'cafe',
    brand: 'BOSQUE',
    type: 'Cafetería · Landing page',
    title: 'El aroma de una buena idea.',
    description: 'Una experiencia cálida para mostrar una carta, contar una historia y recibir reservas.',
    color: 'coffee',
  },
  {
    id: 'shop',
    brand: 'nativa.',
    type: 'Tienda · Catálogo digital',
    title: 'Lo natural se siente mejor.',
    description: 'Productos organizados, fichas claras y pedidos directos desde el catálogo.',
    color: 'natural',
  },
  {
    id: 'dashboard',
    brand: 'nexo',
    type: 'Negocio · Sistema web',
    title: 'Todo tu negocio, conectado.',
    description: 'Un panel que reúne clientes, ventas y tareas para decidir con más claridad.',
    color: 'software',
  },
] as const;
