import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/config/environment';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap {return SITE_URL?['','/explorar','/proyectos','/nosotros','/cotizar','/contacto','/resenas','/privacidad'].map(route=>({url:SITE_URL+route})):[];}
