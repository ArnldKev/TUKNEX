import {AUDIO_MAX_BYTES,AUDIO_MAX_SECONDS} from './audio';
export type CaptureState='idle'|'requesting'|'recording'|'ready';
interface Stream {getTracks():{stop():void}[]}
interface Recorder {state:string;mimeType:string;ondataavailable:((event:{data:Blob})=>void)|null;onstop:(()=>void)|null;onerror:(()=>void)|null;start(timeslice:number):void;stop():void}
interface CaptureEnvironment {getStream():Promise<Stream>;createRecorder(stream:Stream):Recorder;now():number;every(callback:()=>void):ReturnType<typeof setInterval>;clear(timer:ReturnType<typeof setInterval>):void}
interface Callbacks {onState(state:CaptureState):void;onReady(blob:Blob):void;onError(message:string):void}
export function canRecordAudio(){return typeof window!=='undefined'&&window.isSecureContext&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';}
function browserEnvironment():CaptureEnvironment{
 return {getStream:()=>navigator.mediaDevices.getUserMedia({audio:true}),createRecorder:stream=>{
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(value=>MediaRecorder.isTypeSupported(value));
  if(!mime)throw Error('unsupported');
  return new MediaRecorder(stream as MediaStream,{mimeType:mime,audioBitsPerSecond:64000}) as unknown as Recorder;
 },now:()=>performance.now(),every:callback=>setInterval(callback,200),clear:timer=>clearInterval(timer)};
}
export class AudioCapture{
 private run=0;private stream?:Stream;private recorder?:Recorder;private timer?:ReturnType<typeof setInterval>;private active=false;
 constructor(private callbacks:Callbacks,private env:CaptureEnvironment=browserEnvironment()){}
 private release(){if(this.timer!==undefined)this.env.clear(this.timer);this.timer=undefined;this.stream?.getTracks().forEach(track=>track.stop());this.stream=undefined;}
 async start(){
  if(this.active)return;this.active=true;const run=++this.run;this.callbacks.onState('requesting');
  try{
   const stream=await this.env.getStream();
   if(run!==this.run){stream.getTracks().forEach(track=>track.stop());return;}
   this.stream=stream;const recorder=this.env.createRecorder(stream);this.recorder=recorder;
   const chunks:Blob[]=[];let size=0;
   recorder.ondataavailable=event=>{
    if(run!==this.run)return;size+=event.data.size;
    if(size>AUDIO_MAX_BYTES){this.cancel();this.callbacks.onError('El audio supera 4 MB. Prueba una respuesta más corta.');return;}
    if(event.data.size)chunks.push(event.data);
   };
   recorder.onerror=()=>{if(run===this.run){this.cancel();this.callbacks.onError('La grabación se interrumpió. Puedes volver a grabar o escribir.');}};
   recorder.onstop=()=>{
    if(run!==this.run)return;
    this.release();this.active=false;this.recorder=undefined;
    const blob=new Blob(chunks,{type:recorder.mimeType});
    if(!blob.size){this.callbacks.onState('idle');this.callbacks.onError('La grabación está vacía. Vuelve a grabar o escribe.');return;}
    this.callbacks.onState('ready');this.callbacks.onReady(blob);
   };
   recorder.start(250);const started=this.env.now();
   this.timer=this.env.every(()=>{if(this.env.now()-started>=(AUDIO_MAX_SECONDS-1)*1000)this.stop();});
   this.callbacks.onState('recording');
  }catch{
   if(run!==this.run)return;
   this.cancel();this.callbacks.onError('No pudimos usar el micrófono. Revisa el permiso del navegador, sube un audio o escribe tu respuesta.');
  }
 }
 stop(){if(this.recorder?.state==='recording')this.recorder.stop();}
 cancel(notify=true){this.run++;this.active=false;const recorder=this.recorder;this.recorder=undefined;this.release();if(recorder&&recorder.state!=='inactive')recorder.stop();if(notify)this.callbacks.onState('idle');}
 dispose(){this.cancel(false);}
}

