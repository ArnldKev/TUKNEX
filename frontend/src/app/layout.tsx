import { SITE_URL } from '../config/environment';
import type { Metadata } from 'next';
import './globals.css';
import '@/components/auth/production.css';
import '@/components/experience/future.css';
import { DemoAuthProvider } from '@/lib/platform/auth';

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: 'TUKNEX | La base de tu siguiente nivel',
  description:
    'Soluciones web para negocios y emprendedores de Oxapampa y todo el Perú. Páginas web desde S/ 200, asesoría cercana y cotización en pocos pasos.',
  icons: {
    icon: { url: '/brand-symbol.png?v=4', type: 'image/png', sizes: '128x128' },
    shortcut: '/brand-symbol.png?v=4',
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'TUKNEX',
    title: 'TUKNEX | La base de tu siguiente nivel',
    description: 'Explora soluciones web, diseña tu proyecto y conversa con NEXI, tu compañero digital.',
    images: SITE_URL ? [{ url: new URL('/images/brand-logo.png', SITE_URL).href, alt: 'TUKNEX' }] : [],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <DemoAuthProvider>{children}</DemoAuthProvider>
      </body>
    </html>
  );
}
