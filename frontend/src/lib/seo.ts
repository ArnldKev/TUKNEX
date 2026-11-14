import type { Metadata } from 'next';
import { SITE_URL } from '@/config/environment';

/** Static route metadata never contains query parameters or account/project data. */
export const ROUTE_SEO = {
  '/': { title: 'TUKNEX | La base de tu siguiente nivel', description: 'Soluciones web para negocios y emprendedores de Oxapampa y todo el Perú. Páginas web desde S/ 200, asesoría cercana y cotización en pocos pasos.', index: true },
  '/explorar': { title: 'Explorar soluciones | TUKNEX', description: 'Compara páginas web, catálogos, tiendas y sistemas con ejemplos interactivos. Encuentra una solución para tu negocio y una inversión orientativa.', index: true },
  '/proyectos': { image: { path: '/images/projects/el-gringo.jpeg', width: 1254, height: 1254, alt: 'Logo de El Gringo J&M, proyecto de TUKNEX' }, title: 'Proyectos desarrollados | TUKNEX', description: 'Conoce los proyectos reales de El Gringo J&M y CORRY SPORT: carta digital, catálogo de productos y consultas por WhatsApp.', index: true },
  '/nosotros': { title: 'Cómo trabajamos | TUKNEX', description: 'Conoce el propósito de TUKNEX y cómo acompañamos tu proyecto desde la primera idea hasta su publicación, con alcance y condiciones claras.', index: true },
  '/cotizar': { image: { path: '/document-references/landing.png', width: 1200, height: 600, alt: 'Ejemplo de una página web de presentación' }, title: 'Diseña tu proyecto | Cotizador TUKNEX', description: 'Construye la idea de tu web en seis pasos, explora una maqueta y consulta una estimación. Puedes empezar sin registrarte y revisar tus decisiones.', index: true },
  '/contacto': { title: 'Contacto | TUKNEX', description: 'Cuéntanos qué quieres crear. Contacta con TUKNEX desde Oxapampa para recibir orientación sobre tu web, catálogo o sistema personalizado.', index: true },
  '/resenas': { title: 'Reseñas y experiencias | TUKNEX', description: 'Lee opiniones de clientes publicadas con su autorización y conoce sus experiencias con la aplicación y el servicio de TUKNEX.', index: true },
  '/privacidad': { title: 'Uso de tus datos | TUKNEX', description: 'Consulta cómo TUKNEX trata los datos de cuentas, cotizaciones, dictado y ayuda opcional de NEXI, y cómo solicitar información sobre su uso.', index: true },
  '/asistente': { title: 'NEXI | Tu compañero digital', description: 'Explora la orientación guiada de NEXI para conocer las soluciones de TUKNEX. El chat demostrativo responde con opciones guiadas.', index: true },
  '/acceder': { title: 'Accede a tu cuenta | TUKNEX', description: 'Inicia sesión para consultar tus solicitudes y el seguimiento de tus proyectos en TUKNEX.', index: false },
  '/registro': { title: 'Crea tu cuenta | TUKNEX', description: 'Crea tu cuenta de cliente para guardar solicitudes y consultar el seguimiento de tu proyecto con TUKNEX.', index: false },
  '/recuperar-acceso': { title: 'Ayuda para recuperar tu acceso | TUKNEX', description: 'Consulta las opciones disponibles para solicitar ayuda con el acceso a tu cuenta de TUKNEX.', index: false },
  '/mi-cuenta': { title: 'Mi cuenta | TUKNEX', description: 'Espacio privado del cliente para consultar sus solicitudes y proyectos.', index: false },
  '/admin': { title: 'Administración | TUKNEX', description: 'Espacio privado de gestión de TUKNEX.', index: false },
  '/equipo': { title: 'Equipo | TUKNEX', description: 'Espacio privado del equipo autorizado de TUKNEX.', index: false },
} as const;
export type SeoRoute = keyof typeof ROUTE_SEO;
export const PUBLIC_SITE_ROUTES = (Object.keys(ROUTE_SEO) as SeoRoute[]).filter(route => ROUTE_SEO[route].index);
const DEFAULT_SOCIAL_IMAGE = {
  path: '/images/brand-logo.png', width: 2172, height: 724, alt: 'TUKNEX · La base de tu siguiente nivel',
};

export function pageMetadata(route: SeoRoute, siteUrl: string | undefined = SITE_URL): Metadata {
  const page = ROUTE_SEO[route];
  const origin = siteUrl ? new URL(siteUrl).origin : undefined;
  const canonical = origin ? new URL(route, origin).href : undefined;
  const image = 'image' in page ? page.image : DEFAULT_SOCIAL_IMAGE;
  const images = origin ? [{
    url: new URL(image.path, origin).href,
    width: image.width,
    height: image.height,
    alt: image.alt,
  }] : [];
  return {
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical } } : {}),
    title: page.title,
    description: page.description,
    robots: { index: page.index, follow: page.index },
    openGraph: { type: 'website', locale: 'es_PE', siteName: 'TUKNEX', title: page.title, description: page.description, ...(canonical ? { url: canonical } : {}), images },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: images.map(image => image.url) },
  };
}
