export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function siteUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3000' : undefined;
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('NEXT_PUBLIC_SITE_URL debe ser una URL HTTP o HTTPS.');
  return url.toString().replace(/\/+$/, '');
}

export const SITE_URL = siteUrl();
