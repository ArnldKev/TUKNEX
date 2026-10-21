import { notFound } from 'next/navigation';
import { ClientPortal, type ClientSection } from '@/components/client/client-portal';
const sections = ['cotizaciones', 'proyectos', 'mensajes', 'perfil', 'resenas'];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function ClientSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <ClientPortal section={section as ClientSection} />;
}
