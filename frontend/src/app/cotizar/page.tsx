import { pageMetadata } from '@/lib/seo';
import { PublicShell } from '@/components/experience/public-shell';
import { QuoteStepperForm } from '@/components/quote-stepper-form';

export const metadata = pageMetadata('/cotizar');

export default function Page() {
  return (
    <PublicShell>
      <div className="quote-workshop">
        <header className="quote-route-intro">
          <h1>Crea la web que imaginas.</h1>
          <p>Sigue seis pasos para armar un boceto de tu proyecto y obtener una estimación.</p>
        </header>
        <div className="xp-container xp-quote-route"><QuoteStepperForm /></div>
      </div>
    </PublicShell>
  );
}
