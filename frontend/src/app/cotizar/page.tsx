import {PublicShell} from '@/components/experience/public-shell';
import {QuoteStepperForm} from '@/components/quote-stepper-form';
export const metadata={title:'Diseña tu proyecto | Cotizador TUKNEX'};
export default function Page(){
 return <PublicShell><div className="quote-workshop"><header className="quote-route-intro"><span>DE TU IDEA A UN PROYECTO</span><h1>Dale forma a tu siguiente paso.</h1><p>Cuéntanos qué necesitas, explora un boceto y conoce una estimación. Seis etapas sencillas, a tu ritmo.</p></header><section className="xp-container xp-quote-route"><QuoteStepperForm/></section></div></PublicShell>;
}
