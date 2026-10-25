'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square,AudioLines} from 'lucide-react';
import {AUDIO_FIELDS,AUDIO_MAX_BYTES,AUDIO_MAX_SECONDS,type AudioField,type AudioAnswer} from '@/lib/quote/audio';
import {AudioCapture,canRecordAudio,type CaptureState} from '@/lib/quote/audio-capture';
import {getAudioConfig,transcribeAnswer,organizeAnswer} from '@/lib/quote/audio-api';
import {useQuoteProjectSession} from './project-session';
import './quote-audio.css';
type Phase=CaptureState|'transcribing'|'review'|'organizing';
export function QuoteAudio({disabled=false,initialField='offering'}:{disabled?:boolean;initialField?:AudioField}){
 const {history,applyAudio,error:historyError}=useQuoteProjectSession();
 const [enabled,setEnabled]=useState<boolean|null>(null),[configError,setConfigError]=useState(''),[supported,setSupported]=useState(false);
 const [field,setField]=useState<AudioField>(initialField),[phase,setPhase]=useState<Phase>('idle');
 const [blob,setBlob]=useState<Blob|null>(null),[url,setUrl]=useState(''),[consent,setConsent]=useState(false),[orderConsent,setOrderConsent]=useState(false);
 const [recognized,setRecognized]=useState(''),[literal,setLiteral]=useState(''),[ordered,setOrdered]=useState(''),[orderedFrom,setOrderedFrom]=useState(''),[warnings,setWarnings]=useState<string[]>([]);
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const capture=useRef<AudioCapture|null>(null),request=useRef<AbortController|null>(null),generation=useRef(0);
 const base=useRef<Pick<AudioAnswer,'projectId'|'baseRevision'>>({projectId:history.present.id,baseRevision:history.present.revision});
 const configGeneration=useRef(0);
 const busy=phase==='transcribing'||phase==='organizing',recording=phase==='recording'||phase==='requesting';
 const stale=base.current.projectId!==history.present.id||base.current.baseRevision!==history.present.revision;
 async function loadConfig(signal:AbortSignal){
  const id=++configGeneration.current;setConfigError('');setEnabled(null);
  try{const config=await getAudioConfig(signal);if(!signal.aborted&&id===configGeneration.current)setEnabled(config.enabled);}
  catch{if(id===configGeneration.current)setConfigError('No pudimos comprobar el audio. Puedes seguir escribiendo o volver a comprobar.');}
 }
 useEffect(()=>{
  setSupported(canRecordAudio());const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);void loadConfig(controller.signal);
  capture.current=new AudioCapture({onState:setPhase,onReady:value=>{setBlob(value);setMessage('Audio listo. Escúchalo antes de transcribir.');},onError:setError});
  const current=capture.current;
  const hidden=()=>{if(document.hidden)current.stop();};document.addEventListener('visibilitychange',hidden);
  return()=>{configGeneration.current++;clearTimeout(timer);controller.abort();generation.current++;request.current?.abort();current.dispose();document.removeEventListener('visibilitychange',hidden);};
 },[]);
 useEffect(()=>{if(!blob){setUrl('');return;}const value=URL.createObjectURL(blob);setUrl(value);return()=>URL.revokeObjectURL(value);},[blob]);
 useEffect(()=>{if(phase!=='recording')return;const started=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.min(AUDIO_MAX_SECONDS,Math.floor((Date.now()-started)/1000))),500);return()=>clearInterval(timer);},[phase]);
 function clear(){
  generation.current++;request.current?.abort();request.current=null;capture.current?.cancel();setPhase('idle');setBlob(null);setConsent(false);setOrderConsent(false);setRecognized('');setLiteral('');setOrdered('');setOrderedFrom('');setWarnings([]);setError('');setMessage('');
 }
 useEffect(()=>{if(disabled){generation.current++;request.current?.abort();capture.current?.cancel(false);setPhase(p=>p==='requesting'||p==='recording'?'idle':p==='transcribing'?'ready':p==='organizing'?'review':p);}},[disabled]);
 function start(){clear();base.current={projectId:history.present.id,baseRevision:history.present.revision};void capture.current?.start();}
 async function process(kind:'transcribe'|'organize'){
  if(disabled||busy||kind==='transcribe'&&(!blob||!consent)||kind==='organize'&&(!orderConsent||!literal.trim()||literal.length>3000))return;
  const id=++generation.current,controller=new AbortController();request.current=controller;
  const timer=setTimeout(()=>controller.abort(),30000);
  setPhase(kind==='transcribe'?'transcribing':'organizing');setError('');setMessage('');
  try{
   if(kind==='transcribe'){
    const result=await transcribeAnswer(blob!,field,controller.signal);
    if(id!==generation.current)return;
    setRecognized(result.text);setLiteral(result.text);setConsent(false);setPhase('review');setMessage('Revisa nombres, cantidades y negaciones antes de usar el texto.');
   }else{
    const result=await organizeAnswer(literal,field,controller.signal);
    if(id!==generation.current)return;
    setOrdered(result.text);setOrderedFrom(literal);setWarnings(result.warnings);setOrderConsent(false);setPhase('review');setMessage('NEXI propuso una redacción. Compárala con la transcripción.');
   }
  }catch(e){if(id===generation.current){setPhase(kind==='transcribe'?'ready':'review');setError(controller.signal.aborted?'Se canceló o agotó el tiempo. El formulario no cambió; puedes volver a intentarlo.':e instanceof Error?e.message:'No pudimos procesar el audio.');}}
  finally{clearTimeout(timer);if(request.current===controller)request.current=null;}
 }
 function accept(text:string,organized:boolean){
  if(stale||disabled||historyError)return;
  if(applyAudio({...base.current,field,text,organized})){clear();setMessage('Respuesta incorporada. Puedes deshacerla en el historial.');}
  else setError('No se incorporó el texto: hubo cambios o respuestas fuera de límite. Conserva tu texto y revisa el formulario.');
 }
 const limit=AUDIO_FIELDS[field].max,locked=disabled||recording||busy||phase==='ready'||phase==='review';
 return <details className="quote-audio" onToggle={event=>{if(!event.currentTarget.open){clear();}}}>
  <summary><AudioLines size={20} aria-hidden="true"/><span>Prefiero contarlo por audio <small>Opcional · hasta 1 minuto</small></span></summary>
  <div className="quote-audio-body">
   <p>Cuéntanos tu idea, revisa el texto y decide qué incorporar al boceto. También puedes seguir escribiendo en las preguntas.</p>
   {enabled===null&&!configError&&<p role="status">Comprobando audio…</p>}
   {configError&&<><p role="alert">{configError}</p><button type="button" onClick={()=>{const c=new AbortController();const timer=setTimeout(()=>c.abort(),8000);void loadConfig(c.signal).finally(()=>clearTimeout(timer));}}>Volver a comprobar audio</button></>}
   {enabled===false&&<p role="status">El audio todavía no está activado. Todas las preguntas se pueden responder por escrito.</p>}
   {enabled&&<>
    <label className="quote-field" htmlFor="audio-answer-field"><span>¿Qué respuesta vas a dictar?</span><select id="audio-answer-field" value={field} disabled={locked} onChange={e=>{clear();setField(e.target.value as AudioField);}}>{Object.entries(AUDIO_FIELDS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
    <p className="quote-audio-help">No dictes contraseñas, DNI ni datos de otras personas. El micrófono solo se activa al pulsar «Grabar» y aceptar el permiso del navegador.</p>
    {(phase==='idle'||phase==='ready'||phase==='review')&&<div className="quote-audio-actions">
     <button type="button" disabled={disabled||!supported} onClick={start}><Mic size={17} aria-hidden="true"/>{blob?'Volver a grabar':'Grabar respuesta'}</button>
     {phase==='idle'&&<label className="quote-audio-upload">O sube un audio corto<input type="file" accept="audio/webm,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/x-wav,.m4a" disabled={disabled} onChange={event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;clear();
      if(file.size>AUDIO_MAX_BYTES||!file.size){setError('Elige un audio de hasta 4 MB y 60 segundos.');return;}
      if(!['audio/webm','audio/mp4','audio/x-m4a','audio/ogg','audio/wav','audio/x-wav'].includes(file.type)){setError('Usa WebM, MP4/M4A, Ogg o WAV.');return;}
      base.current={projectId:history.present.id,baseRevision:history.present.revision};setBlob(file);setPhase('ready');setMessage('Audio listo para revisar. Debe durar como máximo 60 segundos.');
     }}/></label>}
    </div>}
    {!supported&&<p className="quote-audio-help">Este navegador no permite grabar aquí. Puedes subir un audio o responder por escrito.</p>}
    {recording&&<><p role="status">{phase==='requesting'?'Esperando permiso del micrófono…':'Grabando · '+elapsed+' / 60 segundos'}</p><div className="quote-audio-actions">{phase==='recording'&&<button type="button" onClick={()=>capture.current?.stop()}><Square size={16} aria-hidden="true"/> Detener grabación</button>}<button type="button" onClick={()=>{clear();setMessage('Grabación cancelada. No enviamos audio.');}}>Cancelar grabación</button></div></>}
    {url&&<audio aria-label="Escuchar tu respuesta grabada" controls src={url} preload="metadata"/>}
    {phase==='ready'&&<><label className="quote-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Autorizo enviar este audio a Groq para transcribirlo. TUKNEX no guarda la grabación.</span></label><div className="quote-audio-actions"><button type="button" disabled={!consent||disabled} onClick={()=>void process('transcribe')}>Transcribir audio</button><button type="button" onClick={()=>{clear();setMessage('Audio descartado.');}}>Descartar audio</button></div></>}
    {recognized&&<div className="quote-audio-review">
     <h4>Primero, revisa lo que se entendió</h4><details><summary>Ver transcripción recibida</summary><p>{recognized}</p></details>
     <label className="quote-field" htmlFor="audio-literal"><span>Transcripción para corregir</span><textarea id="audio-literal" className="resize-none" rows={5} value={literal} disabled={busy||disabled} onChange={e=>{setLiteral(e.target.value);setOrderConsent(false);}}/></label>
     <p className="quote-audio-help">{literal.length} / {limit} caracteres para esta respuesta. Corrige nombres, cantidades y fechas. Reemplazará el contenido actual de «{AUDIO_FIELDS[field].label}».</p>
     {literal.length>limit&&<p role="alert">Acorta el texto antes de incorporarlo; no lo recortaremos automáticamente.</p>}
     <div className="quote-audio-actions"><button type="button" disabled={busy||disabled||stale||!!historyError||!literal.trim()||literal.length>limit} onClick={()=>accept(literal,false)}>Usar mi transcripción</button></div>
     <label className="quote-consent"><input type="checkbox" checked={orderConsent} disabled={busy||disabled} onChange={e=>setOrderConsent(e.target.checked)}/><span>Autorizo enviar este texto corregido a Groq para proponer una redacción más clara.</span></label>
     <button type="button" disabled={busy||disabled||!orderConsent||!literal.trim()||literal.length>3000||stale} onClick={()=>void process('organize')}>Ordenar texto con NEXI</button>
     {ordered&&<div className="quote-audio-proposal"><h4>Propuesta de NEXI · por revisar</h4>{warnings.map((warning,i)=><p key={i}>{warning}</p>)}<label className="quote-field" htmlFor="audio-ordered"><span>Texto ordenado, también editable</span><textarea id="audio-ordered" className="resize-none" rows={5} value={ordered} disabled={busy||disabled} onChange={e=>setOrdered(e.target.value)}/></label><p className="quote-audio-help">{ordered.length} / {limit} caracteres. Compara con la transcripción; NEXI puede equivocarse.</p>{orderedFrom!==literal&&<p role="alert">Cambiaste la transcripción después de ordenar. Solicita una nueva propuesta.</p>}<button type="button" disabled={busy||disabled||stale||!!historyError||orderedFrom!==literal||!ordered.trim()||ordered.length>limit} onClick={()=>accept(ordered,true)}>Usar texto ordenado</button></div>}
    </div>}
    {busy&&<><p role="status">{phase==='transcribing'?'Transcribiendo audio…':'Ordenando el texto con NEXI…'}</p><button type="button" onClick={()=>{generation.current++;request.current?.abort();setPhase(recognized?'review':'ready');setConsent(false);setOrderConsent(false);setMessage('Consulta cancelada. No cambiamos tu respuesta. El intento puede consumir cuota.');}}>Cancelar consulta de audio</button></>}
    {recognized&&!busy&&<button type="button" onClick={()=>{clear();setMessage('Revisión descartada. El formulario no cambió.');}}>Descartar revisión de audio</button>}
    {(recognized||blob)&&stale&&<p role="alert">El proyecto cambió durante esta revisión. No reemplazaremos respuestas nuevas; copia tu texto si lo necesitas y vuelve a empezar.</p>}
    <p className="quote-audio-help">WebM, MP4/M4A, Ogg o WAV · 4 MB máximo. Hasta 5 transcripciones y 5 redacciones al día por visitante; los intentos pueden consumir cuota. Al cerrar este apartado, descartar o salir se elimina la copia local; solo el texto que confirmes se incorpora al proyecto.</p>
   </>}
   {error&&<p role="alert" className="quote-audio-error">{error}</p>}
   <p role="status" aria-live="polite">{message}</p>
  </div>
 </details>;
}

