/** Public backend origin. Local development keeps the browser and API on the same hostname so session cookies work. */
export function resolveApiUrl(configured: string, hostname?: string): string {
  try {
    const url=new URL(configured);
    if(hostname && ['localhost','127.0.0.1'].includes(hostname) && ['localhost','127.0.0.1'].includes(url.hostname)) url.hostname=hostname;
    return url.toString().replace(/\/+$/,'');
  } catch {return configured.replace(/\/+$/,'');}
}
export const API_URL=resolveApiUrl(
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BILLING_API_URL || 'http://127.0.0.1:4000',
  typeof window==='undefined'?undefined:window.location.hostname,
);
