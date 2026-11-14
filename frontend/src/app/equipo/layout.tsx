import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('/equipo');

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
