'use client';
import {useMemo} from 'react';
import {useFormContext,useWatch} from 'react-hook-form';
import {ShieldCheck} from 'lucide-react';
import {estimateQuote,money} from '@/lib/pricing';
import {paymentPreferenceLabels,type QuoteFormValues} from '@/lib/quote/form';
import {visualPreferenceSummary} from '@/lib/quote/visual';
import {QuotePreviewFeedback} from '../preview-feedback';
import {QuoteSummary} from './summary';
import {QuoteCheckboxField,QuoteDetails,QuoteSelectField,QuoteTextField} from './shared';
import {quoteChoiceLabel} from '@/lib/quote/commercial-labels';
export function QuoteReviewStep({onEdit,prices,staff=false}:{onEdit:(step:number)=>void;prices:Record<string,number>;staff?:boolean}){
 const {control}=useFormContext<QuoteFormValues>();
 const values=useWatch({control}) as QuoteFormValues;
 const estimate=useMemo(()=>estimateQuote(values,prices),[values,prices]);
 return <>
  <section className="quote-review-price" aria-label="Estimación preliminar de tu proyecto">
   <span>Inversión preliminar</span>
   <strong>{estimate.custom?'Evaluación personalizada':`${money(estimate.min)} – ${money(estimate.max)}`}</strong>
   <p>{estimate.custom?'Necesitamos revisar el alcance contigo antes de proponer un precio.':'Rango orientativo, sujeto a revisar el alcance. Puedes verlo sin registrarte.'}</p>
   <dl><div><dt>Plazo orientativo</dt><dd>{estimate.duration}</dd></div><div><dt>Complejidad</dt><dd>{estimate.complexity}</dd></div></dl>
  </section>
  <QuoteSummary values={values} onEdit={onEdit}/>
  <section className="quote-review-direction" aria-label="Tu negocio y dirección visual">
   <h3>La idea que nos cuentas</h3><p>{values.offering}</p><p>{values.problem}</p>
   <h3>Dirección visual</h3><p>{quoteChoiceLabel('stylePreference',values.stylePreference)} · Colores: {values.colorsLiked||'Por definir contigo'}</p>
   <p>{visualPreferenceSummary(values.visualPreferences)}</p>
   {values.references&&<p>Referencias: {values.references}</p>}
  </section>
  <details className="quote-detail-block"><summary>Alcance y desglose de la estimación</summary>
   <h3>Alcance inicial</h3><ul>{estimate.scope.map(item=><li key={item}>{item}</li>)}</ul>
   {!estimate.custom&&<dl className="quote-review-breakdown"><div><dt>Solución base</dt><dd>{money(estimate.base)}</dd></div>{estimate.extras.map(item=><div key={item.id}><dt>{item.name}</dt><dd>{money(item.amount)}</dd></div>)}{estimate.designAmount>0&&<div><dt>Diseño</dt><dd>{money(estimate.designAmount)}</dd></div>}{estimate.urgencyAmount>0&&<div><dt>Prioridad</dt><dd>{money(estimate.urgencyAmount)}</dd></div>}</dl>}
   {estimate.custom&&<ul>{estimate.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
   <h3>Fuera del alcance inicial</h3><ul>{estimate.exclusions.map(item=><li key={item}>{item}</li>)}</ul>
  </details>
  <section className="quote-separate-costs"><h3>Costos separados</h3><ul>{estimate.thirdPartyCosts.map(item=><li key={item}>{item}</li>)}</ul><p>{estimate.conditions}</p><p>El presupuesto indicado ayuda a priorizar; no modifica el cálculo. El plazo se acuerda con el alcance y los materiales listos.</p></section>
  <QuoteSelectField name="paymentPreference" label="¿Con qué frecuencia prefieres pagar? (opcional)" help="Es una preferencia para conversar. Las cuotas, fechas y condiciones se acuerdan contigo en la propuesta final.">{Object.entries(paymentPreferenceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</QuoteSelectField>
  <QuoteDetails title="Mi opinión del boceto (opcional)"><QuotePreviewFeedback/></QuoteDetails>
  <QuoteDetails title={staff?"Datos del cliente atendido (opcional)":"Datos para contactarme sobre esta propuesta (opcional)"}>
   <p>{staff?"Anota los datos que el cliente facilite para esta propuesta. Todavía no crean una cuenta ni la vinculan; podrás hacerlo desde el panel cuando el cliente se registre.":"Para enviar la solicitud accederás con tu cuenta de cliente. Puedes indicar un contacto para este proyecto; si lo dejas vacío, usaremos el de tu cuenta."}</p>
   <QuoteTextField name="name" label={staff?"Nombre del cliente":"Tu nombre"} placeholder="Nombre para esta solicitud"/>
   <QuoteTextField name="email" label="Correo electrónico" type="email" placeholder="tucorreo@ejemplo.com"/>
   <QuoteTextField name="phone" label="WhatsApp" type="tel" placeholder="+51 …"/>
   <QuoteCheckboxField name="marketingConsent">Opcional: deseo recibir contacto comercial sobre este proyecto.</QuoteCheckboxField>
  </QuoteDetails>
  <div className="quote-demo-note"><ShieldCheck size={20} aria-hidden="true"/><span>{staff?"Al guardar, las respuestas y el boceto quedarán registrados a cargo del equipo, pendientes de vincular a la cuenta del cliente.":"Al enviar, tus respuestas y el boceto quedarán asociados a tu cuenta para que TUKNEX revise la solicitud."} La estimación se comprobará con las tarifas del servidor. <a href="/privacidad">Uso de tus datos</a>.</span></div>
  <QuoteCheckboxField name="privacyAcknowledged">{staff?"He informado al cliente de que guardaré estas respuestas en TUKNEX para gestionar su solicitud.":"Entiendo que al enviar compartiré mis respuestas con TUKNEX para gestionar esta solicitud."}</QuoteCheckboxField>
 </>;
}
