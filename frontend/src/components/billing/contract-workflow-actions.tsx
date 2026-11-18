'use client';

import {useState} from 'react';
import {Send} from 'lucide-react';
import {billingRequest} from '@/lib/billing/api';
import {contractTransitions,statusLabels,type Contract,type ContractStatus} from '@/lib/billing/types';
import {ClientAccountAssociation} from './client-account-association';

type DeliveryPreview = {version:number;recipient:{id:string;name:string;email:string}|null;issues:string[]};
export type ContractStatusChange = {status:ContractStatus;version:number;recipientUserId?:string|null};

export function ContractWorkflowActions({contract,deliveryPath,busy,onStatus,allowAssociation=false}: {
  contract:Contract;
  deliveryPath:string;
  busy:boolean;
  onStatus:(change:ContractStatusChange)=>boolean|Promise<boolean>;
  allowAssociation?:boolean;
}) {
  const [preview,setPreview]=useState<DeliveryPreview|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const canSend=contract.status==='borrador';
  const options=contractTransitions[contract.status].filter(status=>
    status!=='enviado' && !(contract.signatureMode==='online' && status==='firmado_cliente') &&
    (status!=='activo' || !!(contract.clientSignedAt && contract.issuerSignedAt)),
  );

  async function review(){
    setLoading(true);
    setError('');
    try{
      const data=await billingRequest<DeliveryPreview>(deliveryPath,{signal:AbortSignal.timeout(15000)});
      if(data.version!==contract.version) throw Error('El borrador cambió. Actualiza el detalle antes de enviarlo.');
      setPreview(data);
    }catch(cause){
      setPreview(null);
      setError(cause instanceof Error?cause.message:'No se pudo revisar el envío.');
    }finally{setLoading(false);}
  }

  async function send(){
    if(!preview||preview.issues.length||busy||loading)return;
    if(await onStatus({status:'enviado',version:preview.version,recipientUserId:preview.recipient?.id||null})){
      setPreview(null);
    }
  }

  return <div className="billing-contract-workflow">
    {canSend&&<section className="billing-detail billing-contract-send">
      <h3>Enviar al cliente</h3>
      {error&&<p className="platform-error" role="alert">{error}</p>}
      {!preview?<><p>Revisa la cuenta destinataria y los datos del acuerdo antes de confirmar el envío.</p>
        <button type="button" className="platform-button" disabled={busy||loading} onClick={()=>void review()}><Send size={16} aria-hidden="true"/>{loading?'Comprobando datos…':'Revisar envío'}</button></>:
      <>
        {preview.recipient?<p><strong>Cuenta destinataria:</strong> {preview.recipient.name} · {preview.recipient.email}</p>:
          <p>{contract.signatureMode==='online'?'La ficha no tiene una cuenta activa disponible.':'La ficha no tiene una cuenta activa. Puedes registrar que entregaste el documento por fuera de TUKNEX.'}</p>}
        {!!preview.issues.length&&<ul className="billing-contract-send-issues">{preview.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
        {allowAssociation&&contract.signatureMode==='online'&&!preview.recipient&&<ClientAccountAssociation clientId={contract.clientId} onChanged={review}/>}
        {!allowAssociation&&contract.signatureMode==='online'&&!preview.recipient&&<p>El administrador principal puede revisar y vincular la cuenta desde Clientes.</p>}
        {!preview.issues.length&&<p>{preview.recipient?'La cuenta podrá abrir el PDF desde Mis proyectos y pagos y recibirá un aviso en TUKNEX.':'Confirma el envío cuando ya hayas entregado el contrato al cliente.'}</p>}
        <div className="billing-toolbar">
          <button type="button" className="platform-button" disabled={busy||loading||!!preview.issues.length} onClick={()=>void send()}>{busy?'Guardando…':preview.recipient?'Confirmar envío al cliente':'Registrar envío externo'}</button>
          <button type="button" className="platform-secondary" disabled={busy||loading} onClick={()=>void review()}>Volver a comprobar</button>
          <button type="button" className="platform-secondary" disabled={busy||loading} onClick={()=>setPreview(null)}>Cerrar revisión</button>
        </div>
      </>}
    </section>}
    {options.length>0&&<form className="billing-status-form" onSubmit={event=>{
      event.preventDefault();
      const state=new FormData(event.currentTarget).get('status');
      const status=options.find(option=>option===state);
      if(status)void onStatus({status,version:contract.version});
    }}>
      <label>Registrar siguiente estado
        <select name="status" defaultValue="" required disabled={busy}>
          <option value="" disabled>Seleccionar estado</option>
          {options.map(status=><option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
      </label>
      <button disabled={busy} className="platform-secondary">Actualizar estado</button>
    </form>}
  </div>;
}
