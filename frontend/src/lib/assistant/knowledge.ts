export const assistantKnowledge = [
  {
    id: 'domain',
    pattern: /dominio|domain/,
    answer:
      'El dominio es la dirección de tu negocio en internet, como tunegocio.pe. Se registra y renueva con un proveedor. Puedes usar uno que ya tengas; su costo se confirma por separado.',
  },
  {
    id: 'hosting',
    pattern: /hosting|alojamiento/,
    answer:
      'El hosting es el espacio donde viven las imágenes y archivos de tu web para que puedan visitarla. Es como el local de tu negocio digital. Su plan y renovación se eligen según el proyecto y se cotizan aparte.',
  },
  {
    id: 'server',
    pattern: /servidor|server/,
    answer:
      'Un servidor es una computadora preparada para atender solicitudes por internet. Cuando alguien abre tu web, el servidor entrega la información. No necesitas comprar uno físico para empezar: podemos revisar un servicio de alojamiento.',
  },
  {
    id: 'landing',
    pattern: /que.*landing|significa.*landing|landing.*que/,
    answer:
      'Una landing page es una sola página enfocada en un objetivo: explicar una oferta, promocionar un servicio o recibir consultas. Es una forma sencilla de empezar cuando no necesitas catálogo ni procesos internos.',
  },
  {
    id: 'database',
    pattern: /base.*datos|database/,
    answer:
      'Una base de datos organiza información, como clientes, productos o reservas. Mostrar información fija no suele necesitarla. Guardar registros, cuentas o inventario sí requiere definir la lógica y el acceso a esos datos.',
  },
  {
    id: 'ecommerce',
    pattern: /que.*e.?commerce|diferencia.*tienda|que.*tienda online/,
    answer:
      'Un catálogo muestra productos y puede facilitar pedidos por WhatsApp. Una tienda online añade un proceso de compra y, si corresponde, cobros. Pagos, entregas e integraciones necesitan evaluación para confirmar un precio responsable.',
  },
] as const;
