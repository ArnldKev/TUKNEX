import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/config/environment';
export const dynamic='force-static';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/mi-cuenta','/acceder','/registro','/recuperar-acceso']},...(SITE_URL?{sitemap:SITE_URL+'/sitemap.xml'}:{})};}
