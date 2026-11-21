'use client';
import './evolution-pages.css';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowUpRight,
  MessageCircle,
  MapPin,
  Mail,
  Check,
  Plus,
  ShieldCheck,
  Send,
  CheckCheck,
  Compass,
  PenTool,
  Code2,
  Rocket,
} from 'lucide-react';
import { PurposeSection } from './purpose-section';
import { NexiAvatar } from '@/components/3d/nexi-avatar';
import { PublicShell, PageIntro, openNexi } from './public-shell';
import { brandConfig, getWhatsAppUrl } from '@/lib/config';
import { billingRequest } from '@/lib/billing/api';
import { faqs } from '@/lib/site-data';

export function AboutExperience() {
  const [open, setOpen] = useState<number | null>(0);
  const faqId = useId();
  return (
    <PublicShell>
      <PageIntro
        eyebrow="TECNOLOGÍA DE ALTO NIVEL. TRATO DE TÚ A TÚ."
        title={
          <>
            Tu negocio es el punto de partida.
            <br />
            <span>La tecnología, el siguiente paso.</span>
          </>
        }
        text="TUKNEX nace para acercar soluciones digitales a emprendedores y pequeños negocios. Desde Oxapampa, creamos con claridad, propósito y una visión de crecimiento."
      />
      <PurposeSection />
      <section className="xp-about xp-container">
        <div className="xp-about-intro">
          <span className="xp-eyebrow">
            <i />
            ASÍ TRABAJAMOS
          </span>
          <h2>
            De “tengo una idea”
            <br />a <span>“ya está en línea”.</span>
          </h2>
          <p>
            No necesitas llegar con un documento técnico. Necesitamos escucharte y entender qué debe mejorar
            en tu negocio.
          </p>
        </div>
        <div className="xp-process-grid">
          {[
            {
              icon: Compass,
              title: 'Entendemos el negocio',
              text: 'Conversamos sobre lo que haces, quiénes son tus clientes y qué problema necesitas resolver.',
            },
            {
              icon: PenTool,
              title: 'Definimos una solución',
              text: 'Acordamos funciones, contenido, precio y tiempos. Tu presupuesto ayuda a priorizar; el alcance determina la propuesta.',
            },
            {
              icon: Code2,
              title: 'Construimos contigo',
              text: 'Diseñamos, desarrollamos y revisamos por etapas. Sabes qué estamos creando y cuál es el siguiente paso.',
            },
            {
              icon: Rocket,
              title: 'Lo ponemos en marcha',
              text: 'Comprobamos, publicamos y te orientamos para utilizarlo. El soporte y las mejoras se definen contigo.',
            },
          ].map((step, i) => (
            <article key={step.title}>
              <span>
                0{i + 1}
                <i />
              </span>
              <step.icon size={28} strokeWidth={1.3} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <div className="xp-scope-note">
          <ShieldCheck size={28} />
          <div>
            <h3>Sin letras pequeñas en el alcance.</h3>
            <p>
              Las cifras del cotizador son estimaciones preliminares. Dominio, hosting, licencias,
              integraciones, impuestos y condiciones se confirman en la propuesta final. Una tienda con cobros
              o un sistema complejo siempre necesita evaluación personalizada.
            </p>
          </div>
          <Link href="/cotizar">
            Preparar mi proyecto <ArrowUpRight size={16} />
          </Link>
        </div>
        <section className="xp-faq" id="preguntas-frecuentes" tabIndex={-1}>
          <div>
            <span className="xp-eyebrow">
              <i />
              SIN PALABRAS COMPLICADAS
            </span>
            <h2>
              Buenas preguntas.
              <br />
              <span>Respuestas simples.</span>
            </h2>
            <button className="xp-text-link" onClick={openNexi}>
              Tengo otra pregunta para NEXI <MessageCircle size={16} />
            </button>
          </div>
          <div>
            {faqs.map(([question, answer], index) => (
              <article key={question}>
                <h3>
                  <button
                    onClick={() => setOpen(index === open ? null : index)}
                    aria-expanded={open === index}
                    aria-controls={faqId + index}
                  >
                    {question}
                    <Plus size={18} />
                  </button>
                </h3>
                <p id={faqId + index} hidden={open !== index}>{answer}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </PublicShell>
  );
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre.').max(80),
  email: z.email('Escribe un correo válido.'),
  message: z.string().trim().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres).').max(2000),
  consent: z.boolean().refine((value) => value, 'Confirma el uso de tus datos para responder tu consulta.'),
});
type ContactInput = z.infer<typeof contactSchema>;
export function ContactExperience() {
  const [sent, setSent] = useState(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const startedAnotherMessage = useRef(false);
  const contactId = useId();
  useEffect(() => {
    if (sent) successHeading.current?.focus();
    if (!sent && startedAnotherMessage.current) {
      formHeading.current?.focus();
      startedAnotherMessage.current = false;
    }
  }, [sent]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [honeypot,setHoneypot]=useState('');
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '', consent: false },
  });
  return (
    <PublicShell>
      <PageIntro
        eyebrow="HAGAMOS QUE PASE"
        title={
          <>
            Tu siguiente nivel
            <br />
            empieza con <span>un hola.</span>
          </>
        }
        text="No hace falta tenerlo todo resuelto. Cuéntanos lo que imaginas y empecemos por ahí."
      />
      <section className="xp-contact xp-container">
        <div className="xp-contact-info">
          <div>
            <MapPin size={23} />
            <span>
              <strong>Oxapampa, Perú</strong>
              <small>Atención digital para todo el país</small>
            </span>
          </div>
          <a href={getWhatsAppUrl() ?? '/cotizar'} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={23} />
            <span>
              <strong>Conversemos por WhatsApp</strong>
              <small>+51 934 631 664</small>
            </span>
            <ArrowUpRight size={19} />
          </a>
          {brandConfig.email && (
            <a href={`mailto:${brandConfig.email}`}>
              <Mail size={23} />
              <span>
                <strong>{brandConfig.email}</strong>
                <small>Correo comercial</small>
              </span>
            </a>
          )}
          <div className="xp-contact-nexi">
            <NexiAvatar state="listening" />
            <h3>¿Tu idea todavía está tomando forma?</h3>
            <p>NEXI puede ayudarte a entender qué solución se parece a lo que necesitas.</p>
            <button className="button button-outline" onClick={openNexi}>
              Hablemos de tu idea <MessageCircle size={16} />
            </button>
          </div>
        </div>
        <div className="xp-contact-form">
          <button type="button" className="xp-contact-assistant" onClick={openNexi}>
            <MessageCircle size={18} aria-hidden="true" /> ¿Necesitas orientación? Hablar con NEXI
          </button>
          {sent ? (
            <div className="xp-contact-success" role="status">
              <CheckCheck size={44} />
              <h2 ref={successHeading} tabIndex={-1}>Tu mensaje ha sido recibido.</h2>
              <p>
                Tu consulta se guardó en TUKNEX y está disponible para nuestro equipo. Si necesitas conversar ahora, también puedes escribirnos por WhatsApp.
              </p>
              <a
                className="button button-primary"
                href={
                  getWhatsAppUrl(
                    `Hola TUKNEX, soy ${form.getValues('name')}. ${form.getValues('message')}`,
                  ) ?? '/cotizar'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Continuar en WhatsApp <ArrowUpRight size={16} />
              </a>
              <button
                onClick={() => {
                  startedAnotherMessage.current = true;
                  setSent(false);
                  form.reset();
                }}
              >
                Escribir otro mensaje
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={form.handleSubmit(async(values) => {
                setBusy(true);setError('');
                try{await billingRequest('public/contact',{method:'POST',body:JSON.stringify({...values,website:honeypot})});setSent(true);}
                catch(e){setError(e instanceof Error?e.message:'No se pudo enviar. Conservamos tu mensaje para reintentar.');}
                finally{setBusy(false);}
              })}
            >
              <span className="xp-eyebrow">CONVERSEMOS DE TU PROYECTO</span>
              <h2 ref={formHeading} tabIndex={-1}>Cuéntanos de tu idea.</h2>
              <p>
                Tu mensaje llegará al equipo de TUKNEX. Cuéntanos lo que necesitas y cómo podemos ayudarte.
              </p>
              <label>
                Tu nombre
                <input
                  {...form.register('name')}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  aria-invalid={!!form.formState.errors.name}
                  aria-describedby={form.formState.errors.name ? contactId + '-name' : undefined}
                />
                {form.formState.errors.name && (
                  <small id={contactId + '-name'} className="xp-error">{form.formState.errors.name.message}</small>
                )}
              </label>
              <label>
                Correo electrónico
                <input
                  type="email"
                  {...form.register('email')}
                  placeholder="cliente@example.com"
                  autoComplete="off"
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={form.formState.errors.email ? contactId + '-email' : undefined}
                />
                {form.formState.errors.email && (
                  <small id={contactId + '-email'} className="xp-error">{form.formState.errors.email.message}</small>
                )}
              </label>
              <label>
                ¿Qué te gustaría crear?
                <textarea
                  rows={5}
                  {...form.register('message')}
                  placeholder="Tengo un negocio y me gustaría..."
                  aria-invalid={!!form.formState.errors.message}
                  aria-describedby={form.formState.errors.message ? contactId + '-message' : undefined}
                />
                {form.formState.errors.message && (
                  <small id={contactId + '-message'} className="xp-error">{form.formState.errors.message.message}</small>
                )}
              </label>
              <label className="xp-checkbox">
                <input
                  type="checkbox"
                  {...form.register('consent')}
                  aria-invalid={!!form.formState.errors.consent}
                  aria-describedby={form.formState.errors.consent ? contactId + '-consent' : undefined}
                />
                <span>Acepto que TUKNEX use mis datos para responder esta consulta. <Link href="/privacidad" target="_blank" rel="noopener noreferrer">Cómo usamos tus datos</Link>.</span>
              </label>
              {form.formState.errors.consent && (
                <small id={contactId + '-consent'} className="xp-error">{form.formState.errors.consent.message}</small>
              )}
              <label className="contact-honeypot" aria-hidden="true">No completar<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e=>setHoneypot(e.target.value)}/></label>
              {error&&<p role="alert" className="platform-error">{error}</p>}
              <button className="button button-primary" type="submit" disabled={busy}>
                {busy?'Enviando…':'Enviar mi mensaje'} <Send size={16} />
              </button>
              <small className="xp-contact-privacy">
                <ShieldCheck size={13} /> Tus datos se guardan para atender tu consulta.
              </small>
            </form>
          )}
        </div>
      </section>
    </PublicShell>
  );
}

export function AssistantExperience() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="CONOCE A NEXI"
        title={
          <>
            Un pequeño compañero.
            <br />
            <span>Para tus próximas grandes ideas.</span>
          </>
        }
        text="El perrito digital de TUKNEX te explica la tecnología con palabras sencillas. Explora sus gestos y cuéntale lo que necesita tu negocio."
      />
      <section className="xp-assistant-page xp-container">
        <div className="xp-assistant-copy">
          <span className="xp-eyebrow">
            <i />
            TU COMPAÑERO DIGITAL
          </span>
          <h2>
            Hola, soy NEXI.
            <br />
            <span>Lo descubrimos juntos.</span>
          </h2>
          <p>
            ¿Una web, un catálogo, un sistema? No hace falta decidirlo a ciegas. Puedo explicarte opciones y
            ayudarte a elegir el primer paso.
          </p>
          <ul>
            <li>
              <Check size={16} /> Explico dominio, hosting y términos digitales.
            </li>
            <li>
              <Check size={16} /> Te recomiendo una opción para tu negocio.
            </li>
            <li>
              <Check size={16} /> Tú confirmas las recomendaciones y decides.
            </li>
          </ul>
          <button className="button button-primary" onClick={openNexi}>
            Iniciar conversación <MessageCircle size={17} />
          </button>
          <small>Este asistente ofrece orientación con respuestas guiadas.</small>
        </div>
        <div className="xp-assistant-model">
          <NexiAvatar state="wave" interactive />
          <span>Explora los gestos de NEXI.</span>
        </div>
      </section>
    </PublicShell>
  );
}
