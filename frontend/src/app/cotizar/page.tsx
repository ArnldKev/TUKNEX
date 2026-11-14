import { pageMetadata } from '@/lib/seo';
import {PublicShell} from '@/components/experience/public-shell';
import {QuoteStepperForm} from '@/components/quote-stepper-form';

export const metadata = pageMetadata('/cotizar');

export default function Page(){
 return <PublicShell><div className="quote-workshop"><header className="quote-route-intro"><span>TU PRIMERA IDEA, EN PANTALLA</span><h1>Crea la web que imaginas.</h1><p>¿Qué quieres lograr con tu negocio? Elige un objetivo y construye tu idea paso a paso. Tu web, catálogo o sistema irá tomando forma a tu lado.</p></header><section className="xp-container xp-quote-route"><QuoteStepperForm/></section></div></PublicShell>;
}
