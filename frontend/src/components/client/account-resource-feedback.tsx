'use client';
import Link from 'next/link';
import {RefreshCw} from 'lucide-react';
import {accountDateTime,accountRefreshLabel,type AccountResource} from '@/lib/client/account-resources';
export function AccountResourceFeedback({resource,onRetry,label='Información',announce=true}:{resource:AccountResource<unknown>;onRetry:()=>void;label?:string;announce?:boolean}){
 return <div className="account-resource-feedback" aria-busy={resource.loading}>
 {resource.error?<div className="account-resource-error" role={announce?'alert':undefined}><strong>{accountRefreshLabel(resource)}</strong><p>{resource.error}</p>{resource.data!==null&&<p>Mostramos los últimos datos disponibles{resource.updatedAt?' del '+accountDateTime(resource.updatedAt):''}; todavía no se han actualizado.</p>}{resource.failure==='expired'?<Link className="platform-secondary" href="/acceder">Volver a iniciar sesión</Link>:<button type="button" className="platform-secondary" disabled={resource.loading} onClick={onRetry}><RefreshCw size={16} aria-hidden="true"/>Reintentar {label.toLowerCase()}</button>}</div>:<p className="account-resource-updated" role={announce?'status':undefined}>{accountRefreshLabel(resource)}{resource.updatedAt&&!resource.loading?' · '+accountDateTime(resource.updatedAt):''}{resource.loading&&resource.data?' Conservamos los últimos datos mientras se completa la consulta.':''}</p>}
 </div>;
}
