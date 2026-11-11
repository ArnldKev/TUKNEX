'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {linkedRecord,privateRecordTarget,type PrivateRecordTarget} from './private-record-link';
/** Resolves once per identity/link after a successful authorized load. Closing stays closed on refresh. */
export function usePrivateRecordLink<T extends{id:string}>({parameter,records,ready,scopeKey,onOpen}:{parameter:string;records:readonly T[];ready:boolean;scopeKey:string;onOpen:(record:T)=>void}){
 const [target,setTarget]=useState<PrivateRecordTarget>({kind:'none'}),[message,setMessage]=useState({scope:'',text:''});
 const handled=useRef(''),open=useRef(onOpen);open.current=onOpen;
 const sync=useCallback(()=>{const next=privateRecordTarget(window.location.search,parameter);setTarget(current=>current.kind===next.kind&&(current.kind!=='record'||next.kind==='record'&&current.id===next.id)?current:next);},[parameter]);
 useEffect(()=>{sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[sync]);
 useEffect(()=>{sync();});
 useEffect(()=>{if(target.kind==='none'){handled.current='';setMessage(current=>current.text?{scope:scopeKey,text:''}:current);return;}if(!ready)return;const token=scopeKey+'|'+parameter+'|'+(target.kind==='record'?target.id:'invalid');if(handled.current===token)return;handled.current=token;const record=linkedRecord(records,target);if(record){setMessage({scope:scopeKey,text:''});open.current(record);}else setMessage({scope:scopeKey,text:target.kind==='invalid'?'El enlace del aviso no es válido. Puedes buscar el registro en la lista.':'El registro del aviso ya no está disponible en esta sección o en tu cuenta. Actualiza la lista o consulta al administrador.'});},[parameter,ready,records,scopeKey,target]);
 return message.scope===scopeKey?message.text:'';
}
