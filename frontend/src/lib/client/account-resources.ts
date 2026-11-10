import type {BillingClient,BillingQuote,Contract,Installment,Payment} from '../billing/types';
import type {SavedQuoteRequest} from '../quote/requests';
import type {User} from '../platform/types';
export type ClientOverview={user:User;client:BillingClient|null;quotes:BillingQuote[];contracts:Contract[];installments:Installment[];payments:Payment[];requests?:SavedQuoteRequest[];updatedAt?:string};
export type AccountResourceKey='overview'|'requests';
export type AccountResource<T>={data:T|null;loading:boolean;error:string;failure:'connection'|'unavailable'|'expired'|null;updatedAt:number|null};
export type AccountResources={overview:AccountResource<ClientOverview>;requests:AccountResource<SavedQuoteRequest[]>;updatedAt:number|null};
export class AccountLoadError extends Error{constructor(public status:number,message:string){super(message);}}
function empty<T>():AccountResource<T>{return{data:null,loading:true,error:'',failure:null,updatedAt:null};}
function errorState(error:unknown){
 const status=error instanceof AccountLoadError?error.status:0;
 if(status===401)return{error:'Tu sesión ha caducado. Inicia sesión para volver a consultar tu información.',failure:'expired' as const};
 if(status===0)return{error:'No pudimos conectar con TUKNEX. Comprueba tu conexión y vuelve a intentarlo.',failure:'connection' as const};
 if(status===408)return{error:'La consulta tardó más de lo esperado. Puedes volver a intentarlo; conservamos la última información disponible.',failure:'unavailable' as const};
 return{error:status===403?'Tu cuenta no tiene acceso a esta información.':'La información no está disponible temporalmente. Puedes volver a intentarlo.',failure:'unavailable' as const};
}
/** A refresh commits all sections together; superseded or cancelled responses never publish. */
export class AccountResourceStore{
 private value:AccountResources={overview:empty(),requests:empty(),updatedAt:null};
 private listeners=new Set<()=>void>();private active=true;private version=0;private controller:AbortController|null=null;private started=0;
 constructor(private loader:(signal:AbortSignal)=>Promise<{overview:ClientOverview;requests:SavedQuoteRequest[]}>,private clock:()=>number=Date.now){}
 getSnapshot=()=>this.value;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private publish(value:AccountResources){this.value=value;for(const listener of this.listeners)listener();}
 resume(){this.active=true;}
 stop(){this.active=false;this.version++;this.controller?.abort();this.controller=null;}
 shouldRefresh(minimumMs=15000){return this.active&&!this.value.overview.loading&&this.clock()-this.started>=minimumMs;}
 async refresh(_keys?:AccountResourceKey[]){
  if(!this.active)return;
  this.started=this.clock();this.controller?.abort();const controller=new AbortController();this.controller=controller;const version=++this.version;
  this.publish({...this.value,overview:{...this.value.overview,loading:true,error:'',failure:null},requests:{...this.value.requests,loading:true,error:'',failure:null}});
  try{
   const result=await this.loader(controller.signal);if(!this.active||controller.signal.aborted||version!==this.version)return;
   const serverTime=result.overview.updatedAt?Date.parse(result.overview.updatedAt):NaN,now=Number.isFinite(serverTime)?serverTime:this.clock();
   this.publish({overview:{data:result.overview,loading:false,error:'',failure:null,updatedAt:now},requests:{data:result.requests,loading:false,error:'',failure:null,updatedAt:now},updatedAt:now});
  }catch(error){
   if(!this.active||controller.signal.aborted||version!==this.version)return;
   const failure=errorState(error),expired=failure.failure==='expired';
   this.publish({...this.value,overview:{...this.value.overview,...failure,loading:false,...(expired?{data:null}: {})},requests:{...this.value.requests,...failure,loading:false,...(expired?{data:null}: {})}});
  }finally{if(this.controller===controller)this.controller=null;}
 }
}
export function accountRefreshLabel(resource:AccountResource<unknown>){
 if(resource.loading)return resource.data?'Actualizando información…':'Cargando…';
 if(resource.failure==='expired')return 'Sesión caducada';
 if(resource.failure==='connection')return 'Error de conexión';
 if(resource.error)return 'Información temporalmente no disponible';
 return resource.updatedAt?'Información actualizada':'Pendiente de consulta';
}
export function accountDateTime(value:number){return new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(value));}
