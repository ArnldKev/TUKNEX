import {TeamWorkspace} from '@/components/team/team-workspace';
import { ReviewsAdmin } from '@/components/reviews/real-reviews';
import { ContactInbox } from '@/components/admin/contact-inbox';
import { QuoteRequestsAdmin } from '@/components/quote/quote-requests-panel';
import Link from 'next/link';
import { DEMO_MODE } from '@/config/environment';
import { RealUsersAdmin } from '@/components/admin/real-users-admin';
import { RoleGate } from '@/lib/platform/auth';
import { AccountShell } from '@/components/auth/account-shell';
import './module-directions.css';
import { notFound } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { PlatformAdminView, type PlatformAdminSection } from '@/components/admin/platform-admin';
import { BillingScreen } from '@/components/billing/billing-workspace';
const legacy = {
  solicitudes: 'leads',
  clientes: 'leads',
  cotizaciones: 'quotes',
  embudo: 'pipeline',
  conversaciones: 'conversations',
  precios: 'prices',
  servicios: 'packages',
} as const;
const expanded: Record<string, PlatformAdminSection> = {
  proyectos: 'projects',
  resenas: 'reviews',
  usuarios: 'users',
  faq: 'faq',
};
const moduleDirections = {
  conversaciones: {
    title: 'Mensajes y consultas',
    description: 'Revisa las consultas que tus clientes enviaron desde Contacto y actualiza su seguimiento.',
    links: [
      { href: '/admin/mensajes', label: 'Mensajes de contacto', description: 'Busca una consulta, abre sus detalles y registra si está nueva, revisada o cerrada.' },
    ],
  },
  embudo: {
    title: 'Seguimiento comercial',
    description: 'Consulta cada solicitud y continúa con las propuestas y los acuerdos de tus clientes.',
    links: [
      { href: '/admin/solicitudes', label: 'Solicitudes de clientes', description: 'Filtra por estado y revisa el avance de cada solicitud.' },
      { href: '/admin/cotizaciones', label: 'Cotizaciones formales', description: 'Consulta las propuestas preparadas y la respuesta del cliente.' },
      { href: '/admin/contratos', label: 'Contratos', description: 'Revisa los acuerdos, su envío y su aceptación.' },
    ],
  },
  proyectos: {
    title: 'Proyectos y responsables',
    description: 'La gestión de los proyectos se encuentra en el espacio del equipo.',
    links: [
      { href: '/admin/equipo#project-work', label: 'Gestionar proyectos del equipo', description: 'Consulta responsables, propuestas, contratos y actividad de cada proyecto.' },
    ],
  },
  faq: {
    title: 'Preguntas frecuentes',
    description: 'Las preguntas que ven tus clientes están publicadas en Cómo trabajamos. Su contenido se mantiene desde el sitio.',
    links: [
      { href: '/nosotros#preguntas-frecuentes', label: 'Ver preguntas publicadas', description: 'Revisa las respuestas disponibles para los visitantes de TUKNEX.' },
    ],
  },
  servicios: {
    title: 'Servicios y cotizaciones',
    description: 'Consulta las soluciones que presenta TUKNEX y prepara las propuestas para tus clientes.',
    links: [
      { href: '/explorar', label: 'Ver servicios publicados', description: 'Explora el alcance y los ejemplos de cada solución.' },
      { href: '/admin/cotizaciones', label: 'Abrir cotizaciones formales', description: 'Prepara la propuesta con el alcance, los importes y el plan de pago acordados.' },
    ],
  },
} as const;
export function generateStaticParams() {
  return [...Object.keys(legacy), ...Object.keys(expanded), 'contratos', 'pagos', 'mensajes', 'equipo', 'mis-cotizaciones'].map((section) => ({
    section,
  }));
}
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if(section === 'equipo') return <TeamWorkspace owner/>;
  if(section === 'mis-cotizaciones') return <QuoteRequestsAdmin origin="mine"/>;
  if (!DEMO_MODE) {
    if(section === 'resenas') return <ReviewsAdmin />;
    if(section === 'mensajes') return <ContactInbox />;
    if(section === 'solicitudes') return <QuoteRequestsAdmin />;
    if (section === 'usuarios') return <RealUsersAdmin />;
    const live = {clientes:'clients',cotizaciones:'quotes',contratos:'contracts',pagos:'payments',precios:'overview'} as const;
    if (Object.hasOwn(live,section)) return <BillingScreen key={section} section={live[section as keyof typeof live]} />;
    if (Object.hasOwn(moduleDirections, section)) {
      const destination = moduleDirections[section as keyof typeof moduleDirections];
      return (
        <RoleGate allowed={['admin']}>
          <AccountShell admin title={destination.title}>
            <div className="portal-page-heading">
              <div><p className="platform-kicker">ADMINISTRACIÓN</p><h1>{destination.title}</h1><p>{destination.description}</p></div>
            </div>
            <nav className="admin-module-directions" aria-label={destination.title}>
              {destination.links.map(link => (
                <Link key={link.href} href={link.href}>
                  <strong>{link.label}<span aria-hidden="true">↗</span></strong>
                  <span>{link.description}</span>
                </Link>
              ))}
            </nav>
          </AccountShell>
        </RoleGate>
      );
    }
    notFound();
  }
  if (section === 'contratos' || section === 'pagos')
    return <BillingScreen key={section} section={section === 'contratos' ? 'contracts' : 'payments'} />;
  if (Object.hasOwn(expanded, section)) return <PlatformAdminView section={expanded[section]} />;
  if (Object.hasOwn(legacy, section))
    return <AdminDashboard key={section} initialTab={legacy[section as keyof typeof legacy]} />;
  notFound();
}
