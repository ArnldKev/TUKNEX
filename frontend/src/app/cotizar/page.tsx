import { PublicShell, PageIntro } from '@/components/experience/public-shell';
import { QuoteStepperForm } from '@/components/quote-stepper-form';
export const metadata = { title: 'Diseña tu proyecto | Cotizador TUKNEX' };
export default function Page() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="TU IDEA YA PUEDE TENER UN PLAN"
        title={
          <>
            Diseña tu siguiente paso.
            <br />
            <span>Nosotros te ayudamos a darle forma.</span>
          </>
        }
        text="Seis pasos sencillos para definir lo que necesitas y conocer una estimación preliminar. Tú decides el ritmo."
      />
      <section className="xp-container xp-quote-route">
        <QuoteStepperForm />
      </section>
    </PublicShell>
  );
}
