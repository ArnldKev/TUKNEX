import { DEMO_MODE } from '@/config/environment';
import { useState, type FormEvent } from 'react';
import { billingRequest } from '@/lib/billing/api';
import { todayLima, addDays, estimateDeliveryDate, toCents } from '@/lib/billing/finance';
import { clientDto, contractDto, quoteDto } from '@/lib/billing/schemas';
import {
  paymentModes,
  serviceLabels,
  type BillingClient,
  type BillingData,
  type BillingQuote,
  type Contract,
  type PlanInput,
} from '@/lib/billing/types';
import type { ContractDraft } from '@/lib/billing/contract-draft';
import { PaymentPlanFields } from './payment-plan-fields';
type Done = (id?: string) => void;
function issue(error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues))
    return error.issues.map((i) => i.message).join(' · ');
  return error instanceof Error ? error.message : 'No pudimos guardar los datos.';
}
export function ClientEditor({ initial, onDone }: { initial?: BillingClient; onDone: Done }) {
  const [value, set] = useState(
      initial || { name: '', taxId: '', email: '', phone: '', address: '', isDemo: false },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = clientDto.parse({
        name: value.name,
        taxId: value.taxId,
        email: value.email,
        phone: value.phone,
        address: value.address,
        isDemo: value.isDemo,
        ...('legacyId' in value ? { legacyId: value.legacyId } : {}),
      });
      const saved = await billingRequest<BillingClient>(
        'billing/clients' + (initial ? '/' + initial.id : ''),
        { method: initial ? 'PATCH' : 'POST', body: JSON.stringify(data) },
      );
      onDone(saved.id);
    } catch (e) {
      setError(issue(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="billing-form">
      <div className="billing-form-grid">
        {(
          [
            ['name', 'Nombre / razón social', 160],
            ['taxId', 'DNI / RUC', 11],
            ['phone', 'Teléfono', 30],
            ['email', 'Correo', 160],
            ['address', 'Dirección', 300],
          ] as const
        ).map(([key, label, max]) => (
          <label key={key}>
            {label}
            <input
              required={key === 'name'}
              type={key === 'email' ? 'email' : 'text'}
              inputMode={key === 'taxId' ? 'numeric' : undefined}
              maxLength={max}
              value={value[key]}
              onChange={(e) => set({ ...value, [key]: e.target.value })}
            />
            {key === 'taxId' && (
              <small>8 dígitos para DNI o 11 para RUC. Puedes completar un borrador después.</small>
            )}
          </label>
        ))}
      </div>
      {DEMO_MODE && (<label className="billing-check">
        <input
          type="checkbox"
          checked={value.isDemo}
          onChange={(e) => set({ ...value, isDemo: e.target.checked })}
        />
        Registro de demostración
      </label>)}
      {error && (
        <p role="alert" className="billing-error">
          {error}
        </p>
      )}
      <button disabled={busy} className="platform-button">
        {busy ? 'Guardando…' : 'Guardar cliente'}
      </button>
    </form>
  );
}
export function DocumentEditor({
  kind,
  data,
  initial,
  draft,
  onDone,
  apiPath = 'billing',
}: {
  apiPath?: string;
  kind: 'quote' | 'contract';
  data: BillingData;
  initial?: BillingQuote | Contract;
  draft?: ContractDraft;
  onDone: Done;
}) {
  const today = todayLima(),
    [quoteId, setQuoteId] = useState(initial && 'quoteId' in initial ? initial.quoteId || '' : draft?.quoteId || '');
  const [signatureMode,setSignatureMode]=useState<'physical'|'online'>(initial&&'signatureMode' in initial?initial.signatureMode||'physical':draft?.signatureMode||'physical');
  const [reviewed,setReviewed]=useState(false);
  const source=initial&&kind==='contract'?initial as Contract:draft;
  const draftClientMissing=!!draft&&!data.clients.some(client=>client.id===draft.clientId);
  const [fields, set] = useState({
    clientId: initial?.clientId || (draft?draft.clientId:data.clients[0]?.id) || '',
    projectName: initial?.projectName || draft?.projectName || '',
    service: initial?.service || draft?.service || 'landing',
    scope: initial?.scope || draft?.scope || '',
    observations: initial?.observations || draft?.observations || '',
    conditions: initial?.conditions || draft?.conditions || '',
    issuedDate: initial?.issuedDate || today,
    startDate: initial && 'startDate' in initial ? initial.startDate : today,
    deliveryDate: initial && 'deliveryDate' in initial ? initial.deliveryDate : draft?.delivery?estimateDeliveryDate(today,draft.delivery):addDays(today, 30),
    delivery:
      initial && 'delivery' in initial ? initial.delivery : '15 días hábiles desde la entrega de materiales.',
    validUntil: initial && 'validUntil' in initial ? initial.validUntil : addDays(today, 15),
    base: draft&&draft.baseCents===undefined?'':String((initial?.baseCents ?? draft?.baseCents ?? 25000) / 100),
    status: initial && 'validUntil' in initial ? initial.status : 'draft',
    isDemo: initial ? initial.isDemo : draft?draft.isDemo:data.clients[0]?.isDemo || false,
  });
  const [plan, setPlan] = useState<PlanInput>(
      initial?.plan || draft?.plan || { mode: 'cash', rate: data.rates.cash, count: 1, firstDueDate: today },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const client = data.clients.find((c) => c.id === fields.clientId),
    locked = !!quoteId && !initial;
  function chooseQuote(id: string) {
    setQuoteId(id);
    const q = data.quotes.find((q) => q.id === id);
    if (q) {
      set({
        ...fields,
        clientId: q.clientId,
        projectName: q.projectName,
        service: q.service,
        scope: q.scope,
        observations: [
          q.observations,
          'Plazo de la cotización: ' + q.delivery + ' (confirmar las fechas estimadas antes de enviar).',
        ]
          .filter(Boolean)
          .join('\n'),
        deliveryDate: estimateDeliveryDate(fields.startDate, q.delivery),
        conditions: q.conditions,
        base: String(q.baseCents / 100),
        isDemo: q.isDemo,
      });
      setPlan(q.plan);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if(draftClientMissing)throw Error('El cliente de origen ya no está disponible en este espacio. Actualiza la solicitud antes de continuar.');
      if(draft&&!reviewed)throw Error('Revisa y confirma los términos y el precio antes de guardar el borrador.');
      const shared = {
        clientId: fields.clientId,
        projectName: fields.projectName,
        service: fields.service,
        scope: fields.scope,
        observations: fields.observations,
        conditions: fields.conditions,
        issuedDate: fields.issuedDate,
        baseCents: toCents(fields.base),
        plan,
        isDemo: fields.isDemo,
      };
      const body =
        kind === 'quote'
          ? quoteDto.parse({
              ...shared,
              ...(initial?{expectedVersion:initial.version}:{}),
              delivery: fields.delivery,
              validUntil: fields.validUntil,
              status: fields.status,
            })
          : contractDto.parse({
              ...shared,
              startDate: fields.startDate,
              deliveryDate: fields.deliveryDate,
              signatureMode,
              ...(quoteId ? { quoteId } : {}),
              ...(source?.sourceRequestId?{sourceRequestId:source.sourceRequestId,sourceRequestRevision:source.sourceRequestRevision}:{}),
              ...(source?.sourceQuoteId?{sourceQuoteId:source.sourceQuoteId,sourceQuoteVersion:source.sourceQuoteVersion}:{}),
              ...(draft?.projectId&&apiPath==='billing'?{projectId:draft.projectId}:{}),
              ...(initial && 'projectId' in initial && initial.projectId
                ? { projectId: initial.projectId }
                : {}),
              ...(initial ? { version: initial.version } : {}),
            });
      const path = kind === 'quote' ? 'quotes' : 'contracts';
      const saved = await billingRequest<{ id: string }>(
        apiPath + '/' + path + (initial ? '/' + initial.id : ''),
        { method: initial ? 'PATCH' : 'POST', body: JSON.stringify(apiPath!=='billing'&&kind==='quote'&&initial?{...body,expectedVersion:initial.version}:body) },
      );
      onDone(saved.id);
    } catch (e) {
      setError(issue(e));
    } finally {
      setBusy(false);
    }
  }
  function input(key: keyof typeof fields, label: string, type = 'text', required = true) {
    return (
      <label>
        {label}
        <input
          type={type}
          step={type === 'number' ? '.01' : undefined}
          min={type === 'number' ? '.01' : undefined}
          required={required}
          value={String(fields[key])}
          onChange={(e) => set({ ...fields, [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <form onSubmit={submit} className="billing-form">
      <p className="billing-hint">
        Número {initial?.number || 'asignado automáticamente al guardar'}. Moneda: soles peruanos.
      </p>
      {kind === 'contract' && !initial && !draft && (
        <label>
          Origen de los términos (opcional)
          <select value={quoteId} onChange={(e) => chooseQuote(e.target.value)}>
            <option value="">Completar sin cotización</option>
            {data.quotes
              .filter((q) => q.status === 'accepted')
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.number} · {q.client.name}
                </option>
              ))}
          </select>
          {locked && (
            <small>
              Se copian los datos acordados. Podrás ajustar el borrador guardado antes de enviarlo.
            </small>
          )}
        </label>
      )}
      {kind==='contract'&&<label>Modalidad de aceptación<select value={signatureMode} onChange={e=>setSignatureMode(e.target.value as 'physical'|'online')} disabled={!!(initial&&'clientAcceptance' in initial&&initial.clientAcceptance)}><option value="physical">Firma física · descargar e imprimir</option><option value="online">Aceptación en línea · desde la cuenta del cliente</option></select><small>{signatureMode==='online'?'El cliente revisará el PDF y aceptará la versión enviada desde su cuenta. Esta aceptación no es una firma digital certificada.':'Se prepara el documento para descargarlo y firmarlo físicamente.'}</small></label>}
      {draft&&<section className="billing-client-summary" aria-label="Origen del borrador"><strong>Preparado desde {draft.source.number} · versión {draft.source.revision}</strong><span>{draft.analysis?'Incluye propuestas de NEXI para revisión.':'Conserva las respuestas y el alcance de origen.'}</span>{draft.warnings.map((warning,index)=><span key={index}>{warning}</span>)}<span>Guardar crea un borrador; no lo envía ni lo firma.</span></section>}
      {draftClientMissing&&<p className="billing-error" role="alert">El cliente de esta propuesta no está disponible. Actualiza la solicitud para continuar.</p>}
      <fieldset disabled={locked} className="billing-fieldset">
        <div className="billing-form-grid">
          <label>
            Cliente existente
            <select
              required
              disabled={!!draft}
              value={fields.clientId}
              onChange={(e) =>
                set({
                  ...fields,
                  clientId: e.target.value,
                  isDemo: data.clients.find((c) => c.id === e.target.value)?.isDemo || false,
                })
              }
            >
              <option value="">Seleccionar cliente</option>
              {data.clients.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {input('projectName', 'Nombre del proyecto')}
          <label>
            Servicio
            <select value={fields.service} onChange={(e) => set({ ...fields, service: e.target.value })}>
              {Object.entries(serviceLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {input('base', 'Monto base acordado (S/)', 'number')}
        </div>
      </fieldset>
      {client && (
        <div className="billing-client-summary">
          <strong>{client.name}</strong>
          <span>DNI/RUC: {client.taxId || 'Por completar'}</span>
          <span>
            {client.phone || 'Teléfono por completar'} · {client.email || 'Correo por completar'}
          </span>
          <span>{client.address || 'Dirección por completar'}</span>
        </div>
      )}
      <div className="billing-form-grid">
        {input('issuedDate', 'Fecha de emisión', 'date')}
        {kind === 'contract' ? (
          <>
            {input('startDate', 'Fecha de inicio', 'date')}
            {input('deliveryDate', 'Fecha estimada de entrega', 'date')}
          </>
        ) : (
          <>
            {input('validUntil', 'Válida hasta', 'date')}
            {input('delivery', 'Plazo de entrega')}
            <label>
              Estado registrado
              <select
                value={fields.status}
                onChange={(e) => set({ ...fields, status: e.target.value as typeof fields.status })}
              >
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
                <option value="accepted">Aceptada por el cliente (registro manual)</option>
                <option value="rejected">Rechazada</option>
              </select>
            </label>
          </>
        )}
      </div>
      <fieldset disabled={locked} className="billing-fieldset">
        <label>
          Alcance del servicio
          <textarea
            required
            rows={4}
            minLength={5}
            maxLength={8000}
            value={fields.scope}
            onChange={(e) => set({ ...fields, scope: e.target.value })}
          />
        </label>
        <label>
          Condiciones adicionales
          <textarea
            rows={3}
            maxLength={5000}
            value={fields.conditions}
            onChange={(e) => set({ ...fields, conditions: e.target.value })}
          />
        </label>
        <label>
          Observaciones
          <textarea
            rows={2}
            maxLength={3000}
            value={fields.observations}
            onChange={(e) => set({ ...fields, observations: e.target.value })}
          />
        </label>
        <PaymentPlanFields
          baseCents={Number.isFinite(Number(fields.base)) ? Math.round(Number(fields.base) * 100) : 0}
          plan={plan}
          onChange={setPlan}
          rates={data.rates}
        />
      </fieldset>
      {DEMO_MODE && (<label className="billing-check">
        <input
          type="checkbox"
          checked={fields.isDemo}
          disabled={locked}
          onChange={(e) => set({ ...fields, isDemo: e.target.checked })}
        />
        Datos de demostración
      </label>)}
      {error && (
        <p className="billing-error" role="alert">
          {error}
        </p>
      )}
      {draft&&<label className="billing-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>He revisado el cliente, el alcance, las condiciones, las fechas, el precio y las cuotas. Las propuestas de IA pendientes no se consideran acuerdos sin mi revisión.</label>}
      <button disabled={busy || !data.clients.length || draftClientMissing || (!!draft&&!reviewed)} className="platform-button">
        {busy ? 'Guardando…' : kind === 'quote' ? 'Guardar cotización' : 'Guardar contrato'}
      </button>
    </form>
  );
}
export function SettingsEditor({ data, onDone }: { data: BillingData; onDone: Done }) {
  const [issuer, setIssuer] = useState(data.issuer),
    [rates, setRates] = useState(data.rates),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="billing-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await billingRequest('billing/settings', {
            method: 'PATCH',
            body: JSON.stringify({ issuer, rates }),
          });
          onDone();
        } catch (e) {
          setError(issue(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Estos datos se usarán para documentos nuevos. Los contratos existentes conservan los datos del
        prestador que tenían al crearse.
      </p>
      <div className="billing-form-grid">
        {(
          [
            ['name', 'Titular / razón social'],
            ['taxId', 'DNI / RUC'],
            ['address', 'Dirección'],
            ['phone', 'Teléfono'],
            ['email', 'Correo'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={issuer[key]}
              required={key === 'name'}
              type={key === 'email' ? 'email' : 'text'}
              onChange={(e) => setIssuer({ ...issuer, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <h3>Recargos predeterminados</h3>
      <div className="billing-form-grid">
        {Object.keys(rates).map((mode) => (
          <label key={mode}>
            {paymentModes[mode as keyof typeof paymentModes].label} (%)
            <input
              type="number"
              min="0"
              max="100"
              step=".01"
              value={rates[mode as keyof typeof rates]}
              onChange={(e) => setRates({ ...rates, [mode]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="billing-error" role="alert">
          {error}
        </p>
      )}
      <button className="platform-button" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </form>
  );
}
