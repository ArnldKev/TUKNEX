import { ReviewsAdmin } from '@/components/reviews/real-reviews';
import { ContactInbox } from '@/components/admin/contact-inbox';
import { QuoteRequestsAdmin } from '@/components/quote/quote-requests-panel';
import Link from 'next/link';
import { DEMO_MODE } from '@/config/environment';
import { RealUsersAdmin } from '@/components/admin/real-users-admin';
import { RoleGate } from '@/lib/platform/auth';
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
export function generateStaticParams() {
  return [...Object.keys(legacy), ...Object.keys(expanded), 'contratos', 'pagos', 'mensajes'].map((section) => ({
    section,
  }));
}
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!DEMO_MODE) {
    if(section === 'resenas') return <ReviewsAdmin />;
    if(section === 'mensajes') return <ContactInbox />;
    if(section === 'solicitudes') return <QuoteRequestsAdmin />;
    if (section === 'usuarios') return <RealUsersAdmin />;
    const live = {clientes:'clients',cotizaciones:'quotes',contratos:'contracts',pagos:'payments',precios:'overview'} as const;
    if (Object.hasOwn(live,section)) return <BillingScreen key={section} section={live[section as keyof typeof live]} />;
    return <RoleGate allowed={['admin']}><main className="platform-access-state"><h1>Este módulo aún no está conectado.</h1><p>La gestión de clientes, cotizaciones, contratos, pagos y usuarios ya está disponible.</p><Link href="/admin" className="platform-button">Volver a administración</Link></main></RoleGate>;
  }
  if (section === 'contratos' || section === 'pagos')
    return <BillingScreen key={section} section={section === 'contratos' ? 'contracts' : 'payments'} />;
  if (Object.hasOwn(expanded, section)) return <PlatformAdminView section={expanded[section]} />;
  if (Object.hasOwn(legacy, section))
    return <AdminDashboard key={section} initialTab={legacy[section as keyof typeof legacy]} />;
  notFound();
}
