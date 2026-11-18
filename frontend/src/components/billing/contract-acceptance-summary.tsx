import {contractStatusLabel,type Contract} from '@/lib/billing/types';

const localDate = new Intl.DateTimeFormat('es-PE', {dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'});

export function ContractAcceptanceSummary({contract}:{contract:Contract}){
  const evidence=contract.clientAcceptance;
  const delivery=contract.delivery;
  const online=contract.signatureMode==='online';
  const pending=online&&!evidence&&['enviado','firmado_tuknex'].includes(contract.status);

  return <section className="billing-detail billing-contract-summary" aria-label="Envío y aceptación del contrato">
    <div>
      <h3>{contractStatusLabel(contract)}</h3>
      <p>{online?'Contrato virtual · aceptación desde la cuenta del cliente':'Contrato presencial o con firma externa'}</p>
    </div>
    {contract.status==='borrador'&&<p>El cliente verá el acuerdo después de que confirmes el envío.</p>}
    {delivery&&<dl className="billing-record-fields">
      <div><dt>{delivery.recipientUserId?'Cuenta destinataria registrada':'Entrega'}</dt><dd>{delivery.recipientName||'Envío externo'}</dd></div>
      <div><dt>Enviado el</dt><dd>{localDate.format(new Date(delivery.sentAt))}</dd></div>
      <div><dt>Versión de envío</dt><dd>{delivery.sentVersion}</dd></div>
    </dl>}
    {pending&&<p>El titular puede abrir el PDF vigente y aceptar desde Mis proyectos y pagos.</p>}
    {!delivery&&contract.status!=='borrador'&&<p>Este registro anterior conserva su estado. La fecha y el destinatario del envío no están registrados.</p>}
    {evidence?<><h4>Aceptación registrada</h4><dl className="billing-record-fields">
      <div><dt>Aceptado por</dt><dd>{evidence.signerName}</dd></div>
      <div><dt>Fecha y hora</dt><dd>{localDate.format(new Date(evidence.acceptedAt))}</dd></div>
      <div><dt>Versión aceptada</dt><dd>{evidence.acceptedVersion}</dd></div>
    </dl><details><summary>Ver constancia de la versión aceptada</summary><p>{evidence.consentText}</p><p>Huella SHA-256 del PDF</p><code className="billing-contract-hash">{evidence.documentSha256}</code></details></>:
    !online&&(contract.clientSignedAt||contract.issuerSignedAt)&&<dl className="billing-record-fields">
      {contract.clientSignedAt&&<div><dt>Firma del cliente registrada</dt><dd>{localDate.format(new Date(contract.clientSignedAt))}</dd></div>}
      {contract.issuerSignedAt&&<div><dt>Firma de TUKNEX registrada</dt><dd>{localDate.format(new Date(contract.issuerSignedAt))}</dd></div>}
    </dl>}
    {(contract.sourceRequestId||contract.sourceQuoteId)&&<p>Origen conservado: {contract.sourceRequestId?'solicitud del cotizador, revisión '+contract.sourceRequestRevision:'cotización formal, versión '+contract.sourceQuoteVersion}.</p>}
  </section>;
}
