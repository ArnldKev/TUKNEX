import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('/mi-cuenta');

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
