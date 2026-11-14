import { pageMetadata } from '@/lib/seo';
import './globals.css';
import '@/components/auth/production.css';
import '@/components/experience/future.css';
import { DemoAuthProvider } from '@/lib/platform/auth';

export const metadata = {
  ...pageMetadata('/'),
  icons: {
    icon: { url: '/brand-symbol.png?v=4', type: 'image/png', sizes: '128x128' },
    shortcut: '/brand-symbol.png?v=4',
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
