'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {FormProvider,useForm,useWatch,type SubmitErrorHandler} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft,ArrowRight,Check,ShieldCheck,Sparkles} from 'lucide-react';
import {QuoteAuthDialog} from '@/components/auth/quote-auth-dialog';
import {QuoteNexiAi} from '@/components/quote/nexi-ai';
import {QuoteDictationProvider,QuoteDictationNotice} from '@/components/quote/field-dictation';
import {billingBase,billingRequest} from '@/lib/billing/api';
import {canSaveQuote,type VerificationStatus} from '@/lib/platform/verification';
import {DEMO_MODE} from '@/config/environment';
import {DEFAULT_PRICES,PROJECT_TYPES,readPriceOverrides,type ProjectType} from '@/lib/pricing';
import {getWhatsAppUrl} from '@/lib/config';
import {useDemoAuth} from '@/lib/platform/auth';
import {QUOTE_STEP_FIELDS,defaultFeatures,firstInvalidQuoteStep,quoteDefaults,quoteFormSchema,quotePrefillFromSearch,type QuoteFormValues} from '@/lib/quote/form';
import {QUOTE_RECOVERY_KEY,initialQuoteFlow,advanceQuoteFlow,completeQuoteFlow,quoteProgress,serializeQuoteRecovery,parseQuoteRecovery,type QuoteFlowState} from '@/lib/quote/workflow';
import {quoteService} from '@/lib/quote/service';
import {quoteAnswers,quoteProposalText} from '@/lib/quote/presentation';
import type {QuoteResult} from '@/lib/quote/contracts';
import {QuotePreviewPanel} from '@/components/quote/solution-preview';
import {QuoteProjectSession,QuoteProjectHistoryControls,useQuoteProjectSession} from '@/components/quote/project-session';
import {QuoteIdeaStep} from '@/components/quote/steps/idea-step';
import {QuoteBusinessStep} from '@/components/quote/steps/business-step';
import {QuoteFeaturesStep} from '@/components/quote/steps/features-step';
import {QuoteStyleStep} from '@/components/quote/steps/style-step';
import {QuoteTimingStep} from '@/components/quote/steps/timing-step';
import {QuoteReviewStep} from '@/components/quote/steps/review-step';
import {QuoteResultStep} from '@/components/quote/steps/result-step';
import {QuoteEstimatePanel} from '@/components/quote/steps/estimate-panel';
import './quote-chat.css';
import './quote/quote-flow.css';
import './quote/quote-redesign.css';
export {QuoteSummary} from '@/components/quote/steps/summary';

const steps=[
 {label:'Qué necesitas',title:'¿Qué necesitas?',description:'Elige lo que quieres conseguir. Te recomendaremos un punto de partida que puedes cambiar.'},
 {label:'Tu negocio',title:'Cuéntanos tu negocio',description:'Qué ofreces y qué te gustaría mejorar. Con tus palabras, sin términos técnicos.'},
 {label:'Funciones',title:'¿Qué quieres incluir?',description:'Empieza con lo que te resulte útil. Lo demás puede esperar.'},
 {label:'Diseño',title:'¿Cómo te gustaría que se vea?',description:'Elige una dirección visual. El boceto es una referencia que podemos ajustar contigo.'},
 {label:'Plazo',title:'¿Cuándo lo necesitas?',description:'Cuéntanos tus prioridades. Está bien si todavía no tienes una fecha o presupuesto.'},
 {label:'Tu cotización',title:'Revisa tu cotización',description:'Comprueba tu idea y su estimación antes de solicitar una propuesta.'},
];
const startValues:QuoteFormValues={...quoteDefaults,goal:'unsure',stylePreference:'unsure',timeline:'flexible'};
function QuoteDictationSession({children,step,disabled}:{children:React.ReactNode;step:number;disabled:boolean}){
 const session=useQuoteProjectSession();
 return <QuoteDictationProvider scopeKey={session.history.present.id+':'+step} disabled={disabled} onTranscribed={session.noteTranscription}>{children}</QuoteDictationProvider>;
}
export function QuoteStepperForm(){
 const auth=useDemoAuth();
 const form=useForm<QuoteFormValues>({resolver:zodResolver(quoteFormSchema),mode:'onTouched',defaultValues:startValues,shouldUnregister:false});
 const values=useWatch({control:form.control}) as QuoteFormValues;
 const [flow,setFlow]=useState<QuoteFlowState>(initialQuoteFlow),step=flow.step;
 const [result,setResult]=useState<QuoteResult|null>(null),[completedValues,setCompletedValues]=useState<QuoteFormValues|null>(null);
 const [prices,setPrices]=useState<Record<string,number>>({...DEFAULT_PRICES}),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [accessOpen,setAccessOpen]=useState(false),[savedId,setSavedId]=useState(''),[busy,setBusy]=useState(false),[recoveryMessage,setRecoveryMessage]=useState('');
 const headingRef=useRef<HTMLHeadingElement>(null),panelRef=useRef<HTMLDivElement>(null),requestKey=useRef<string|null>(null);
 const submitted=useRef(false);
 const navigationPending=useRef(false),focusTarget=useRef<'heading'|keyof QuoteFormValues|null>(null),flowRef=useRef(flow);
 flowRef.current=flow;
 const furthestStep=Math.max(step,0,...flow.completed.map(i=>Math.min(5,i+1)));
 const progress=quoteProgress(flow,values);
 const proposal=useMemo(()=>result&&completedValues?quoteProposalText(completedValues,result):'',[result,completedValues]);
 function focusQuestion(){
  const heading=headingRef.current;if(!heading)return;
  heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});
 }
 function focusField(name:keyof QuoteFormValues){
  const field=panelRef.current?.querySelector<HTMLElement>('[name="'+name+'"]');
  let parent=field?.closest('details');
  while(parent){parent.open=true;parent=parent.parentElement?.closest('details')??null;}
  if(field){field.focus({preventScroll:true});field.scrollIntoView({block:'center',behavior:'instant'});}else focusQuestion();
 }
 useLayoutEffect(()=>{const target=focusTarget.current;focusTarget.current=null;if(target==='heading')focusQuestion();else if(target)focusField(target);},[step,result]);
 useEffect(()=>{
  try{
   const raw=sessionStorage.getItem(QUOTE_RECOVERY_KEY),restored=parseQuoteRecovery(raw);
   if(raw&&!restored)sessionStorage.removeItem(QUOTE_RECOVERY_KEY);
   if(restored){form.reset(restored.values);setFlow(restored.flow);setRecoveryMessage('Retomamos tu avance en esta pestaña. Tus datos de contacto no se guardaron.');}
  }catch{setRecoveryMessage('Puedes continuar normalmente. Este navegador no permite recuperar el avance al recargar.');}
  const prefill=quotePrefillFromSearch(window.location.search);
  if(Object.keys(prefill).length){for(const [key,value]of Object.entries(prefill))form.setValue(key as keyof QuoteFormValues,value);if(prefill.goal||prefill.projectType)setFlow(old=>({...old,goalChosen:true}));}
  let timer:ReturnType<typeof setTimeout>|undefined,active=true;
  const persist=()=>{
   if(!active||submitted.current)return;
   try{sessionStorage.setItem(QUOTE_RECOVERY_KEY,serializeQuoteRecovery(form.getValues(),flowRef.current));}
   catch{setRecoveryMessage('Tu avance sigue en esta página; no pudimos crear una copia temporal para recargar.');}
  };
  const sub=form.watch(()=>{if(timer)clearTimeout(timer);timer=setTimeout(persist,600);});
  const pagehide=()=>persist();window.addEventListener('pagehide',pagehide);
  return()=>{persist();active=false;sub.unsubscribe();if(timer)clearTimeout(timer);window.removeEventListener('pagehide',pagehide);};
 },[form]);
 useEffect(()=>{
  try{if(!submitted.current)sessionStorage.setItem(QUOTE_RECOVERY_KEY,serializeQuoteRecovery(form.getValues(),flow));}catch{/* Recovery remains optional; form state survives navigation. */}
 },[flow,form]);
 useEffect(()=>{
  const update=()=>setPrices({...DEFAULT_PRICES,...readPriceOverrides()});update();
  void fetch(billingBase+'/api/public/payment-options',{signal:AbortSignal.timeout(2500)}).then(r=>r.ok?r.json():null).then(data=>{if(data?.prices)setPrices({...DEFAULT_PRICES,...data.prices});}).catch(()=>{});
  const apply=(search:string)=>{submitted.current=false;setRecoveryMessage('');const prefill=quotePrefillFromSearch(search);for(const [key,value]of Object.entries(prefill))form.setValue(key as keyof QuoteFormValues,value);setFlow(old=>({...old,step:0,completed:old.completed.filter(i=>i<5),goalChosen:!!(prefill.goal||prefill.projectType)||old.goalChosen}));setResult(null);setCompletedValues(null);setSavedId('');requestKey.current=null;focusTarget.current='heading';};
  const recommended=(event:Event)=>{if(typeof(event as CustomEvent).detail==='string')apply((event as CustomEvent<string>).detail);};
  const pop=()=>apply(window.location.search);
  const project=(event:Event)=>{const type=(event as CustomEvent).detail;if(!PROJECT_TYPES.some(p=>p.id===type))return;submitted.current=false;setRecoveryMessage('');form.setValue('projectType',type as ProjectType);form.setValue('features',[...defaultFeatures[type as ProjectType]]);setFlow(old=>({...old,step:0,completed:old.completed.filter(i=>i<5),goalChosen:true}));setResult(null);setCompletedValues(null);setSavedId('');requestKey.current=null;focusTarget.current='heading';};
  window.addEventListener('storage',update);window.addEventListener('tuknex-data',update);window.addEventListener('tuknex-quote-prefill',recommended);window.addEventListener('popstate',pop);window.addEventListener('tuknex-project',project);
  return()=>{window.removeEventListener('storage',update);window.removeEventListener('tuknex-data',update);window.removeEventListener('tuknex-quote-prefill',recommended);window.removeEventListener('popstate',pop);window.removeEventListener('tuknex-project',project);};
 },[form]);
 function goTo(index:number){
  if(busy||index<0||index>furthestStep)return;
  submitted.current=false;setRecoveryMessage('');focusTarget.current='heading';setResult(null);setCompletedValues(null);setSavedId('');requestKey.current=null;setNotice('');setError('');
  if(index===step&&!result)focusQuestion();else setFlow(old=>({...old,step:index,completed:old.completed.filter(i=>i<5)}));
 }
 async function nextStep(){
  if(navigationPending.current||step>=5||busy)return;
  navigationPending.current=true;setError('');
  try{
   if(step===0&&!flow.goalChosen){setError('Elige lo que quieres conseguir para continuar.');focusQuestion();return;}
   const valid=await form.trigger(QUOTE_STEP_FIELDS[step],{shouldFocus:false});
   if(!valid){const first=QUOTE_STEP_FIELDS[step].find(key=>form.getFieldState(key).error);if(first)focusField(first);return;}
   const next=advanceQuoteFlow(flow,form.getValues());focusTarget.current='heading';setFlow(next);setNotice('');
  }finally{navigationPending.current=false;}
 }
 async function saveProposal(input:QuoteFormValues,estimate:QuoteResult){
  requestKey.current ||=crypto.randomUUID();
  const saved=await quoteService.request({input,result:estimate,contact:{name:input.name,business:input.businessName,email:input.email,phone:input.phone,marketingConsent:input.marketingConsent},answers:quoteAnswers(input),demoClientId:auth.user?.role==='client'?auth.user.id:undefined,idempotencyKey:requestKey.current});
  setSavedId(saved.id);if(saved.result)setResult(saved.result);
  submitted.current=true;
  try{sessionStorage.removeItem(QUOTE_RECOVERY_KEY);}catch{/* Saving the request does not depend on browser storage. */}
  setRecoveryMessage('Tu solicitud ya fue enviada. La copia temporal de recuperación se ha retirado.');
  setFlow(old=>completeQuoteFlow(old,input));
  setNotice(saved.mode==='persistent'?'Solicitud '+(saved.number||saved.id)+' enviada. El equipo TUKNEX ya puede revisarla.':'Solicitud incorporada a la sesión de demostración.');
 }
 async function finish(input:QuoteFormValues){
  if(busy)return;setBusy(true);setNotice('');setError('');
  try{const estimate=await quoteService.calculate(input,prices);focusTarget.current='heading';setCompletedValues(input);setResult(estimate);setSavedId('');await submitProposal(input,estimate);}
  catch{setError('No pudimos preparar la propuesta. Tus respuestas siguen disponibles; vuelve a intentarlo.');}
  finally{setBusy(false);}
 }
 const invalid:SubmitErrorHandler<QuoteFormValues>=errors=>{
  const target=firstInvalidQuoteStep(errors);if(target===null)return;
  const first=QUOTE_STEP_FIELDS[target].find(key=>errors[key]);setError('Revisa las respuestas de «'+steps[target].label+'».');
  if(target===step){if(first)focusField(first);}else{focusTarget.current=first??'heading';setFlow(old=>({...old,step:target}));}
 };
 async function submitProposal(input:QuoteFormValues,estimate:QuoteResult){
  if(!DEMO_MODE&&auth.user?.role!=='client'){setAccessOpen(true);return;}
  if(!DEMO_MODE){const verification=await billingRequest<VerificationStatus>('auth/verification');if(!canSaveQuote(verification)){setAccessOpen(true);return;}}
  await saveProposal(input,estimate);
 }
 async function requestAdvice(){
  if(!result||!completedValues||savedId||busy)return;
  if(!DEMO_MODE&&auth.user?.role!=='client'){setAccessOpen(true);return;}
  setBusy(true);setError('');
  try{await submitProposal(completedValues,result);}
  catch(e){setError((e instanceof Error?e.message:'No se envió la solicitud. Comprueba la conexión.')+' Tus respuestas siguen disponibles.');}
  finally{setBusy(false);}
 }
 async function shareWhatsApp(){
  const message='Hola TUKNEX. Quisiera revisar esta propuesta preliminar:\n\n'+proposal,url=getWhatsAppUrl(message);
  if(url){window.open(url,'_blank','noopener,noreferrer');return;}
  try{await navigator.clipboard.writeText(message);setNotice('Propuesta copiada para compartir.');}catch{setError('No pudimos copiar el texto. Puedes descargar la propuesta.');}
 }
 function renderStep(){
  switch(step){
   case 0:return <QuoteIdeaStep prices={prices} chosen={flow.goalChosen} onGoalChosen={()=>{setFlow(old=>({...old,goalChosen:true}));setError('');}}/>;
   case 1:return <QuoteBusinessStep/>;
   case 2:return <QuoteFeaturesStep prices={prices}/>;
   case 3:return <QuoteStyleStep prices={prices}/>;
   case 4:return <QuoteTimingStep prices={prices}/>;
   default:return <QuoteReviewStep onEdit={goTo} prices={prices}/>;
  }
 }
 return <FormProvider {...form}>
  {accessOpen&&<QuoteAuthDialog onClose={()=>setAccessOpen(false)} onSave={async()=>{if(completedValues&&result)await saveProposal(completedValues,result);}}/>}
  <QuoteProjectSession form={form} onRestore={message=>{setResult(null);setCompletedValues(null);setSavedId('');requestKey.current=null;setNotice(message??'Cambio recuperado. Tus datos de contacto se mantienen.');}}>
   <QuoteDictationSession step={step} disabled={busy||!!result}>
    <div className="quote-experience quote-v4 quote-guided" data-step={step+1}>
     <div className="quote-layout">
      <nav className="quote-sidebar" aria-label="Pasos de la cotización"><ol className="quote-steps">{steps.map((item,index)=><li key={item.label} className={(index===step?'active ':'')+(flow.completed.includes(index)?'complete':'')}>
       <button type="button" disabled={index>furthestStep||busy} onClick={()=>goTo(index)} aria-label={`${index+1}. ${item.label}`} aria-current={index===step?'step':undefined}><span className="quote-step-number">{flow.completed.includes(index)?<Check size={16} aria-hidden="true"/>:index+1}</span><span>{item.label}</span></button>
      </li>)}</ol></nav>
      <div className="quote-progress-shell"><div className="quote-v4-progress"><span>Paso {step+1} de 6 · {steps[step].label}</span><strong>{progress}% completado</strong><div role="progressbar" aria-label="Etapas completadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{width:progress+'%'}}/></div></div></div>
      <div className="quote-main" ref={panelRef}>
       <header className="quote-question-header"><h2 id="quote-question" ref={headingRef} tabIndex={-1}>{result?'Tu propuesta preliminar':steps[step].title}</h2><p id="quote-question-description" className="quote-step-description">{result?'El alcance y el precio final se confirman después de revisar tu solicitud.':steps[step].description}</p></header>
       {result&&completedValues?<QuoteResultStep values={completedValues} result={result} busy={busy} savedId={savedId} authenticated={auth.user?.role==='client'} proposal={proposal} onPreferenceChange={preference=>{if(savedId||busy)return;form.setValue('paymentPreference',preference);setCompletedValues(old=>old?{...old,paymentPreference:preference}:old);requestKey.current=null;}} onEdit={goTo} onRequest={()=>void requestAdvice()} onWhatsApp={()=>void shareWhatsApp()}/>:
        <form noValidate aria-labelledby="quote-question" aria-describedby="quote-question-description" onSubmit={event=>{if(step<5){event.preventDefault();void nextStep();}else void form.handleSubmit(finish,invalid)(event);}}>
         {step>0&&<QuoteDictationNotice/>}
         <div className="quote-current-step" key={'questions-'+step}>{renderStep()}</div>
         {step>0&&step<5&&<QuoteNexiAi disabled={busy}/>}
         <details className="quote-history-disclosure"><summary>Deshacer o recuperar cambios de esta sesión</summary><QuoteProjectHistoryControls disabled={busy}/></details>
         {error&&<p className="quote-flow-error" role="alert">{error}</p>}
         <div className="quote-form-footer"><div>{step>0?<button type="button" className="quote-back" disabled={busy} onClick={()=>goTo(step-1)}><ArrowLeft size={18} aria-hidden="true"/> Anterior</button>:<span className="quote-help"><ShieldCheck size={17} aria-hidden="true"/> Sin compromiso</span>}</div>
          {step<5?<button type="button" className="quote-primary" disabled={busy} onClick={event=>{event.preventDefault();void nextStep();}}>Continuar <ArrowRight size={18} aria-hidden="true"/></button>:<button type="submit" className="quote-primary" disabled={busy}>{busy?'Enviando…':'Enviar solicitud'}<Sparkles size={18} aria-hidden="true"/></button>}
         </div>
        </form>}
       {result&&error&&<p className="quote-flow-error" role="alert">{error}</p>}
       {notice&&<p className="quote-notice" role="status">{notice}</p>}
       <p className="quote-local-note">{recoveryMessage||'Tu avance se conserva temporalmente en esta pestaña. La solicitud se guardará para el equipo cuando la envíes.'} <a href="/privacidad">Uso de tus datos</a></p>
      </div>
     </div>
     <aside className="quote-preview-column" aria-label="Tu idea y su estimación">{flow.goalChosen?<><QuotePreviewPanel disabled={busy||!!result} showEditor={false} openOnMobile={step===3}/><QuoteEstimatePanel prices={prices}/></>:<section className="quote-preview-intro"><Sparkles size={28} aria-hidden="true"/><h2>Tu idea comienza aquí</h2><p>Elige qué quieres conseguir. Después verás un boceto y una primera referencia de inversión.</p><span>Sin registro para explorar</span></section>}</aside>
    </div>
   </QuoteDictationSession>
  </QuoteProjectSession>
 </FormProvider>;
}
