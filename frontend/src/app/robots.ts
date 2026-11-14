import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/environment';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // Account and staff HTML shells must be crawlable so bots can read their noindex tags.
    rules: { userAgent: '*', allow: '/' },
    ...(SITE_URL ? { sitemap: new URL('/sitemap.xml', SITE_URL).href } : {}),
  };
}
