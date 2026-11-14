import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('/admin');

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
