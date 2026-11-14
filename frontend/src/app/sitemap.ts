import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/environment';
import { PUBLIC_SITE_ROUTES } from '@/lib/seo';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return SITE_URL ? PUBLIC_SITE_ROUTES.map(route => ({ url: new URL(route, SITE_URL).href })) : [];
}
