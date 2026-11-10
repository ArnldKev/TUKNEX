'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useAccessibleModal} from '@/components/auth/use-accessible-modal';
import type {BillingData} from '@/lib/billing/types';
import type {ContractDraft} from '@/lib/billing/contract-draft';
import {DocumentEditor} from './document-forms';
import './billing.css';

export function ContractDraftDialog({draft,data,apiPath='billing',onClose,onSaved}:{draft:ContractDraft;data:BillingData;apiPath?:string;onClose:()=>void;onSaved:(id?:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),title=useId(),[mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 useAccessibleModal(mounted,onClose,ref);
 if(!mounted)return null;
 return createPortal(<div className="platform-modal-backdrop billing-backdrop"><div ref={ref} className="platform-modal billing-modal" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1}><header><h2 id={title}>Preparar contrato</h2><button className="platform-secondary" type="button" onClick={onClose} aria-label="Cerrar borrador de contrato"><X size={20}/></button></header><p>Revisa la información y acuerda los términos antes de guardar. Después podrás enviar el documento al cliente.</p>{draft.analysis&&<details><summary>Consultar el análisis completo de NEXI</summary><p>{draft.analysis.report.summary}</p>{[{label:'Alcance propuesto',items:draft.analysis.report.scope},{label:'Exclusiones propuestas',items:draft.analysis.report.exclusions},{label:'Preguntas por resolver',items:draft.analysis.report.questions},{label:'Dependencias y riesgos',items:draft.analysis.report.risks},{label:'Criterios por revisar',items:draft.analysis.report.acceptanceCriteria}].map(group=><section key={group.label}><h3>{group.label}</h3><ul>{group.items.map((item,index)=><li key={index}>{item}</li>)}</ul></section>)}<p>{draft.analysis.report.visualDirection}</p><ul>{draft.analysis.report.suggestions.map((suggestion,index)=><li key={index}>{suggestion.title}: {suggestion.reason}</li>)}</ul></details>}<DocumentEditor key={draft.source.id+':'+draft.source.revision+':'+(draft.analysis?.id||'original')} kind="contract" data={data} draft={draft} apiPath={apiPath} onDone={onSaved}/></div></div>,document.body);
}
