'use client';
import './quote-requests.css';
import './quote-requests-records.css';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ContractDraftDialog} from '@/components/billing/contract-draft-dialog';
import {draftFromRequest,type ContractDraft} from '@/lib/billing/contract-draft';
import type {BillingData} from '@/lib/billing/types';
import {AccountResourceFeedback} from '@/components/client/account-resource-feedback';
import type {AccountResource} from '@/lib/client/account-resources';
import type {AiEnvelope} from '@/lib/quote/ai';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Download, RefreshCw, CalendarDays, ChevronDown, ArrowUpRight, Plus, UserPlus, UserCheck } from 'lucide-react';
import { billingRequest, pdfBlob, savePdf } from '@/lib/billing/api';
import { requestStatusLabels, type SavedQuoteRequest } from '@/lib/quote/requests';
import { money, PROJECT_TYPES } from '@/lib/pricing';
import { quoteAnswers } from '@/lib/quote/presentation';
import { paymentPreferenceLabels } from '@/lib/quote/form';
import { useDemoAuth, RoleGate } from '@/lib/platform/auth';
import { AccountShell } from '@/components/auth/account-shell';
import { RecordDetail } from '@/components/records/record-detail';
import { RecordList } from '@/components/records/record-list';
import {usePrivateRecordLink} from '@/components/records/use-private-record-link';
import { QuoteRequestNexiAi, QuoteTeamNexiAi } from './nexi-ai';
import { QuoteDraftsAdminPanel } from './quote-drafts-admin';
import { StatusBadge } from '@/components/ui/status-badge';
import { QuoteClientAssignment } from './quote-client-assignment';
import { matchesQuoteRequestOrigin, type QuoteRequestOrigin } from '@/lib/quote/request-origin';

const nextSteps: Record<SavedQuoteRequest['status'], string> = {
  pending: 'Recibimos tu propuesta. El equipo revisará la información de tu proyecto.',
  reviewing: 'Estamos revisando el alcance para preparar una propuesta para ti.',
  quoted: 'Tu solicitud ya fue cotizada. Revisa las cotizaciones enviadas por TUKNEX.',
  closed: 'Esta solicitud se ha cerrado. Puedes consultar aquí sus detalles y su PDF.',
};
export interface QuoteRequestRecordContext { busy: boolean; refresh: () => Promise<void>; }
export interface QuoteRequestsPanelProps {
  clientResource?:{resource:AccountResource<SavedQuoteRequest[]>;onRetry:()=>void};
  admin?: boolean;
  staff?: boolean;
  origin?: QuoteRequestOrigin;
  limit?: number;
  renderRecordActions?: (item: SavedQuoteRequest, context: QuoteRequestRecordContext) => ReactNode;
  renderRecordMetadata?: (item: SavedQuoteRequest) => ReactNode;
}
function createdDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
}
function estimateLabel(item: SavedQuoteRequest) {
  return item.result.custom ? 'Evaluación personalizada' : `${money(item.result.min)} – ${money(item.result.max)}`;
}
function requestSearch(item: SavedQuoteRequest) {
  return [item.number, item.clientName, item.clientEmail, item.values.name, item.values.email, item.values.businessName, item.result.label].filter(Boolean).join(' ');
}
function creatorRole(item: SavedQuoteRequest) {
  return item.createdByRole === 'admin' ? 'Administrador' : item.createdByRole === 'subadmin' ? 'Subadministrador' : item.createdByRole === 'client' ? 'Cliente' : '';
}
function RequestRow({ item, onOpen, onAssign }: { item: SavedQuoteRequest; onOpen: () => void; onAssign:()=>void }) {
  const needsClient=!!item.teamProjectId&&!item.clientId;
  return <article className="qrr-row" aria-label={'Solicitud ' + item.number}>
    <div className="qrr-row-project"><span className="qrr-row-label">Solicitud</span><strong>{item.values.businessName || item.result.label}</strong><span className="quote-request-number">{item.number}</span></div>
    <div className="qrr-row-client"><span className="qrr-row-label">Cliente</span><strong>{needsClient?'Sin cuenta asignada':item.clientName || item.values.name || 'Sin nombre indicado'}</strong><span>{needsClient?(item.values.name?'Contacto: '+item.values.name:'Atendida por el equipo'):item.clientEmail || item.values.email || 'Sin correo indicado'}</span>{needsClient&&<small>Lista para vincular con una cuenta</small>}</div>
    <div className="qrr-row-type"><span className="qrr-row-label">Tipo</span><span>{item.result.label}</span></div>
    <div className="qrr-row-status"><span className="qrr-row-label">Estado</span><StatusBadge status={item.status}/></div>
    <div className="qrr-row-amount"><span className="qrr-row-label">Estimación</span><strong>{estimateLabel(item)}</strong></div>
    <div className="qrr-row-date"><span className="qrr-row-label">Creada el</span><time dateTime={item.createdAt}>{createdDate(item.createdAt)}</time></div>
    <div className="qrr-row-actions">{needsClient&&<button className="platform-button qrr-assign" type="button" onClick={onAssign} aria-label={'Asignar cliente a '+item.number}><UserPlus size={15} aria-hidden="true"/>Asignar cliente</button>}{item.clientId&&<button className="platform-secondary qrr-client-assigned" type="button" onClick={onAssign} aria-label={'Ver cliente asignado a '+item.number}><UserCheck size={15} aria-hidden="true"/>Cliente asignado</button>}<button className="platform-secondary qrr-open" type="button" onClick={onOpen} aria-label={'Ver detalles de ' + item.number}>Ver detalles <ArrowUpRight size={15} aria-hidden="true"/></button></div>
  </article>;
}

export function QuoteRequestsPanel(props:QuoteRequestsPanelProps){
 return props.clientResource&&!props.admin&&!props.staff?<ClientQuoteRequests resource={props.clientResource.resource} onRetry={props.clientResource.onRetry} limit={props.limit}/>:<IndependentQuoteRequestsPanel {...props}/>;
}
function ClientQuoteRequests({resource,onRetry,limit}:{resource:AccountResource<SavedQuoteRequest[]>;onRetry:()=>void;limit?:number}){
 const [selectedId,setSelectedId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const records=resource.data||[],selected=records.find(item=>item.id===selectedId);
 async function download(item:SavedQuoteRequest){setBusy(true);setError('');try{const doc=await pdfBlob('account/quote-requests/'+item.id+'/pdf?preview=current');savePdf(doc.blob,doc.filename);}catch(e){setError(e instanceof Error?e.message:'No pudimos descargar la propuesta. Puedes intentarlo de nuevo.');}finally{setBusy(false);}}
 return <section className="portal-panel quote-requests-panel qrr-client-records" aria-label="Mis solicitudes del cotizador"><div className="quote-request-heading"><div><p className="platform-kicker">EL INICIO DE TU PROYECTO</p><h2>Mis solicitudes del cotizador</h2><p>Consulta tus ideas enviadas, su estimación y el seguimiento del equipo.</p></div><Link className="platform-secondary" href="/cotizar">Crear una solicitud</Link></div><AccountResourceFeedback resource={resource} onRetry={onRetry} label="solicitudes" announce={false}/>{error&&!selected&&<p className="platform-error" role="alert">{error}</p>}{resource.data&&<RecordList items={limit?records.slice(0,limit):records} getKey={item=>item.id} getSearchText={requestSearch} searchLabel="Buscar solicitudes por proyecto o número" emptyMessage="Aún no has enviado solicitudes. Puedes preparar tu idea en el cotizador." pageSize={10} renderItem={item=><div className="account-compact-row"><div><strong>{item.values.businessName||item.result.label}</strong><span>{item.number} · {createdDate(item.createdAt)}</span></div><StatusBadge status={item.status}/><strong>{estimateLabel(item)}</strong><button type="button" className="platform-secondary" onClick={()=>{setError('');setSelectedId(item.id);}}>Ver detalles<span className="sr-only"> de {item.number}</span></button></div>}/>}{selected&&<RecordDetail title={selected.values.businessName||selected.result.label} subtitle={selected.number} onClose={()=>setSelectedId(null)} actions={<button type="button" className="platform-secondary" disabled={busy} onClick={()=>void download(selected)}><Download size={16} aria-hidden="true"/>Descargar propuesta PDF</button>}><div className="qrr-detail-content">{error&&<p className="platform-error" role="alert">{error}</p>}<StatusBadge status={selected.status}/><p>{nextSteps[selected.status]}</p><div className="quote-request-summary"><div className="quote-request-estimate"><span>Inversión estimada</span><strong>{estimateLabel(selected)}</strong><small>Sujeta a revisión del alcance.</small></div><dl><div><dt>Preferencia de pago</dt><dd>{paymentPreferenceLabels[selected.values.paymentPreference||'unsure']}</dd></div><div><dt>Creada el</dt><dd>{createdDate(selected.createdAt)}</dd></div></dl></div><h3>Respuestas y alcance</h3><dl className="qrr-answer-grid">{quoteAnswers(selected.values).map((answer,index)=><div key={index}><dt>{answer.question}</dt><dd>{answer.value||'Sin indicar'}</dd></div>)}</dl></div></RecordDetail>}</section>;
}
function IndependentQuoteRequestsPanel({ admin = false, staff = false, origin = 'all', limit, renderRecordActions, renderRecordMetadata }: QuoteRequestsPanelProps) {
  const router=useRouter();
  const [contractDraft,setContractDraft]=useState<{draft:ContractDraft;data:BillingData;apiPath:string}|null>(null);
  const { user, ready } = useDemoAuth(), identity = user?.id, role = user?.role;
  const management = admin || staff;
  const panelTitle = !management ? 'Mis cotizaciones preliminares' : origin === 'mine' ? 'Mis cotizaciones' : origin === 'client' ? 'Solicitudes de clientes' : 'Solicitudes del cotizador';
  const panelDescription = origin === 'mine' ? 'Las cotizaciones que tú preparaste, con su cliente y seguimiento. Se mantienen aquí después de asignarlas.' : origin === 'client' ? 'Las propuestas enviadas desde las cuentas de tus clientes.' : 'Revisa el alcance y actualiza el seguimiento de cada solicitud.';
  const allowed = ready && !!identity && (staff ? role === 'admin' || role === 'subadmin' : role === (admin ? 'admin' : 'client'));
  const endpoint = (staff ? 'team' : admin ? 'billing' : 'account') + '/quote-requests';
  const scopeKey = endpoint + ':' + origin + ':' + (role || '') + ':' + (identity || '');
  const scope = useRef(scopeKey); scope.current = scopeKey;
  const epoch = useRef(0);
  const [items, setItems] = useState<SavedQuoteRequest[]>([]), [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null),[assignmentId,setAssignmentId]=useState<string|null>(null),[assignmentNotice,setAssignmentNotice]=useState('');
  const latestSelected=useRef(selectedId);latestSelected.current=selectedId;
  const [statusFilter, setStatusFilter] = useState('all'), [typeFilter, setTypeFilter] = useState('all'),[clientFilter,setClientFilter]=useState('all');
  const records = useMemo(() => allowed && loadedFor === scopeKey ? items.filter(item => matchesQuoteRequestOrigin(item, origin, identity)) : [], [allowed, loadedFor, scopeKey, items, origin, identity]);
  const selected = management ? records.find(item => item.id === selectedId) : undefined;
  const assignment=management?records.find(item=>item.id===assignmentId):undefined;
  const pendingClients=records.filter(item=>!!item.teamProjectId&&!item.clientId).length;
  const filtered = useMemo(() => records.filter(item => (statusFilter === 'all' || item.status === statusFilter) && (typeFilter === 'all' || item.values.projectType === typeFilter)&&(clientFilter==='all'||clientFilter==='pending'&&!!item.teamProjectId&&!item.clientId||clientFilter==='linked'&&!!item.clientId)), [records, statusFilter, typeFilter,clientFilter]);
  const summaryLimit = limit && limit > 0 ? limit : undefined;
  const linkNotice=usePrivateRecordLink({parameter:'solicitud',records,ready:management&&allowed&&loadedFor===scopeKey&&!loading&&!error,scopeKey,onOpen:item=>{setStatusFilter('all');setTypeFilter('all');setClientFilter('all');setSelectedId(item.id);}});

  const load = useCallback(async () => {
    const run = ++epoch.current;
    if (!allowed) { setItems([]); setLoadedFor(''); setLoading(false); return; }
    setLoading(true);
    try {
      const next = await billingRequest<SavedQuoteRequest[]>(endpoint);
      if (run === epoch.current && scope.current === scopeKey) {
        setItems(next); setLoadedFor(scopeKey); setError('');
        setSelectedId(current => current && next.some(item => item.id === current) ? current : null);
      }
    } catch (e) {
      if (run === epoch.current && scope.current === scopeKey) setError(e instanceof Error ? e.message : 'No pudimos cargar las solicitudes.');
    } finally { if (run === epoch.current && scope.current === scopeKey) setLoading(false); }
  }, [allowed, endpoint, scopeKey]);
  useEffect(() => {
    setContractDraft(null);setItems([]); setSelectedId(null);setAssignmentId(null);setAssignmentNotice(''); setBusy(false); setError(''); setStatusFilter('all'); setTypeFilter('all');setClientFilter('all');
    void load();
    const update = () => void load();
    window.addEventListener('focus', update); window.addEventListener('billing-change', update);
    return () => { epoch.current++; window.removeEventListener('focus', update); window.removeEventListener('billing-change', update); };
  }, [load]);
  async function download(id: string) {
    const actor = scopeKey; setBusy(true); setError('');
    try { const doc = await pdfBlob(endpoint + '/' + id + '/pdf?preview=current'); if (scope.current === actor) savePdf(doc.blob, doc.filename); }
    catch (e) { if (scope.current === actor) setError(e instanceof Error ? e.message : 'No se pudo descargar el PDF.'); }
    finally { if (scope.current === actor) setBusy(false); }
  }
  async function status(id: string, value: string) {
    const actor = scopeKey; setBusy(true); setError('');
    try { await billingRequest(endpoint + '/' + id, { method: 'PATCH', body: JSON.stringify({ status: value }) }); if (scope.current === actor) await load(); }
    catch (e) { if (scope.current === actor) setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { if (scope.current === actor) setBusy(false); }
  }
  async function prepareContract(item:SavedQuoteRequest,analysis?:AiEnvelope){
    const actor=scopeKey;setBusy(true);setError('');
    try{const draft=draftFromRequest(item,analysis),apiPath=item.teamProjectId?'team/projects/'+encodeURIComponent(item.teamProjectId):'billing';
      const data=item.teamProjectId?(await billingRequest<{data:BillingData}>(apiPath)).data:await billingRequest<BillingData>('billing/state');
      if(scope.current===actor&&latestSelected.current===item.id){setSelectedId(null);setContractDraft({draft,data,apiPath});}
    }catch(e){if(scope.current===actor)setError(e instanceof Error?e.message:'No pudimos preparar el contrato.');}finally{if(scope.current===actor)setBusy(false);}
  }
  const row = (item: SavedQuoteRequest) => <RequestRow item={item} onOpen={() => setSelectedId(item.id)} onAssign={()=>setAssignmentId(item.id)}/>;
  return <section className={'portal-panel quote-requests-panel' + (management ? ' qrr-management' : '')} aria-label={panelTitle}>
    <div className="quote-request-heading"><div><p className="platform-kicker">{management ? 'NUEVOS PROYECTOS' : 'EL INICIO DE TU PROYECTO'}</p><h2>{panelTitle}</h2><p>{management ? panelDescription : 'Consulta el estado, el importe estimado y las respuestas de cada propuesta.'}</p></div><div className="qrr-heading-actions">{management && <Link className="platform-button" href="/cotizar"><Plus size={16} aria-hidden="true"/>Cotizar para un cliente</Link>}<button className="platform-secondary" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true"/>Actualizar</button></div></div>
    {assignmentNotice&&<p className="platform-success" role="status">{assignmentNotice}</p>}
    {linkNotice&&<p className="platform-info" role="status">{linkNotice}</p>}
    {management&&records.length>0&&<div className="qrr-intake-status"><span><strong>{records.length}</strong> solicitudes</span><button type="button" aria-pressed={clientFilter==='pending'} onClick={()=>setClientFilter(value=>value==='pending'?'all':'pending')}><UserPlus size={16} aria-hidden="true"/>Por asignar <strong>{pendingClients}</strong></button><span><strong>{records.filter(item=>!!item.clientId).length}</strong> con cuenta de cliente</span></div>}
    {error && !selected && <p className="platform-error" role="alert">{error}</p>}
    {loading && !records.length ? <p role="status">Cargando solicitudes…</p> : allowed && !records.length && !error ? <div className="account-empty"><h3>{management ? origin === 'mine' ? 'Todavía no has creado cotizaciones.' : origin === 'client' ? 'Aún no recibiste solicitudes de clientes.' : 'Aún no hay solicitudes.' : 'Tu próximo proyecto empieza aquí.'}</h3><p>{management ? origin === 'mine' ? 'Prepara una cotización para un cliente y guárdala desde el último paso.' : 'Las propuestas guardadas aparecerán en esta sección.' : 'Guarda una propuesta desde el cotizador para seguir sus avances.'}</p>{!management && <Link className="platform-text-link" href="/cotizar">Crear una cotización</Link>}</div> : null}
    {management && records.length > 0 && <div className="qrr-records" aria-busy={loading}>
      {!summaryLimit && <div className="qrr-filters"><label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Tipo de proyecto<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">Todos los tipos</option>{PROJECT_TYPES.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Cuenta de cliente<select value={clientFilter} onChange={event=>setClientFilter(event.target.value)}><option value="all">Todas las solicitudes</option><option value="pending">Pendientes de asignar</option><option value="linked">Con cliente vinculado</option></select></label>{(statusFilter !== 'all' || typeFilter !== 'all'||clientFilter!=='all') && <button className="platform-text-link" type="button" onClick={() => { setStatusFilter('all'); setTypeFilter('all');setClientFilter('all'); }}>Limpiar filtros</button>}</div>}
      {summaryLimit ? <ul className="records-list-items qrr-summary-list">{records.slice(0, summaryLimit).map(item => <li key={item.id}>{row(item)}</li>)}</ul> : <RecordList items={filtered} getKey={item => item.id} getSearchText={requestSearch} renderItem={row} pageSize={25} searchLabel="Buscar por cliente, negocio o número" emptyMessage="No hay solicitudes con estos filtros."/>}
    </div>}
    {!management && <div className="quote-requests-list">{(summaryLimit ? records.slice(0, summaryLimit) : records).map(item => <article className="quote-request-card" key={item.id}>
      <div className="quote-request-heading"><div className="quote-request-identity"><span className="quote-request-number">{item.number}</span><h3>{item.values.businessName || item.result.label}</h3><p>{item.result.label}</p></div><StatusBadge status={item.status}/></div>
      <div className="quote-request-summary"><div className="quote-request-estimate"><span>Inversión estimada</span><strong>{estimateLabel(item)}</strong><small>Sujeta a revisión del alcance.</small></div><dl><div><dt><CalendarDays size={15} aria-hidden="true"/>Creada el</dt><dd>{createdDate(item.createdAt)}</dd></div><div><dt>Preferencia de pago</dt><dd>{paymentPreferenceLabels[item.values.paymentPreference || 'unsure']}</dd></div></dl></div>
      <p className="quote-request-offering">{item.values.offering}</p><p className="quote-request-next">{nextSteps[item.status]}</p>
      <details><summary>Ver respuestas y alcance <ChevronDown size={17} aria-hidden="true"/></summary><dl>{quoteAnswers(item.values).map((answer, index) => <div key={index}><dt>{answer.question}</dt><dd>{answer.value || 'Sin indicar'}</dd></div>)}</dl></details>
      <div className="quote-request-actions"><button className="platform-secondary" disabled={busy} onClick={() => void download(item.id)}><Download size={16} aria-hidden="true"/>Descargar propuesta PDF</button></div>
    </article>)}</div>}
    {management && summaryLimit && records.length > summaryLimit && <Link className="platform-text-link" href={origin === 'mine' ? staff ? '/equipo/mis-cotizaciones' : '/admin/mis-cotizaciones' : staff ? '/equipo' : '/admin/solicitudes'}>Ver todas las solicitudes ({records.length})</Link>}
    {assignment&&<RecordDetail title={assignment.clientId ? 'Cliente asignado' : 'Asignar cotización a un cliente'} subtitle={assignment.number+' · '+(assignment.values.businessName||assignment.result.label)} className="quote-request-record" onClose={()=>setAssignmentId(null)}><QuoteClientAssignment key={'assign:'+assignment.id} request={assignment} disabled={busy} onLinked={async saved=>{await load();setAssignmentId(null);setAssignmentNotice('Cotización '+saved.number+' asignada a '+(saved.clientName||'la cuenta seleccionada')+'.');}}/></RecordDetail>}
    {selected && <RecordDetail title={selected.values.businessName || selected.result.label} subtitle={<>{selected.number} · {selected.result.label} · {createdDate(selected.createdAt)}</>} className="quote-request-record" onClose={() => setSelectedId(null)} actions={<>
      <button className="platform-secondary" type="button" disabled={busy} onClick={() => void download(selected.id)}><Download size={16} aria-hidden="true"/>Descargar propuesta PDF</button>
      <label className="qrr-status-control">Seguimiento<select aria-label={'Estado de ' + selected.number} disabled={busy} value={selected.status} onChange={event => void status(selected.id, event.target.value)}>{Object.entries(requestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="platform-button" type="button" disabled={busy||!selected.clientId} onClick={()=>void prepareContract(selected)}>Preparar contrato</button>
      {renderRecordActions?.(selected, { busy, refresh: load })}
    </>}>
      <div className="qrr-detail-content">
        {error && <p className="platform-error" role="alert">{error}</p>}
        <div className="qrr-detail-state"><StatusBadge status={selected.status}/><p>{nextSteps[selected.status]}</p></div>
        <div className="quote-request-summary"><div className="quote-request-estimate"><span>Inversión estimada</span><strong>{estimateLabel(selected)}</strong><small>Sujeta a revisión del alcance.</small></div><dl><div><dt>{selected.clientId ? 'Cliente vinculado' : 'Cliente indicado'}</dt><dd>{selected.clientName || selected.values.name || 'Sin indicar'}<br/>{selected.clientEmail || selected.values.email || 'Sin correo indicado'}</dd></div><div><dt>Preferencia de pago</dt><dd>{paymentPreferenceLabels[selected.values.paymentPreference || 'unsure']}</dd></div><div><dt>Creada el</dt><dd>{createdDate(selected.createdAt)}</dd></div><div><dt>Última actualización</dt><dd>{createdDate(selected.updatedAt)}</dd></div></dl></div>
        <dl className="qrr-origin-grid"><div><dt>Registrada por</dt><dd>{selected.createdByName || 'Sin autor registrado'}{creatorRole(selected) && <span> · {creatorRole(selected)}</span>}</dd></div><div><dt>Origen</dt><dd>{selected.createdByRole === 'client' ? 'Enviada desde la cuenta del cliente' : selected.createdByRole === 'admin' || selected.createdByRole === 'subadmin' ? 'Registrada por el equipo' : 'Registro anterior'}</dd></div>{selected.teamProjectId && <div><dt>Responsable del proyecto</dt><dd>{selected.assigneeName || 'Sin asignar'}</dd></div>}{selected.linkedAt && <div><dt>Vinculada el</dt><dd>{createdDate(selected.linkedAt)}</dd></div>}</dl>
        {renderRecordMetadata?.(selected)}
        <QuoteClientAssignment key={'assignment:'+selected.id} request={selected} disabled={busy} onLinked={async () => { await load(); }}/>
        <section className="qrr-detail-section"><h3>Lo que necesita el cliente</h3><p className="quote-request-offering">{selected.values.offering || 'Sin indicar'}</p></section>
        <section className="qrr-detail-section"><h3>Respuestas y alcance</h3><dl className="qrr-answer-grid">{quoteAnswers(selected.values).map((answer, index) => <div key={index}><dt>{answer.question}</dt><dd>{answer.value || 'Sin indicar'}</dd></div>)}</dl></section>
        {staff ? selected.teamProjectId && <QuoteTeamNexiAi key={'nexi:'+selected.id} workId={selected.teamProjectId} requestId={selected.id} values={selected.values} sourceRevision={selected.revision} disabled={busy} onPrepareContract={analysis=>prepareContract(selected,analysis)} prepareContractDisabledReason={!selected.clientId?'Asigna primero una cuenta de cliente.':undefined}/> : <QuoteRequestNexiAi key={'nexi:'+selected.id} id={selected.id} values={selected.values} sourceRevision={selected.revision} disabled={busy} onPrepareContract={analysis=>prepareContract(selected,analysis)} prepareContractDisabledReason={!selected.clientId?'Asigna primero una cuenta de cliente.':undefined}/>}
      </div>
    </RecordDetail>}
    {contractDraft&&<ContractDraftDialog {...contractDraft} onClose={()=>setContractDraft(null)} onSaved={async id=>{setContractDraft(null);window.dispatchEvent(new Event('billing-change'));await load();if(admin&&id)router.push('/admin/contratos?contrato='+encodeURIComponent(id));else setAssignmentNotice('Contrato guardado. Revisa y envía el documento desde el proyecto del equipo.');}}/>}
  </section>;
}
export function QuoteRequestsAdmin({origin='client'}:{origin?:'client'|'mine'}) {
  const title=origin==='mine'?'Mis cotizaciones':'Solicitudes de clientes';
  return <RoleGate allowed={['admin']}><AccountShell admin title={title}><h1 className="sr-only">{title}</h1><nav className="qrr-origin-navigation" aria-label="Origen de las cotizaciones"><Link href="/admin/solicitudes" aria-current={origin==='client'?'page':undefined}>Solicitudes de clientes</Link><Link href="/admin/mis-cotizaciones" aria-current={origin==='mine'?'page':undefined}>Mis cotizaciones</Link><Link href="/admin/cotizaciones">Cotizaciones formales</Link></nav><QuoteRequestsPanel admin origin={origin}/>{origin==='client'&&<details className="qrr-history-disclosure"><summary>Consultar avances compartidos anteriores</summary><QuoteDraftsAdminPanel/></details>}</AccountShell></RoleGate>;
}

export function QuoteRequestsTeamMine() {
  return <RoleGate allowed={['subadmin']}><AccountShell team title="Mis cotizaciones"><h1 className="sr-only">Mis cotizaciones</h1><QuoteRequestsPanel staff origin="mine"/></AccountShell></RoleGate>;
}
