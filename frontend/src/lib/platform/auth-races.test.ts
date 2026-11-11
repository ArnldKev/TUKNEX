import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {AuthRequestScope} from './auth-request-scope';
type ProviderValue={user:{id:string;name:string;role:string}|null;ready:boolean;error:string;login:(email:string,password:string)=>Promise<unknown>;logout:()=>Promise<void>};
type ProviderExports={DemoAuthProvider:(props:{children:null})=>{props:{value:ProviderValue}}};
type ApiInstance={getCurrentUser:()=>Promise<unknown>;login:(email:string,password:string)=>Promise<unknown>;logout:()=>Promise<void>;hasRole:(role:string)=>boolean};
type ApiExports={ApiAuthService:new()=>ApiInstance};
type SimulatedResponse={ok:boolean;status?:number;json?:()=>Promise<{id:string;name:string;role:string}>};
const client={id:'synthetic-client',name:'Synthetic Client',role:'client'},admin={id:'synthetic-admin',name:'Synthetic Admin',role:'admin'};
function deferred<T=unknown>(){let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
const flush=async()=>{for(let n=0;n<6;n++)await Promise.resolve();};
function compiled(name:string){return ts.transpileModule(readFileSync(new URL(name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;}
function provider(){
 const cells:unknown[]=[],handlers=new Map<string,(event?:unknown)=>void>(),reads:{promise:Promise<unknown>;resolve:(value:unknown)=>void;reject:(error:unknown)=>void;signal:AbortSignal}[]=[];
 let cursor=0,mounted=false,effect:(()=>void|(()=>void))|undefined;
 let login=deferred<typeof client>(),logout=Promise.resolve();
 const react={createContext:()=>({Provider:'Provider'}),useContext:()=>null,useState:(initial:unknown)=>{const slot=cursor++;if(!(slot in cells))cells[slot]=typeof initial==='function'?(initial as ()=>unknown)():initial;return[cells[slot],(value:unknown)=>{cells[slot]=typeof value==='function'?(value as (old:unknown)=>unknown)(cells[slot]):value;}];},useRef:(value:unknown)=>{const slot=cursor++;if(!(slot in cells))cells[slot]={current:value};return cells[slot];},useEffect:(fn:()=>void|(()=>void))=>{cursor++;if(!mounted)effect=fn;}};
 const service={getCurrentUser:(signal:AbortSignal)=>{const item={...deferred(),signal};reads.push(item);return item.promise;},login:()=>login.promise,register:()=>login.promise,logout:()=>logout,resetPassword:async()=>''};
 const context={exports:{} as ProviderExports,AbortController,DOMException,Error,Promise,window:{addEventListener:(name:string,fn:(event?:unknown)=>void)=>handlers.set(name,fn),removeEventListener:(name:string)=>handlers.delete(name)},require:(name:string)=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props})};
  if(name==='next/link')return{__esModule:true,default:()=>null};if(name==='../../config/environment')return{DEMO_MODE:false};if(name==='./api-auth')return{apiAuthService:service};if(name==='./auth-request-scope')return{AuthRequestScope};
  if(name==='./repository')return{platformRepository:{getSnapshot:()=>({users:[]})}};if(name==='lucide-react')return{};throw Error('Unexpected import: '+name);
 }};
 runInNewContext(compiled('./auth.tsx'),context);
 const render=()=>{cursor=0;return context.exports.DemoAuthProvider({children:null}).props.value;};
 render();mounted=true;const cleanup=effect?.()||undefined;
 return{reads,render,focus:()=>handlers.get('focus')?.(),expire:()=>handlers.get('account-expired')?.({detail:{reason:'expired'}}),login:()=>login,setLogin:(next:ReturnType<typeof deferred<typeof client>>)=>{login=next;},setLogout:(next:Promise<void>)=>{logout=next;},unmount:()=>cleanup?.()};
}
test('actual provider ignores a focus response after logout and aborts its read',async()=>{
 const h=provider();h.reads[0].resolve(client);await flush();h.focus();const pending=h.reads[1];await h.render().logout();assert.equal(h.render().user,null);assert.equal(pending.signal.aborted,true);
 pending.resolve(client);await flush();assert.equal(h.render().user,null);assert.equal(h.render().ready,true);h.unmount();
});
test('actual provider keeps the new account when an old verification arrives after login',async()=>{
 const h=provider();h.reads[0].resolve(admin);await flush();h.focus();const pending=h.reads[1],signingIn=h.render().login('synthetic@example.test','not-a-real-password');h.login().resolve(client);await signingIn;pending.resolve(admin);await flush();assert.equal(h.render().user?.id,client.id);h.unmount();
});
test('actual provider skips focus verification during a pending identity transition',async()=>{
 const h=provider();h.reads[0].resolve(null);await flush();const signingIn=h.render().login('synthetic@example.test','not-a-real-password');h.focus();assert.equal(h.reads.length,1);h.login().resolve(client);await signingIn;assert.equal(h.render().user?.id,client.id);h.unmount();
});
test('actual provider does not restore a login that completed after logout',async()=>{
 const h=provider();h.reads[0].resolve(null);await flush();const signingIn=h.render().login('synthetic@example.test','not-a-real-password');const rejected=assert.rejects(signingIn,/sesión cambió/);await h.render().logout();h.login().resolve(client);await rejected;assert.equal(h.render().user,null);h.unmount();
});
test('actual provider keeps expiry feedback and ignores superseded/unmounted reads',async()=>{
 const h=provider();h.reads[0].resolve(client);await flush();h.focus();h.expire();h.reads[1].resolve(client);await flush();assert.equal(h.render().user,null);assert.match(h.render().error,/sesión ha caducado/);
 h.focus();const last=h.reads[2];h.unmount();assert.equal(last.signal.aborted,true);last.resolve(admin);await flush();assert.equal(h.render().user,null);
});
test('actual provider accepts only the latest focus verification',async()=>{
 const h=provider();h.reads[0].resolve(client);await flush();h.focus();const older=h.reads[1];h.focus();const newer=h.reads[2];assert.equal(older.signal.aborted,true);newer.resolve(admin);await flush();older.resolve(client);await flush();assert.equal(h.render().user?.id,admin.id);h.unmount();
});
function api(){
 const reads:ReturnType<typeof deferred<SimulatedResponse>>[]=[],flags:boolean[]=[],events:string[]=[],login=deferred<{user:typeof client}>(),logout=deferred<SimulatedResponse>();
 const context={exports:{} as ApiExports,AbortController,AbortSignal,DOMException,Error,Event,Promise,window:{dispatchEvent:(event:Event)=>{events.push(event.type);}},fetch:(url:string)=>{if(url.endsWith('/logout'))return logout.promise;const item=deferred<SimulatedResponse>();reads.push(item);return item.promise;},require:(name:string)=>{if(name==='../../config/api')return{API_URL:''};if(name==='../billing/api')return{billingRequest:()=>login.promise,setBillingSession:(value:boolean)=>flags.push(value)};throw Error('Unexpected import '+name);}};
 runInNewContext(compiled('./api-auth.ts'),context);return{service:new context.exports.ApiAuthService(),reads,flags,events,login,logout};
}
test('actual API auth service cannot change cache or billing role from an aborted old auth/me',async()=>{
 const h=api(),reading=h.service.getCurrentUser();const rejected=assert.rejects(reading,/sesión cambió/);const signingIn=h.service.login('synthetic@example.test','not-a-real-password');h.login.resolve({user:client});await signingIn;h.reads[0].resolve({status:200,ok:true,json:async()=>admin});await rejected;assert.equal(h.service.hasRole('client'),true);assert.deepEqual(h.flags,[false]);
});
test('actual API auth service does not emit an old logout event after another login',async()=>{
 const h=api(),loggingOut=h.service.logout(),signingIn=h.service.login('synthetic@example.test','not-a-real-password');h.login.resolve({user:client});await signingIn;h.logout.resolve({ok:true});await loggingOut;assert.equal(h.service.hasRole('client'),true);assert.deepEqual(h.events,[]);
});
