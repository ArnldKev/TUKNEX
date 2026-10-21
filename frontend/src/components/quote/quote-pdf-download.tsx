'use client';
import { DEMO_MODE } from '@/config/environment';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { billingBase, pdfBlob, savePdf } from '@/lib/billing/api';
import { amount, buildPlan, todayLima } from '@/lib/billing/finance';
import { paymentModes, type PaymentMode } from '@/lib/billing/types';
import type { QuoteFormValues } from '@/lib/quote/form';
import type { QuoteResult } from '@/lib/quote/contracts';
import '@/components/billing/billing.css';
export function QuotePdfDownload({ values, result, savedId }: { values: QuoteFormValues; result: QuoteResult; savedId?: string }) {
  const [mode, setMode] = useState<PaymentMode>('cash'),
    [count, setCount] = useState(4),
    [rates, setRates] = useState<Record<string, number>>(
      Object.fromEntries(Object.entries(paymentModes).map(([k, v]) => [k, v.rate])),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(billingBase + '/api/public/payment-options', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rates) setRates(d.rates);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  let total = 0,
    fee = 0;
  try {
    if (!result.custom) {
      const plan = buildPlan(Math.round(result.min * 100), {
        mode,
        rate: rates[mode],
        count,
        firstDueDate: todayLima(),
      });
      total = plan.totalCents;
      fee = plan.feeCents;
    }
  } catch {
    /* Invalid quota values disable document generation until corrected. */
  }
  async function downloadSaved() {
    if(!savedId)return;setBusy(true);setError('');
    try{const doc=await pdfBlob('account/quote-requests/'+savedId+'/pdf');savePdf(doc.blob,doc.filename);}
    catch(error){setError(error instanceof Error?error.message:'No se pudo descargar la propuesta guardada.');}
    finally{setBusy(false);}
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const doc = await pdfBlob('public/quote-pdf', {
        values,
        mode: result.custom ? 'cash' : mode,
        count,
        expectedMinCents: Math.round(result.min * 100),
      });
      savePdf(doc.blob, doc.filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'El servicio de documentos no está disponible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="quote-pdf-options">
      <h4>Tu propuesta, lista para compartir.</h4>
      {savedId && !DEMO_MODE && <><p>Tu propuesta guardada conserva los datos del envío. También puedes simular otras modalidades de pago.</p><button type="button" className="quote-outline" disabled={busy} onClick={()=>void downloadSaved()}>Descargar propuesta guardada</button></>}
      <p>PDF con logo, alcance, precios, condiciones y una imagen referencial del servicio.</p>
      {!result.custom && (
        <>
          <label>
            Modalidad orientativa
            <select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
              {(['cash', 'half', 'three', 'weekly', 'fortnightly', 'monthly'] as const).map((key) => (
                <option key={key} value={key}>
                  {paymentModes[key].label} · recargo {rates[key]}%
                </option>
              ))}
            </select>
          </label>
          {['weekly', 'fortnightly', 'monthly'].includes(mode) && (
            <label>
              Número de cuotas
              <input
                type="number"
                min="1"
                max="120"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
          )}
          <p>
            Base estimada: <b>{amount(Math.round(result.min * 100))}</b> · Recargo único: <b>{amount(fee)}</b>{' '}
            · Total orientativo con esta modalidad: <b>{amount(total)}</b>.
          </p>
          <p>El importe y las fechas definitivos se acuerdan antes de crear el contrato.</p>
        </>
      )}
      {error && (
        <p className="billing-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="quote-primary"
        disabled={
          busy || !Number.isInteger(count) || count < 1 || count > 120 || (!result.custom && total <= 0)
        }
        onClick={() => void download()}
      >
        <Download size={18} />
        {busy ? 'Preparando PDF…' : savedId && !DEMO_MODE ? 'Descargar simulación de pago PDF' : 'Descargar cotización PDF'}
      </button>
    </section>
  );
}
