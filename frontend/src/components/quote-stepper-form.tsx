'use client';
import { QuoteAuthDialog } from '@/components/auth/quote-auth-dialog';
import { billingRequest } from '@/lib/billing/api';
import {canSaveQuote,type VerificationStatus} from '@/lib/platform/verification';
import { DEMO_MODE } from '@/config/environment';
import { billingBase } from '@/lib/billing/api';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DEFAULT_PRICES, PROJECT_TYPES, readPriceOverrides, type ProjectType } from '@/lib/pricing';
import { getWhatsAppUrl } from '@/lib/config';
import { useDemoAuth } from '@/lib/platform/auth';
import {
  ANONYMOUS_DRAFT_KEY,
  QUOTE_STEP_FIELDS,
  anonymousDraftSchema,
  defaultFeatures,
  firstInvalidQuoteStep,
  quoteDefaults,
  quoteFormSchema,
  quotePrefillFromSearch,
  restoreAnonymousDraft,
  toAnonymousDraft,
  type AnonymousQuoteDraft,
  type QuoteFormValues,
} from '@/lib/quote/form';
import { quoteService } from '@/lib/quote/service';
import { quoteAnswers, quoteProposalText } from '@/lib/quote/presentation';
import type { QuoteResult } from '@/lib/quote/contracts';
import { QuotePreviewPanel } from '@/components/quote/solution-preview';
import { QuoteIdeaStep } from '@/components/quote/steps/idea-step';
import { QuoteBusinessStep } from '@/components/quote/steps/business-step';
import { QuoteFeaturesStep } from '@/components/quote/steps/features-step';
import { QuoteStyleStep } from '@/components/quote/steps/style-step';
import { QuoteTimingStep } from '@/components/quote/steps/timing-step';
import { QuoteReviewStep } from '@/components/quote/steps/review-step';
import { QuoteResultStep } from '@/components/quote/steps/result-step';
import { QuoteEstimatePanel } from '@/components/quote/steps/estimate-panel';
import './quote-chat.css';
import './quote/quote-flow.css';

export { QuoteSummary } from '@/components/quote/steps/summary';

const steps = [
  {
    label: 'Tu objetivo',
    title: '¿Qué te gustaría lograr?',
    description:
      'Elige lo que quieres hacer más fácil. Te proponemos un punto de partida que podrás cambiar.',
  },
  {
    label: 'Tu negocio',
    title: 'Cuéntanos lo esencial.',
    description: 'Qué ofreces, a quién y qué te gustaría mejorar. No necesitas saber de tecnología.',
  },
  {
    label: 'Funciones',
    title: '¿Qué debería poder hacer?',
    description: 'Elige sólo las funciones que hoy serían útiles para tu negocio.',
  },
  {
    label: 'Estilo',
    title: '¿Cómo te imaginas tu proyecto?',
    description: 'Prueba un estilo y un color. La vista previa cambia contigo.',
  },
  {
    label: 'Plazo',
    title: '¿Cuándo te gustaría empezar?',
    description: 'Nos organizamos con un plazo realista y un alcance claro.',
  },
  {
    label: 'Resumen',
    title: 'Una última mirada a tu idea.',
    description:
      'Revisa tus decisiones. Puedes ver la estimación sin registrarte ni dejar datos de contacto.',
  },
];

export function QuoteStepperForm() {
  const auth = useDemoAuth();
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onTouched',
    defaultValues: quoteDefaults,
    shouldUnregister: false,
  });
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [completedValues, setCompletedValues] = useState<QuoteFormValues | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({ ...DEFAULT_PRICES });
  const [notice, setNotice] = useState('');
  const [accessOpen,setAccessOpen]=useState(false);
  const [savedId, setSavedId] = useState('');
  const requestKey=useRef<string|null>(null);
  const [busy, setBusy] = useState(false);
  const [draftConsent, setDraftConsent] = useState(false);
  const [availableDraft, setAvailableDraft] = useState<AnonymousQuoteDraft | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigationPending = useRef(false);
  const focusTarget = useRef<'heading' | keyof QuoteFormValues | null>(null);
  const proposal = useMemo(
    () => (result && completedValues ? quoteProposalText(completedValues, result) : ''),
    [result, completedValues],
  );

  function focusQuestion() {
    headingRef.current?.focus();
  }
  function focusField(name: keyof QuoteFormValues) {
    const field = panelRef.current?.querySelector<HTMLElement>(`[name="${name}"]`);
    let details = field?.closest('details');
    while (details) {
      details.open = true;
      details = details.parentElement?.closest('details') ?? null;
    }
    if (field) field.focus();
    else focusQuestion();
  }
  useLayoutEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === 'heading') focusQuestion();
    else if (target) focusField(target);
  }, [step, result]);

  useEffect(() => {
    const update = () => {
      const next = { ...DEFAULT_PRICES, ...readPriceOverrides() };
      setPrices((previous) =>
        Object.keys(next).length === Object.keys(previous).length &&
        Object.entries(next).every(([key, value]) => previous[key] === value)
          ? previous
          : next,
      );
    };
    update();
    void fetch(billingBase + '/api/public/payment-options', { signal: AbortSignal.timeout(2000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.prices) setPrices({ ...DEFAULT_PRICES, ...d.prices });
      })
      .catch(() => {});
    window.addEventListener('storage', update);
    window.addEventListener('tuknex-data', update);
    try {
      const parsed = anonymousDraftSchema.safeParse(
        JSON.parse(localStorage.getItem(ANONYMOUS_DRAFT_KEY) ?? 'null'),
      );
      if (parsed.success) setAvailableDraft(parsed.data);
    } catch {
      /* Optional local draft. */
    }
    const applyPrefill = (search: string) => {
      const values = quotePrefillFromSearch(search);
      if (values.projectType) form.setValue('projectType', values.projectType);
      if (values.features) form.setValue('features', values.features);
      if (values.goal) form.setValue('goal', values.goal);
      if (values.sector) form.setValue('sector', values.sector);
    };
    applyPrefill(window.location.search);
    const resetProposal = () => {
      setStep(0);
      setResult(null);
      setCompletedValues(null);
      setSavedId('');
      requestKey.current=null;
      focusTarget.current = 'heading';
    };
    const fromRecommendation = (event: Event) => {
      const search = (event as CustomEvent<unknown>).detail;
      if (typeof search !== 'string') return;
      applyPrefill(search);
      resetProposal();
      setNotice('Recomendación aplicada. Puedes cambiar cualquiera de las respuestas.');
    };
    const fromHistory = () => {
      applyPrefill(window.location.search);
      resetProposal();
    };
    const selectProject = (event: Event) => {
      const type = (event as CustomEvent<unknown>).detail;
      if (!PROJECT_TYPES.some((project) => project.id === type)) return;
      form.setValue('projectType', type as ProjectType);
      form.setValue('features', [...defaultFeatures[type as ProjectType]]);
      resetProposal();
    };
    window.addEventListener('tuknex-quote-prefill', fromRecommendation);
    window.addEventListener('popstate', fromHistory);
    window.addEventListener('tuknex-project', selectProject);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('tuknex-data', update);
      window.removeEventListener('tuknex-quote-prefill', fromRecommendation);
      window.removeEventListener('popstate', fromHistory);
      window.removeEventListener('tuknex-project', selectProject);
    };
  }, [form]);

  function goTo(index: number) {
    focusTarget.current = 'heading';
    setResult(null);
    setCompletedValues(null);
    setSavedId('');
    requestKey.current=null;
    setNotice('');
    if (index === step && !result) {
      focusTarget.current = null;
      focusQuestion();
    } else setStep(index);
  }
  async function nextStep() {
    if (navigationPending.current || step >= 5) return;
    navigationPending.current = true;
    try {
      const valid = await form.trigger(QUOTE_STEP_FIELDS[step], { shouldFocus: false });
      if (valid) {
        focusTarget.current = 'heading';
        setStep(step + 1);
        setFurthestStep((previous) => Math.max(previous, step + 1));
        setNotice('');
      } else {
        const first = QUOTE_STEP_FIELDS[step].find((field) => form.getFieldState(field).error);
        if (first) focusField(first);
      }
    } finally {
      navigationPending.current = false;
    }
  }
  async function saveProposal(values: QuoteFormValues, estimate: QuoteResult) {
    requestKey.current ||= crypto.randomUUID();
    const saved=await quoteService.request({
      input:values,result:estimate,
      contact:{name:values.name,business:values.businessName,email:values.email,phone:values.phone,marketingConsent:values.marketingConsent},
      answers:quoteAnswers(values),demoClientId:auth.user?.role==='client'?auth.user.id:undefined,
      idempotencyKey:requestKey.current,
    });
    setSavedId(saved.id);
    if(saved.result)setResult(saved.result);
    setNotice(saved.mode==='persistent'
      ? `Cotización ${saved.number || saved.id} guardada en tu cuenta y disponible para el equipo TUKNEX.`
      : `Propuesta ${saved.id} añadida a la sesión de demostración.`);
  }
  async function finish(values: QuoteFormValues) {
    if(busy)return;
    setBusy(true);setNotice('');
    try {
      const estimate=await quoteService.calculate(values,prices);
      focusTarget.current='heading';setCompletedValues(values);setResult(estimate);setSavedId('');
      if(auth.user?.role==='client' && !DEMO_MODE) {
        try {await saveProposal(values,estimate);}
        catch(error) {setNotice(`La estimación está lista, pero NO se guardó. ${error instanceof Error?error.message:'Comprueba la conexión con TUKNEX.'} Puedes volver a intentar guardarla sin perder tus respuestas.`);}
      }
    } catch {setNotice('No pudimos preparar la propuesta. Conservamos tus respuestas; vuelve a intentarlo.');}
    finally {setBusy(false);}
  }

  const handleInvalid: SubmitErrorHandler<QuoteFormValues> = (errors) => {
    const invalidStep = firstInvalidQuoteStep(errors);
    if (invalidStep === null) return;
    const first = QUOTE_STEP_FIELDS[invalidStep].find((field) => errors[field]);
    setNotice(`Revisa las respuestas de «${steps[invalidStep].label}» para preparar tu propuesta.`);
    if (invalidStep === step) {
      if (first) focusField(first);
    } else {
      focusTarget.current = first ?? 'heading';
      setStep(invalidStep);
    }
  };
  function saveDraft() {
    if (!draftConsent) return;
    try {
      const draft = toAnonymousDraft(form.getValues());
      localStorage.setItem(ANONYMOUS_DRAFT_KEY, JSON.stringify(draft));
      setAvailableDraft(draft);
      setNotice(
        'Borrador anónimo guardado: sólo selecciones y rangos, sin nombres, contacto ni textos libres.',
      );
    } catch {
      setNotice('El navegador no permitió guardar el borrador. Las respuestas siguen en esta sesión.');
    }
  }
  function restoreDraft() {
    if (!availableDraft) return;
    form.reset(restoreAnonymousDraft(form.getValues(), availableDraft));
    setFurthestStep(0);
    goTo(0);
    setNotice('Opciones anónimas recuperadas. Conservamos los textos que ya escribiste en esta sesión.');
  }
  function clearDraft() {
    try {
      localStorage.removeItem(ANONYMOUS_DRAFT_KEY);
      setAvailableDraft(null);
      setNotice('Borrador anónimo eliminado.');
    } catch {
      setNotice('El navegador no permitió eliminar el borrador.');
    }
  }
  async function requestAdvice() {
    if(!result||!completedValues||savedId||busy)return;
    if(!DEMO_MODE && auth.user?.role!=='client') {
      setAccessOpen(true);return;
    }
    setBusy(true);setNotice('');
    try {if(!DEMO_MODE){const status=await billingRequest<VerificationStatus>('auth/verification');if(!canSaveQuote(status)){setAccessOpen(true);return;}}await saveProposal(completedValues,result);}
    catch(error){setNotice(`NO se guardó la propuesta. ${error instanceof Error?error.message:'Comprueba la conexión e inténtalo otra vez.'} Tus respuestas siguen en esta página.`);}
    finally {setBusy(false);}
  }

  async function shareWhatsApp() {
    const message = `Hola TUKNEX. Quisiera revisar esta propuesta preliminar:\n\n${proposal}`;
    const url = getWhatsAppUrl(message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setNotice(
        'Texto copiado. Compártelo con tu contacto de TUKNEX; el número comercial no está configurado.',
      );
    } catch {
      setNotice('No se pudo copiar. Descarga la propuesta para compartirla.');
    }
  }
  function renderStep() {
    switch (step) {
      case 0:
        return <QuoteIdeaStep prices={prices} />;
      case 1:
        return <QuoteBusinessStep />;
      case 2:
        return <QuoteFeaturesStep prices={prices} />;
      case 3:
        return <QuoteStyleStep prices={prices} />;
      case 4:
        return <QuoteTimingStep prices={prices} />;
      default:
        return <QuoteReviewStep onEdit={goTo} />;
    }
  }

  return (
    <FormProvider {...form}>
      {accessOpen && <QuoteAuthDialog onClose={()=>setAccessOpen(false)} onSave={async()=>{if(completedValues&&result)await saveProposal(completedValues,result);}}/>}
      <div className="quote-experience quote-v4">
        <div className="quote-layout">
          <nav className="quote-sidebar" aria-label="Pasos de la cotización">
            <ol className="quote-steps">
              {steps.map((item, index) => (
                <li
                  key={item.label}
                  className={`${step === index && !result ? 'active' : ''} ${index < step || result ? 'complete' : ''}`}
                >
                  <button
                    type="button"
                    disabled={index > furthestStep || !!result}
                    onClick={() => goTo(index)}
                    aria-current={index === step && !result ? 'step' : undefined}
                  >
                    <span className="quote-step-number">
                      {index < step || result ? <Check size={16} /> : index + 1}
                    </span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="quote-main" ref={panelRef}>
            <div className="quote-v4-progress" aria-live="polite">
              <span>
                {result ? 'Tu propuesta preliminar' : `Paso ${step + 1} de 6 · ${steps[step].label}`}
              </span>
              <strong>{result ? 100 : Math.round(((step + 1) / 6) * 100)}%</strong>
              <div>
                <i style={{ width: `${result ? 100 : ((step + 1) / 6) * 100}%` }} />
              </div>
            </div>
            <header className="quote-question-header">
              <h3 id="quote-question" ref={headingRef} tabIndex={-1}>
                {result ? 'Tu siguiente nivel ya tiene un plan.' : steps[step].title}
              </h3>
              <p id="quote-question-description" className="quote-step-description">
                {result
                  ? 'Una estimación por reglas, con el alcance y los límites a la vista.'
                  : steps[step].description}
              </p>
            </header>
            {result && completedValues ? (
              <QuoteResultStep
                values={completedValues}
                result={result}
                busy={busy}
                savedId={savedId}
                authenticated={auth.user?.role === 'client'}
                proposal={proposal}
                onEdit={goTo}
                onRequest={() => void requestAdvice()}
                onWhatsApp={() => void shareWhatsApp()}
              />
            ) : (
              <form
                noValidate
                aria-labelledby="quote-question"
                aria-describedby="quote-question-description"
                onSubmit={(event) => {
                  if (step < 5) {
                    event.preventDefault();
                    void nextStep();
                  } else void form.handleSubmit(finish, handleInvalid)(event);
                }}
              >
                <div className="quote-current-step" key={step}>
                  {renderStep()}
                </div>
                <div className="quote-form-footer">
                  <div>
                    {step > 0 ? (
                      <button type="button" className="quote-back" onClick={() => goTo(step - 1)}>
                        <ArrowLeft size={19} /> Atrás
                      </button>
                    ) : (
                      <span className="quote-help">
                        <ShieldCheck size={18} /> Sin compromiso
                      </span>
                    )}
                  </div>
                  {step < 5 ? (
                    <button
                      key="continue"
                      type="button"
                      className="quote-primary"
                      onClick={(event) => {
                        event.preventDefault();
                        void nextStep();
                      }}
                    >
                      Continuar <ArrowRight size={19} />
                    </button>
                  ) : (
                    <button key="finish" type="submit" className="quote-primary" disabled={busy}>
                      {busy ? 'Preparando…' : 'Ver mi propuesta'}
                      <Sparkles size={19} />
                    </button>
                  )}
                </div>
              </form>
            )}
            {notice && (
              <p className="quote-notice" role="status">
                {notice}
              </p>
            )}
            {!result && (
              <details className="quote-draft-section">
                <summary>
                  <Save size={18} /> Guardar o recuperar mis selecciones anónimas
                  <ChevronRight size={18} />
                </summary>
                <div className="quote-draft-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={draftConsent}
                      onChange={(event) => setDraftConsent(event.target.checked)}
                    />
                    <span>
                      Permito guardar sólo selecciones anónimas en este navegador. No se guardarán nombres,
                      contacto ni textos libres.
                    </span>
                  </label>
                  <button type="button" onClick={saveDraft} disabled={!draftConsent}>
                    <Save size={17} /> Guardar borrador
                  </button>
                  {availableDraft && (
                    <>
                      <button type="button" onClick={restoreDraft}>
                        Recuperar selecciones
                      </button>
                      <button type="button" onClick={clearDraft}>
                        <Trash2 size={17} /> Borrar
                      </button>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
        <aside className="quote-preview-column" aria-label="Vista previa e inversión">
          <QuotePreviewPanel control={form.control} />
          <QuoteEstimatePanel control={form.control} prices={prices} />
        </aside>
      </div>
    </FormProvider>
  );
}
