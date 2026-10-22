'use client';
import { DEMO_MODE } from '@/config/environment';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { pdfBlob, savePdf } from '@/lib/billing/api';
import { paymentPreferenceLabels, type QuoteFormValues } from '@/lib/quote/form';
import type { QuoteResult } from '@/lib/quote/contracts';
import '@/components/billing/billing.css';

export function QuotePdfDownload({ values, result, savedId, onPreferenceChange }: {
  values: QuoteFormValues; result: QuoteResult; savedId?: string;
  onPreferenceChange: (value: NonNullable<QuoteFormValues['paymentPreference']>) => void;
}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function download(saved=false) {
    setBusy(true);setError('');
    try {
      const doc=saved&&savedId
        ? await pdfBlob('account/quote-requests/'+savedId+'/pdf')
        : await pdfBlob('public/quote-pdf',{values,expectedMinCents:Math.round(result.min*100)});
      savePdf(doc.blob,doc.filename);
    } catch(error) {setError(error instanceof Error?error.message:'No se pudo descargar la propuesta.');}
    finally {setBusy(false);}
  }
  return <section className="quote-pdf-options">
    <h4>Tu propuesta, lista para compartir.</h4>
    <label>¿Con qué frecuencia prefieres pagar?
      <select value={values.paymentPreference||'unsure'} disabled={!!savedId||busy}
        onChange={event=>onPreferenceChange(event.target.value as NonNullable<QuoteFormValues['paymentPreference']>)}>
        {Object.entries(paymentPreferenceLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <p>Es una preferencia para conversar con TUKNEX. El importe de las cuotas, las fechas y las condiciones de pago se acuerdan contigo antes de emitir la cotización final.</p>
    {savedId&&<p>Tu preferencia quedó incluida en la propuesta guardada. Puedes preparar otra cotización si necesitas cambiarla.</p>}
    <p>PDF con logo, alcance, estimación e imagen referencial del servicio.</p>
    {error&&<p className="billing-error" role="alert">{error}</p>}
    <button type="button" className="quote-primary" disabled={busy} onClick={()=>void download(!!savedId&&!DEMO_MODE)}>
      <Download size={18}/>{busy?'Preparando PDF…':savedId&&!DEMO_MODE?'Descargar propuesta guardada':'Descargar propuesta PDF'}
    </button>
  </section>;
}
