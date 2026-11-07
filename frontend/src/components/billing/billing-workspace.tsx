'use client';
import { PaymentReceipt } from './payment-receipt';
import { RecordDetail } from '@/components/records/record-detail';
import { RecordList } from '@/components/records/record-list';
import { receiptFileError, receiptMethods } from '@/lib/billing/receipts';
import {AccountShell} from '@/components/auth/account-shell';
import { QuoteRequestsPanel } from '@/components/quote/quote-requests-panel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FileSignature,
  Wallet,
  Plus,
  Download,
  Eye,
  Pencil,
  X,
  RefreshCw,
  Settings2,
  LogOut,
} from 'lucide-react';
import { DEMO_MODE } from '@/config/environment';
import { RoleGate } from '@/lib/platform/auth';
import { usePlatformData } from '@/lib/platform/repository';
import type { Quote } from '@/lib/platform/types';
import {
  billingBase,
  billingLogin,
  billingLogout,
  billingRequest,
  pdfBlob,
  savePdf,
} from '@/lib/billing/api';
import { useBilling } from '@/lib/billing/use-billing';
import { amount, todayLima, addDays } from '@/lib/billing/finance';
import {
  contractTransitions,
  type ContractStatus,
  paymentModes,
  statusLabels,
  serviceLabels,
  type BillingData,
  type BillingClient,
  type BillingQuote,
  type Contract,
  type Payment,
} from '@/lib/billing/types';
import { useAccessibleModal } from '@/components/auth/use-accessible-modal';
import { ClientEditor, DocumentEditor, SettingsEditor } from './document-forms';
import '@/components/auth/platform.css';
import './billing.css';
export type BillingSection = 'overview' | 'clients' | 'quotes' | 'contracts' | 'payments';
const billingRoutes = {
  overview: '/admin',
  clients: '/admin/clientes',
  quotes: '/admin/cotizaciones',
  contracts: '/admin/contratos',
  payments: '/admin/pagos',
};
const sections: Record<BillingSection, string> = {
  overview: 'Resumen financiero',
  clients: 'Clientes guardados',
  quotes: 'Cotizaciones formales',
  contracts: 'Contratos',
  payments: 'Pagos y cuotas',
};
function message(e: unknown) {
  return e instanceof Error ? e.message : 'No pudimos completar la operación.';
}
export function BillingScreen({ section }: { section: BillingSection }) {
  return <RoleGate allowed={['admin']}><AccountShell admin title={sections[section]}><h1 className="sr-only">{sections[section]}</h1><BillingWorkspace section={section}/></AccountShell></RoleGate>;
}
function Login() {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [mode, setMode] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch(billingBase + '/api/public/health', { signal: abort.signal })
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setMode('offline'));
    return () => abort.abort();
  }, []);
  async function login(e?: React.FormEvent, demo = false) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await billingLogin(demo ? 'admin@demo.tuknex' : email, demo ? 'Demo123!' : password);
      setPassword('');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="billing-connect">
      <FileSignature size={32} />
      <div>
        <span className="billing-eyebrow">GESTIÓN DE DOCUMENTOS Y COBROS</span>
        <h2>Un acuerdo claro. Cada pago en su lugar.</h2>
        <p>
          Accede a clientes guardados, contratos, PDFs y cronogramas. Esta sesión de gestión se valida en el
          servidor. Usa tu cuenta administradora de TUKNEX.
        </p>
        {DEMO_MODE && mode === 'local-demo' && (
          <>
            <button className="platform-button" disabled={busy} onClick={() => void login(undefined, true)}>
              {busy ? 'Conectando…' : 'Conectar gestión de prueba local'}
            </button>
            <p className="billing-hint">
              Base local persistente. Los registros de ejemplo están identificados como demo.
            </p>
          </>
        )}
        {mode === 'offline' && (
          <p className="billing-error">
            El servicio de gestión no está disponible. Actívalo desde el proyecto y vuelve a cargar.
          </p>
        )}
        <details>
          <summary>Acceder con cuenta de gestión</summary>
          <form onSubmit={(e) => void login(e)} className="billing-login-form">
            <label>
              Correo
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="platform-button" disabled={busy}>
              Entrar
            </button>
          </form>
        </details>
        {error && (
          <p role="alert" className="billing-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useAccessibleModal(true, onClose, dialogRef);
  return (
    <div className="platform-modal-backdrop billing-backdrop" onClick={onClose}>
      <section
        className="platform-modal billing-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 id="billing-dialog-title">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="platform-secondary"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
type RecordSelection = { kind: 'client' | 'quote' | 'payment' | 'installment'; id: string };
type Editor =
  | { kind: 'client'; initial?: BillingClient }
  | { kind: 'quote'; initial?: BillingQuote }
  | { kind: 'contract'; initial?: Contract }
  | { kind: 'payment'; contractId: string; installmentId?: string }
  | { kind: 'settings' }
  | { kind: 'void'; payment: Payment };
export function BillingWorkspace({
  section = 'overview',
  embedded = false,
}: {
  section?: BillingSection;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { data, error, loading, refresh } = useBilling(),
    snapshot = usePlatformData();
  const [view, setView] = useState(section),
    [editor, setEditor] = useState<Editor | null>(null),
    [selected, setSelected] = useState(''),
    [record, setRecord] = useState<RecordSelection | null>(null),
    [contractFilter, setFilter] = useState(''),
    [notice, setNotice] = useState(''),
    [problem, setProblem] = useState(''),
    [busy, setBusy] = useState(false),
    [pdf, setPdf] = useState<{ url: string; filename: string } | null>(null),
    [origin, setOrigin] = useState('');
  const pdfRef = useRef<string | null>(null);
  useEffect(() => {
    setView(section);
    setRecord(null);
  }, [section]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setOrigin(p.get('origen') || '');
    setSelected(p.get('contrato') || '');
    setFilter(p.get('contrato') || '');
  }, []);
  useEffect(
    () => () => {
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
    },
    [],
  );
  async function run(action: () => Promise<unknown>, success = 'Cambios guardados.') {
    setBusy(true);
    setProblem('');
    try {
      const result = await action();
      await refresh();
      setNotice(success);
      window.dispatchEvent(new Event('billing-change'));
      return result;
    } catch (e) {
      setProblem(message(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  async function preview(kind: 'quote' | 'contract', id: string) {
    setBusy(true);
    setProblem('');
    try {
      const doc = await pdfBlob('billing/' + (kind === 'quote' ? 'quotes' : 'contracts') + '/' + id + '/pdf');
      if (pdfRef.current) URL.revokeObjectURL(pdfRef.current);
      const url = URL.createObjectURL(doc.blob);
      pdfRef.current = url;
      setPdf({ url, filename: doc.filename });
    } catch (e) {
      setProblem(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function download(kind: 'quote' | 'contract', id: string) {
    setBusy(true);
    setProblem('');
    try {
      const doc = await pdfBlob('billing/' + (kind === 'quote' ? 'quotes' : 'contracts') + '/' + id + '/pdf');
      savePdf(doc.blob, doc.filename);
    } catch (e) {
      setProblem(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function convert(id: string) {
    const result = await run(
      () => billingRequest<Contract>('billing/quotes/' + id + '/contract', { method: 'POST' }),
      'Contrato preparado con los datos de la cotización.',
    );
    if (result) {
      setSelected((result as Contract).id);
      router.push('/admin/contratos?contrato=' + encodeURIComponent((result as Contract).id));
    }
  }
  async function importQuote(q: Quote, convertAfter = false) {
    const approved = ['Aprobado', 'En desarrollo', 'Finalizado'].includes(q.status);
    const body = {
      client: {
        name: q.business || q.name,
        taxId: '',
        phone: q.phone,
        email: q.email,
        address: '',
        isDemo: true,
        legacyId: 'legacy-client:' + (q.userId || q.id),
      },
      quote: {
        projectName: q.project,
        service: Object.hasOwn(serviceLabels, q.projectType) ? q.projectType : 'business',
        scope: q.notes + '\n' + (q.features || []).join(', '),
        observations: 'Importada de la sesión de demostración: ' + q.id,
        conditions: 'El alcance, impuestos, dominio y alojamiento se confirman por separado.',
        delivery: 'A confirmar con el cliente.',
        baseCents: Math.round((q.amount || 0) * 100),
        plan: { mode: 'cash', rate: 0, count: 1, firstDueDate: todayLima() },
        status: approved ? 'accepted' : 'draft',
        issuedDate: todayLima(),
        validUntil: addDays(todayLima(), 15),
        legacyId: q.id,
        isDemo: true,
      },
    };
    const result = await run(
      () => billingRequest<BillingQuote>('billing/bridge', { method: 'POST', body: JSON.stringify(body) }),
      'Cotización de sesión guardada como ejemplo.',
    );
    if (result) {
      setOrigin('');
      if (convertAfter) await convert((result as BillingQuote).id);
    }
  }
  async function done(id?: string) {
    setEditor(null);
    await refresh();
    window.dispatchEvent(new Event('billing-change'));
    setNotice('Registro guardado.');
    if (editor?.kind === 'contract' && id) setSelected(id);
  }
  if (!data)
    return (
      <div className={'billing-workspace ' + (embedded ? 'embedded' : '')}>
        {error && (
          <p className="billing-error" role="alert">
            {error}
          </p>
        )}
        <Login />
      </div>
    );
  const contract = data.contracts.find((c) => c.id === selected),
    legacyOrigin = snapshot.quotes.find((q) => q.id === origin);
  const legacyQuotes = (DEMO_MODE ? snapshot.quotes : []).filter((q) => !data.quotes.some((saved) => saved.legacyId === q.id));
  const chosen = data.contracts.find((c) => c.id === contractFilter),
    installments = data.installments.filter((i) =>
      contractFilter
        ? i.contractId === contractFilter
        : data.contracts.some((c) => c.id === i.contractId && c.status !== 'cancelado'),
    ),
    payments = data.payments.filter((p) => !contractFilter || p.contractId === contractFilter);
  const allPaid = installments.filter((i) => i.status === 'pagada').length;
  const activeClient = record?.kind === 'client' ? data.clients.find(item => item.id === record.id) : undefined;
  const activeQuote = record?.kind === 'quote' ? data.quotes.find(item => item.id === record.id) : undefined;
  const activePayment = record?.kind === 'payment' ? data.payments.find(item => item.id === record.id) : undefined;
  const activeInstallment = record?.kind === 'installment' ? data.installments.find(item => item.id === record.id) : undefined;
  function feedback() {
    return <>{notice && <p className="billing-success" role="status">{notice}</p>}{(problem || error) && <p className="billing-error" role="alert">{problem || error}</p>}</>;
  }
  function quoteActions(q: BillingQuote) {
    return <div className="billing-row-actions billing-detail-actions">
      <button disabled={busy} onClick={() => void preview('quote', q.id)}><Eye size={16}/>Ver PDF</button>
      <button disabled={busy} onClick={() => void download('quote', q.id)}><Download size={16}/>Descargar PDF</button>
      {['draft', 'sent'].includes(q.status) && <>
        <button onClick={() => setEditor({ kind: 'quote', initial: q })}><Pencil size={16}/>Editar</button>
        <button disabled={busy} onClick={() => void run(() => billingRequest('billing/quotes/' + q.id + '/accept', { method: 'POST' }), 'Aceptación del cliente registrada manualmente.')}>Registrar aceptación</button>
      </>}
      {q.status === 'accepted' && <button disabled={busy} onClick={() => void convert(q.id)}><FileSignature size={16}/>Generar contrato</button>}
    </div>;
  }
  async function downloadReceipt(payment: Payment) {
    try {
      const res = await fetch(billingBase + '/api/billing/receipts/' + payment.receiptId, { headers: await receiptHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo descargar el comprobante.');
      savePdf(await res.blob(), 'comprobante-' + payment.id + (res.headers.get('content-type') === 'application/pdf' ? '.pdf' : res.headers.get('content-type') === 'image/png' ? '.png' : '.jpg'));
    } catch (e) { setProblem(message(e)); }
  }
  return (
    <section className={'billing-workspace ' + (embedded ? 'embedded' : '')}>
      <div className="billing-heading">
        <div>
          <span className="billing-eyebrow">ACUERDOS Y COBROS</span>
          <h2>{sections[view]}</h2>
          <p>
            {data.mode === 'local-demo'
              ? 'Gestión local de prueba · datos persistentes en este equipo.'
              : 'Gestión conectada al servidor.'}
          </p>
        </div>
        <div className="billing-toolbar">
          <button
            className="platform-secondary"
            disabled={loading || busy}
            onClick={() => void refresh()}
            aria-label="Actualizar gestión"
          >
            <RefreshCw size={17} />
          </button>
          <button className="platform-secondary" onClick={() => setEditor({ kind: 'settings' })}>
            <Settings2 size={17} />
            Configuración
          </button>
          <button className="platform-secondary" onClick={() => void billingLogout()}>
            <LogOut size={17} />
            Desconectar gestión
          </button>
        </div>
      </div>
      <nav className="billing-tabs" aria-label="Documentos y pagos">
        {Object.entries(sections).map(([key, label]) => (
          <Link
            key={key}
            href={billingRoutes[key as BillingSection]}
            aria-current={view === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {notice && (
        <p className="billing-success" role="status">
          {notice}
        </p>
      )}
      {(problem || error) && (
        <p className="billing-error" role="alert">
          {problem || error}
        </p>
      )}
      {legacyOrigin && (
        <div className="billing-callout">
          <div>
            <strong>
              {legacyOrigin.project} · {legacyOrigin.business}
            </strong>
            <p>Guardar la cotización de esta sesión como ejemplo y generar su contrato.</p>
          </div>
          <button
            className="platform-button"
            disabled={busy || !legacyOrigin.amount}
            onClick={() => void importQuote(legacyOrigin, true)}
          >
            Guardar y generar contrato
          </button>
        </div>
      )}
      {!DEMO_MODE && view === 'overview' && <QuoteRequestsPanel admin origin="client" limit={3} />}
      {view === 'overview' && (
        <>
          <div className="billing-metrics">
            <Metric label="Contratos activos" value={String(data.summary.activeContracts)} />
            <Metric label="Total cobrado" value={amount(data.summary.collectedCents)} />
            <Metric label="Saldo pendiente" value={amount(data.summary.outstandingCents)} />
            <Metric label="Importe vencido" value={amount(data.summary.overdueCents)} />
          </div>
          <div className="billing-overview-grid">
            <article>
              <h3>Cuotas próximas a vencer</h3>
              {data.installments
                .filter(
                  (i) =>
                    i.remainingCents > 0 &&
                    i.date >= todayLima() &&
                    i.date <= addDays(todayLima(), 7) &&
                    data.contracts.find((c) => c.id === i.contractId)?.status !== 'cancelado',
                )
                .slice(0, 6)
                .map((i) => (
                  <button
                    className="billing-list-button"
                    key={i.id}
                    onClick={() => {
                      router.push('/admin/pagos?contrato=' + encodeURIComponent(i.contractId));
                    }}
                  >
                    <span>
                      {data.contracts.find((c) => c.id === i.contractId)?.client.name}
                      <small>
                        {i.label} · {i.date}
                      </small>
                    </span>
                    <b>{amount(i.remainingCents)}</b>
                  </button>
                ))}
              {!data.installments.some(
                (i) => i.remainingCents > 0 && i.date >= todayLima() && i.date <= addDays(todayLima(), 7),
              ) && <p>No hay cuotas próximas en los siguientes siete días.</p>}
            </article>
            <article>
              <h3>Clientes recientes</h3>
              {data.clients.slice(0, 4).map((c) => (
                <div className="billing-list-line" key={c.id}>
                  <span>{c.name}</span>
                  <small>{c.isDemo ? 'Demo' : 'Cliente guardado'}</small>
                </div>
              ))}
              <h3>Cotizaciones recientes</h3>
              {data.quotes.slice(0, 3).map((q) => (
                <button
                  className="billing-list-button"
                  key={q.id}
                  onClick={() => {
                    void preview('quote', q.id);
                  }}
                >
                  <span>
                    {q.number}
                    <small>{q.client.name}</small>
                  </span>
                  <b>{amount(q.totalCents)}</b>
                </button>
              ))}
            </article>
          </div>
        </>
      )}
      {view === 'clients' && <>
        <div className="billing-section-actions"><p>{data.clients.length} clientes guardados</p><button className="platform-button" onClick={() => setEditor({ kind: 'client' })}><Plus size={17}/>Nuevo cliente</button></div>
        <RecordList items={data.clients} getKey={c => c.id} getSearchText={c => [c.name, c.taxId, c.email, c.phone, c.address].join(' ')} searchLabel="Buscar clientes" emptyMessage="Aún no hay clientes guardados." renderItem={c => <div className="billing-record-row billing-record-row-client">
          <div className="billing-record-primary"><strong>{c.name}</strong><small>{c.taxId || 'DNI / RUC por completar'}{c.isDemo ? ' · Demo' : ''}</small></div>
          <div className="billing-record-contact"><span>{c.email || 'Correo por completar'}</span><small>{c.phone || 'Teléfono por completar'}</small></div>
          <div className="billing-record-meta"><small>Registro</small><span>{c.createdAt.slice(0, 10)}</span></div>
          <button className="platform-secondary" aria-label={'Ver detalles de ' + c.name} onClick={() => setRecord({ kind: 'client', id: c.id })}><Eye size={16}/>Ver detalles</button>
        </div>}/>
      </>}
      {view === 'quotes' && <>
        <div className="billing-section-actions"><p>Propuestas profesionales guardadas</p><button className="platform-button" disabled={!data.clients.length} onClick={() => setEditor({ kind: 'quote' })}><Plus size={17}/>Crear propuesta formal</button></div>
        <RecordList items={data.quotes} getKey={q => q.id} getSearchText={q => [q.number, q.projectName, q.client.name, q.status, serviceLabels[q.service], { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }[q.status]].join(' ')} searchLabel="Buscar cotizaciones PDF" emptyMessage="Aún no hay cotizaciones profesionales guardadas." renderItem={q => <div className="billing-record-row">
          <div className="billing-record-primary"><strong>{q.number}</strong><span>{q.projectName}</span><small>{q.client.name}</small></div>
          <div className="billing-record-meta"><small>Emisión</small><span>{q.issuedDate}</span></div>
          <span className={'billing-badge ' + q.status}>{{ draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }[q.status]}</span>
          <strong className="billing-record-amount">{amount(q.totalCents)}</strong>
          <button className="platform-secondary" aria-label={'Ver detalles de cotización ' + q.number} onClick={() => setRecord({ kind: 'quote', id: q.id })}><Eye size={16}/>Ver detalles</button>
        </div>}/>
          {DEMO_MODE && <details className="billing-legacy">
            <summary>Importar cotizaciones de la sesión demo ({legacyQuotes.length})</summary>
            <p>Se guardan explícitamente como ejemplos y mantienen su identificador de origen.</p>
            {legacyQuotes.slice(0, 12).map((q) => (
              <div key={q.id} className="billing-list-line">
                <span>
                  {q.business} · {q.project}
                  <small>
                    {q.status} ·{' '}
                    {q.amount ? amount(Math.round(q.amount * 100)) : 'Importe pendiente de acordar'}
                  </small>
                </span>
                <button
                  disabled={busy || !q.amount}
                  className="platform-secondary"
                  onClick={() => void importQuote(q)}
                >
                  Importar ejemplo
                </button>
              </div>
            ))}
          </details>}
      </>}
      {view === 'contracts' && (
        <>
          <div className="billing-section-actions"><p>Acuerdos y documentos de tus proyectos</p><button className="platform-button" disabled={!data.clients.length} onClick={() => setEditor({ kind: 'contract' })}><Plus size={17}/>Nuevo contrato</button></div>
          <RecordList items={data.contracts} getKey={c => c.id} getSearchText={c => [c.number, c.client.name, c.projectName, serviceLabels[c.service], statusLabels[c.status]].join(' ')} searchLabel="Buscar contratos" emptyMessage="Crea un contrato o convierte una cotización aceptada. Sus cuotas se generan automáticamente." renderItem={c => <div className="billing-record-row">
            <div className="billing-record-primary"><strong>{c.number}</strong><span>{c.projectName}</span><small>{c.client.name}{c.isDemo && !/demo/i.test(c.client.name) ? ' · Demo' : ''}</small></div>
            <div className="billing-record-meta"><small>Entrega</small><span>{c.deliveryDate}</span></div>
            <span className={'billing-badge ' + c.status}>{statusLabels[c.status]}</span>
            <strong className="billing-record-amount">{amount(c.totalCents)}</strong>
            <button className="platform-secondary" aria-label={'Ver detalles de contrato ' + c.number} onClick={() => setSelected(c.id)}><Eye size={16}/>Ver detalles</button>
          </div>}/>
          {contract && (
            <RecordDetail title={contract.projectName} subtitle={<>{contract.number} · {contract.client.name} · {statusLabels[contract.status]}</>} onClose={() => setSelected('')} className="billing-workspace billing-record-detail">
            {feedback()}
            <article className="billing-detail">
              <div className="billing-metrics">
                <Metric label="Base" value={amount(contract.baseCents)} />
                <Metric label={'Recargo ' + contract.plan.rate + '%'} value={amount(contract.feeCents)} />
                <Metric label="Monto final" value={amount(contract.totalCents)} />
              </div>
              <div className="billing-detail-grid">
                <div>
                  <h4>Cliente</h4>
                  <p>
                    {contract.client.name}
                    <br />
                    DNI/RUC: {contract.client.taxId || 'Por completar'}
                    <br />
                    {contract.client.address || 'Dirección por completar'}
                    <br />
                    {contract.client.phone} {contract.client.email}
                  </p>
                  <h4>Alcance</h4>
                  <p className="billing-preserve">{contract.scope}</p>
                </div>
                <div>
                  <h4>Fechas acordadas</h4>
                  <p>
                    Emisión: {contract.issuedDate}
                    <br />
                    Inicio: {contract.startDate}
                    <br />
                    Entrega: {contract.deliveryDate}
                  </p>
                  <h4>Condiciones</h4>
                  <p className="billing-preserve">
                    {contract.conditions || 'Ver condiciones de la plantilla PDF.'}
                  </p>
                  <p>{contract.observations}</p>
                </div>
              </div>
              <div className="billing-toolbar">
                <button
                  className="platform-button"
                  disabled={busy}
                  onClick={() => void download('contract', contract.id)}
                >
                  <Download size={16} />
                  Descargar contrato PDF
                </button>
                <button className="platform-secondary" onClick={() => void preview('contract', contract.id)}>
                  Vista previa
                </button>
                <button
                  className="platform-secondary"
                  onClick={() => {
                    router.push('/admin/pagos?contrato=' + encodeURIComponent(contract.id));
                  }}
                >
                  Ver cuotas y pagos
                </button>
                {contract.status === 'borrador' &&
                  !data.payments.some((p) => p.contractId === contract.id) && (
                    <button
                      className="platform-secondary"
                      onClick={() => setEditor({ kind: 'contract', initial: contract })}
                    >
                      <Pencil size={16} />
                      Editar borrador
                    </button>
                  )}
              </div>
              <form
                className="billing-status-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const status = new FormData(e.currentTarget).get('status');
                  void run(
                    () =>
                      billingRequest('billing/contracts/' + contract.id + '/status', {
                        method: 'POST',
                        body: JSON.stringify({ status, version: contract.version }),
                      }),
                    'Estado administrativo actualizado.',
                  );
                }}
              >
                <label>
                  Registrar siguiente estado
                  <select name="status" defaultValue="">
                    <option value="" disabled>
                      Seleccionar estado
                    </option>
                    {Object.entries(statusLabels)
                      .filter(([key]) => contractTransitions[contract.status].includes(key as ContractStatus))
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  disabled={busy || ['finalizado', 'cancelado'].includes(contract.status)}
                  className="platform-secondary"
                >
                  Actualizar estado
                </button>
                <small>
                  Las firmas se obtienen fuera de la plataforma. Activar requiere registrar ambas; finalizar
                  requiere saldo cero.
                </small>
              </form>
            </article>
            </RecordDetail>
          )}
        </>
      )}
      {view === 'payments' && (
        <>
          <div className="billing-section-actions">
            <label>
              Contrato
              <select value={contractFilter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Todos los contratos</option>
                {data.contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} · {c.client.name}
                  </option>
                ))}
              </select>
            </label>
            {chosen && (
              <button
                className="platform-button"
                disabled={busy || ['cancelado', 'finalizado'].includes(chosen.status)}
                onClick={() => setEditor({ kind: 'payment', contractId: chosen.id })}
              >
                <Wallet size={17} />
                Registrar pago
              </button>
            )}
          </div>
          <div className="billing-metrics">
            <Metric
              label="Total acordado"
              value={amount(installments.reduce((s, i) => s + i.amountCents, 0))}
            />
            <Metric label="Cobrado" value={amount(installments.reduce((s, i) => s + i.paidCents, 0))} />
            <Metric
              label="Pendiente"
              value={amount(installments.reduce((s, i) => s + i.remainingCents, 0))}
            />
            <Metric label="Cuotas pagadas" value={allPaid + ' / ' + installments.length} />
          </div>
          <h3 className="billing-list-title">Cuotas del contrato</h3>
          <RecordList items={installments} getKey={i => i.id} getSearchText={i => [i.label, i.date, i.status, data.contracts.find(c => c.id === i.contractId)?.number, data.contracts.find(c => c.id === i.contractId)?.client.name].join(' ')} searchLabel="Buscar cuotas" emptyMessage="Crea un contrato para generar sus cuotas." renderItem={i => <div className="billing-record-row">
            <div className="billing-record-primary"><strong>{i.number}. {i.label}</strong><span>{data.contracts.find(c => c.id === i.contractId)?.number}</span><small>{data.contracts.find(c => c.id === i.contractId)?.client.name}</small></div>
            <div className="billing-record-meta"><small>Vencimiento</small><span>{i.date}</span></div>
            <span className={'billing-badge ' + i.status}>{i.status === 'pagada' ? 'Pagada' : i.status === 'vencida' ? 'Vencida' : i.paidCents ? 'Pago parcial' : 'Pendiente'}</span>
            <div className="billing-record-meta"><small>Saldo</small><strong className="billing-record-amount">{amount(i.remainingCents)}</strong></div>
            <button className="platform-secondary" aria-label={'Ver detalles de cuota ' + i.number + ' ' + i.label} onClick={() => setRecord({ kind: 'installment', id: i.id })}><Eye size={16}/>Ver detalles</button>
          </div>}/>
          <h3 className="billing-list-title">Historial de pagos</h3>
          <RecordList items={payments} getKey={p => p.id} getSearchText={p => [p.date, p.method, p.reference, p.observation, p.voided ? 'Anulado' : 'Registrado', data.contracts.find(c => c.id === p.contractId)?.number, data.contracts.find(c => c.id === p.contractId)?.client.name].join(' ')} searchLabel="Buscar pagos" emptyMessage="Todavía no hay pagos registrados." renderItem={p => <div className="billing-record-row">
            <div className="billing-record-primary"><strong>{data.contracts.find(c => c.id === p.contractId)?.number || 'Contrato'}</strong><span>{data.contracts.find(c => c.id === p.contractId)?.client.name}</span><small>{receiptMethods[p.method]?.label || p.method}</small></div>
            <div className="billing-record-meta"><small>Fecha</small><span>{p.date}</span></div>
            <span className={'billing-badge ' + (p.voided ? 'cancelado' : 'pagada')}>{p.voided ? 'Anulado' : 'Registrado'}</span>
            <strong className="billing-record-amount">{amount(p.amountCents)}</strong>
            <button className="platform-secondary" aria-label={'Ver detalles del pago de ' + amount(p.amountCents) + ' del ' + p.date} onClick={() => setRecord({ kind: 'payment', id: p.id })}><Eye size={16}/>Ver detalles</button>
          </div>}/>
        </>
      )}
      {activeClient && <RecordDetail title={activeClient.name} subtitle="Cliente guardado" onClose={() => setRecord(null)} className="billing-workspace billing-record-detail" actions={<button className="platform-secondary" onClick={() => setEditor({ kind: 'client', initial: activeClient })}><Pencil size={16}/>Editar cliente</button>}>
        {feedback()}
        <dl className="billing-record-fields"><div><dt>Nombre</dt><dd>{activeClient.name}</dd></div><div><dt>DNI / RUC</dt><dd>{activeClient.taxId || 'Por completar'}</dd></div><div><dt>Correo electrónico</dt><dd>{activeClient.email || 'Por completar'}</dd></div><div><dt>Teléfono</dt><dd>{activeClient.phone || 'Por completar'}</dd></div><div><dt>Dirección</dt><dd>{activeClient.address || 'Dirección pendiente'}</dd></div><div><dt>Fecha de registro</dt><dd>{activeClient.createdAt.slice(0, 10)}</dd></div><div><dt>Tipo de registro</dt><dd>{activeClient.isDemo ? 'Demo' : 'Cliente guardado'}</dd></div></dl>
        <div className="billing-metrics"><Metric label="Cotizaciones guardadas" value={String(data.quotes.filter(q => q.clientId === activeClient.id).length)}/><Metric label="Contratos guardados" value={String(data.contracts.filter(c => c.clientId === activeClient.id).length)}/></div>
      </RecordDetail>}
      {activeQuote && <RecordDetail title={activeQuote.projectName} subtitle={<>{activeQuote.number} · {activeQuote.client.name} · {{ draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }[activeQuote.status]}</>} onClose={() => setRecord(null)} className="billing-workspace billing-record-detail" actions={quoteActions(activeQuote)}>
        {feedback()}
        <div className="billing-metrics"><Metric label="Base" value={amount(activeQuote.baseCents)}/><Metric label={'Recargo ' + activeQuote.plan.rate + '%'} value={amount(activeQuote.feeCents)}/><Metric label="Monto final" value={amount(activeQuote.totalCents)}/></div>
        <article className="billing-detail"><div className="billing-detail-grid"><div><h3>Cliente y proyecto</h3><p>{activeQuote.client.name}<br/>DNI/RUC: {activeQuote.client.taxId || 'Por completar'}<br/>{activeQuote.client.address || 'Dirección por completar'}<br/>{activeQuote.client.phone} {activeQuote.client.email}</p><h4>Servicio</h4><p>{serviceLabels[activeQuote.service] || activeQuote.service}</p><h4>Alcance</h4><p className="billing-preserve">{activeQuote.scope}</p></div><div><h3>Acuerdos de la propuesta</h3><h4>Fechas</h4><p>Emisión: {activeQuote.issuedDate}<br/>Vigencia: {activeQuote.validUntil}</p><h4>Entrega</h4><p className="billing-preserve">{activeQuote.delivery || 'Por confirmar'}</p><h4>Condiciones</h4><p className="billing-preserve">{activeQuote.conditions || 'Ver condiciones de la plantilla PDF.'}</p><h4>Observaciones</h4><p className="billing-preserve">{activeQuote.observations || 'Sin observaciones'}</p></div></div><h4>Modalidad acordada</h4><p>{paymentModes[activeQuote.plan.mode].label} · Recargo {activeQuote.plan.rate}%</p><div className="billing-schedule-preview"><ol>{activeQuote.schedule.map(item => <li key={item.number}><span>{item.number}. {item.label} · {item.date}</span><strong>{amount(item.amountCents)}</strong></li>)}</ol></div></article>
      </RecordDetail>}
      {activeInstallment && <RecordDetail title={activeInstallment.number + '. ' + activeInstallment.label} subtitle={<>{data.contracts.find(c => c.id === activeInstallment.contractId)?.number} · {data.contracts.find(c => c.id === activeInstallment.contractId)?.client.name}</>} onClose={() => setRecord(null)} className="billing-workspace billing-record-detail" actions={activeInstallment.remainingCents > 0 && !['cancelado', 'finalizado'].includes(data.contracts.find(c => c.id === activeInstallment.contractId)?.status || '') ? <button className="platform-button" onClick={() => setEditor({ kind: 'payment', contractId: activeInstallment.contractId, installmentId: activeInstallment.id })}><Wallet size={17}/>Registrar pago</button> : undefined}>
        {feedback()}
        <div className="billing-metrics"><Metric label="Importe de la cuota" value={amount(activeInstallment.amountCents)}/><Metric label="Pagado" value={amount(activeInstallment.paidCents)}/><Metric label="Saldo" value={amount(activeInstallment.remainingCents)}/></div>
        <dl className="billing-record-fields"><div><dt>Vencimiento</dt><dd>{activeInstallment.date}</dd></div><div><dt>Estado</dt><dd>{activeInstallment.status === 'pagada' ? 'Pagada' : activeInstallment.status === 'vencida' ? 'Vencida' : activeInstallment.paidCents ? 'Pago parcial' : 'Pendiente'}</dd></div>{activeInstallment.paidDate && <div><dt>Fecha de pago</dt><dd>{activeInstallment.paidDate}</dd></div>}</dl>
      </RecordDetail>}
      {activePayment && <RecordDetail title={'Pago de ' + amount(activePayment.amountCents)} subtitle={<>{data.contracts.find(c => c.id === activePayment.contractId)?.number} · {data.contracts.find(c => c.id === activePayment.contractId)?.client.name}</>} onClose={() => setRecord(null)} className="billing-workspace billing-record-detail" actions={<div className="billing-row-actions billing-detail-actions">{activePayment.receiptId && <button onClick={() => void downloadReceipt(activePayment)}>Descargar comprobante</button>}{!activePayment.voided && <button onClick={() => setEditor({ kind: 'void', payment: activePayment })}>Anular registro</button>}</div>}>
        {feedback()}
        <dl className="billing-record-fields"><div><dt>Fecha</dt><dd>{activePayment.date}</dd></div><div><dt>Monto</dt><dd>{amount(activePayment.amountCents)}</dd></div><div><dt>Método</dt><dd>{receiptMethods[activePayment.method]?.label || activePayment.method}</dd></div><div><dt>Referencia</dt><dd>{activePayment.reference || 'Sin referencia'}</dd></div><div><dt>Observación</dt><dd className="billing-preserve">{activePayment.observation || 'Sin observaciones'}</dd></div><div><dt>Estado</dt><dd>{activePayment.voided ? 'ANULADO' : 'Registrado'}</dd></div>{activePayment.voided && <div><dt>Motivo de anulación</dt><dd className="billing-preserve">{activePayment.voidReason}</dd></div>}</dl>
      </RecordDetail>}
      {editor && (
        <Modal
          title={
            editor.kind === 'client'
              ? 'Datos del cliente'
              : editor.kind === 'quote'
                ? 'Cotización profesional'
                : editor.kind === 'contract'
                  ? 'Contrato de servicios'
                  : editor.kind === 'payment'
                    ? 'Registrar pago realizado'
                    : editor.kind === 'void'
                      ? 'Anular registro de pago'
                      : 'TUKNEX y recargos'
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === 'client' ? (
            <ClientEditor initial={editor.initial} onDone={done} />
          ) : editor.kind === 'quote' || editor.kind === 'contract' ? (
            <DocumentEditor kind={editor.kind} data={data} initial={editor.initial} onDone={done} />
          ) : editor.kind === 'settings' ? (
            <SettingsEditor data={data} onDone={done} />
          ) : editor.kind === 'payment' ? (
            <PaymentEditor
              data={data}
              contractId={editor.contractId}
              installmentId={editor.installmentId}
              onDone={done}
            />
          ) : (
            <VoidEditor payment={editor.payment} onDone={done} />
          )}
        </Modal>
      )}
      {pdf && (
        <RecordDetail
          className="billing-workspace billing-record-detail billing-pdf-detail"
          title="Vista previa del documento PDF"
          onClose={() => {
            setPdf(null);
            if (pdfRef.current) {
              URL.revokeObjectURL(pdfRef.current);
              pdfRef.current = null;
            }
          }}
        >
          <div className="billing-pdf-tools">
            <a href={pdf.url} download={pdf.filename} className="platform-button">
              <Download size={17} />
              Descargar PDF
            </a>
            <span>Documento de fondo blanco, listo para compartir.</span>
          </div>
          <iframe title="Documento PDF TUKNEX" src={pdf.url} className="billing-pdf-frame" />
        </RecordDetail>
      )}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="billing-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
async function receiptHeaders() {
  const api = await import('@/lib/billing/api');
  return api.billingAuthHeaders();
}
function PaymentEditor({
  data,
  contractId,
  installmentId,
  onDone,
}: {
  data: BillingData;
  contractId: string;
  installmentId?: string;
  onDone: (id?: string) => void;
}) {
  const contract = data.contracts.find((c) => c.id === contractId)!,
    items = data.installments.filter((i) => i.contractId === contractId);
  const [selected, setSelected] = useState(installmentId || ''),
    [value, setValue] = useState(
      String(
        (installmentId
          ? items.find((i) => i.id === installmentId)?.remainingCents || 0
          : items.reduce((s, i) => s + i.remainingCents, 0)) / 100,
      ),
    ),
    [date, setDate] = useState(todayLima()),
    [method, setMethod] = useState('transferencia'),
    [reference, setReference] = useState(''),
    [observation, setObservation] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  const uploadedReceipt=useRef<{file:File;id:string}|null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let receiptId: string | undefined;
      if (file) {
        const problem=receiptFileError(file);if(problem)throw new Error(problem);
        if(uploadedReceipt.current?.file===file)receiptId=uploadedReceipt.current.id;
        else {const form=new FormData();form.append('file',file);receiptId=(await billingRequest<{id:string}>('billing/receipts',{method:'POST',body:form})).id;uploadedReceipt.current={file,id:receiptId};}
      }
      const result = await billingRequest<{ id: string }>('billing/contracts/' + contractId + '/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...(selected ? { installmentId: selected } : {}),
          amountCents: Math.round(Number(value) * 100),
          date,
          method,
          reference,
          observation,
          ...(receiptId ? { receiptId } : {}),
          idempotencyKey: key,
        }),
      });
      onDone(result.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="billing-form"><fieldset disabled={busy} className="billing-payment-fields">
      <p>
        <strong>
          {contract.number} · {contract.client.name}
        </strong>
      </p>
      <label>
        Aplicar el pago a
        <select
          value={selected}
          onChange={(e) => {
            const id = e.target.value;
            setSelected(id);
            setValue(
              String(
                (id
                  ? items.find((i) => i.id === id)?.remainingCents || 0
                  : items.reduce((s, i) => s + i.remainingCents, 0)) / 100,
              ),
            );
          }}
        >
          <option value="">Cuotas pendientes por orden de vencimiento</option>
          {items
            .filter((i) => i.remainingCents > 0)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.label} · Saldo {amount(i.remainingCents)}
              </option>
            ))}
        </select>
      </label>
      <div className="billing-form-grid">
        <label>
          Monto recibido (S/)
          <input
            required
            type="number"
            min=".01"
            step=".01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          Fecha del pago
          <input
            type="date"
            required
            max={todayLima()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Método
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {['transferencia', 'yape', 'plin', 'efectivo', 'tarjeta', 'otro'].map((m) => (
              <option key={m} value={m}>
                {receiptMethods[m].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {receiptMethods[method].reference}
          <input value={reference} maxLength={120} placeholder="Código de operación o referencia, si corresponde" onChange={(e) => setReference(e.target.value)} />
        </label>
      </div>
      <PaymentReceipt method={method} file={file} onChange={next=>{setFile(next);uploadedReceipt.current=null;}}/>
      <label>
        Observación
        <textarea
          rows={2}
          value={observation}
          maxLength={2000}
          onChange={(e) => setObservation(e.target.value)}
        />
      </label>

      <p className="billing-hint">
        Registra un pago que ya recibiste. Esta acción no cobra ni transfiere dinero.
      </p>
      {error && (
        <p role="alert" className="billing-error">
          {error}
        </p>
      )}
      <button disabled={busy} className="platform-button">
        {busy ? 'Registrando…' : 'Guardar pago realizado'}
      </button>
    </fieldset></form>
  );
}
function VoidEditor({ payment, onDone }: { payment: Payment; onDone: (id?: string) => void }) {
  const [reason, setReason] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="billing-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await billingRequest('billing/payments/' + payment.id + '/void', {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          onDone();
        } catch (e) {
          setError(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Se conserva el pago en el historial y se devuelve su importe al saldo pendiente. No se realiza un
        reembolso bancario.
      </p>
      <label>
        Motivo de anulación
        <textarea
          required
          minLength={5}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="billing-error">
          {error}
        </p>
      )}
      <button disabled={busy} className="platform-button">
        Anular registro con motivo
      </button>
    </form>
  );
}
