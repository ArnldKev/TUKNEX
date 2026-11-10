import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import {jsx,jsxs,Fragment} from 'react/jsx-runtime';
import {isValidElement} from 'react';
import * as progress from '../projects/progress';
type Tree={type:unknown;key?:string|null;props:Record<string,unknown>};type Component=(props:Record<string,unknown>)=>Tree;
const flush=async()=>{for(let n=0;n<6;n++)await Promise.resolve();};
function harness(name:string,exportName:string){
 let cells:unknown[]=[],cursor=0,pending:(()=>void)[]=[],effects=new Map<number,{deps:unknown[];cleanup?:()=>void}>(),identity:{type:unknown;key?:string|null}|undefined;
 const requests:{path:string;signal:AbortSignal;resolve:(value:unknown)=>void;reject:(error:unknown)=>void}[]=[];
 const react={useState:(initial:unknown)=>{const slot=cursor++;if(!(slot in cells))cells[slot]=typeof initial==='function'?(initial as ()=>unknown)():initial;return[cells[slot],(value:unknown)=>{cells[slot]=typeof value==='function'?(value as (old:unknown)=>unknown)(cells[slot]):value;}];},useRef:(initial:unknown)=>{const slot=cursor++;if(!(slot in cells))cells[slot]={current:initial};return cells[slot];},useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{const slot=cursor++,previous=effects.get(slot);if(!previous||deps.some((value,i)=>value!==previous.deps[i]))pending.push(()=>{previous?.cleanup?.();effects.set(slot,{deps,cleanup:effect()||undefined});});}};
 const context={exports:{} as Record<string,Component>,AbortController,AbortSignal,crypto:{randomUUID},Error,Promise,require:(path:string)=>{
  if(path==='react')return react;if(path==='react/jsx-runtime')return{jsx,jsxs,Fragment};
  if(path==='@/lib/billing/api')return{billingBase:'',savePdf:()=>{},billingRequest:(path:string,options:{signal:AbortSignal})=>new Promise((resolve,reject)=>requests.push({path,signal:options.signal,resolve,reject}))};
  if(path==='@/lib/billing/finance')return{amount:(value:unknown)=>String(value)};if(path==='@/lib/projects/progress')return progress;if(path.endsWith('.css'))return{};return new Proxy({}, {get:()=>()=>null});
 }};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../../components/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const wrapper=(props:Record<string,unknown>)=>context.exports[exportName](props);
 const render=(props:Record<string,unknown>)=>{
  const element=wrapper(props);assert.ok(isValidElement(element));
  // Honor React's type+key identity boundary, unlike a direct prop-blind function call.
  if(!identity||identity.type!==element.type||identity.key!==element.key){for(const effect of effects.values())effect.cleanup?.();cells=[];effects=new Map();identity={type:element.type,key:element.key};}
  cursor=0;pending=[];const tree=(element.type as Component)(element.props);pending.forEach(effect=>effect());return tree;
 };
 return{requests,wrapper,render};
}
function text(node:unknown):string{if(Array.isArray(node))return node.map(text).join(' ');if(node&&typeof node==='object'&&'props'in node)return text((node as Tree).props.children);return typeof node==='string'?node:'';}
function toggle(tree:Tree){(tree.props.onToggle as (event:{currentTarget:{open:boolean}})=>void)({currentTarget:{open:true}});}
test('dossier identity isolates projects and visibility; a failed next load never displays prior documents',async()=>{
 const h=harness('billing/project-dossier.tsx','ProjectDossier'),a={kind:'billing',projectId:'synthetic-a',client:true},b={...a,projectId:'synthetic-b'};
 toggle(h.render(a));h.render(a);h.requests[0].resolve({projectName:'A',items:[{key:'a',name:'a.pdf',label:'DOCUMENT_A',version:1}],archives:[]});await flush();assert.ok(text(h.render(a)).includes('DOCUMENT_A'));
 const previous=h.wrapper(a),next=h.wrapper(b);assert.notEqual(previous.key,next.key);assert.equal(previous.type,next.type);assert.equal(text(h.render(b)).includes('DOCUMENT_A'),false);assert.equal(h.requests[0].signal.aborted,true);
 toggle(h.render(b));h.render(b);h.requests[1].reject(new Error('Synthetic B unavailable'));await flush();assert.equal(text(h.render(b)).includes('DOCUMENT_A'),false);assert.notEqual(h.wrapper(b).key,h.wrapper({...b,client:false}).key);
});
test('contract addenda preserve state on the same contract version refresh and reset for another contract',()=>{
 const h=harness('billing/contract-addenda.tsx','ContractAddenda'),a={contract:{id:'synthetic-a',version:1,status:'activo'},client:false};toggle(h.render(a));h.render(a);
 const before=h.wrapper(a),refresh={...a,contract:{...a.contract,version:2}},refreshed=h.wrapper(refresh);assert.equal(before.type,refreshed.type);assert.equal(before.key,refreshed.key);assert.equal(h.render(refresh).props.open,true);
 const other={...a,contract:{...a.contract,id:'synthetic-b'}};assert.notEqual(h.wrapper(other).key,before.key);assert.equal(h.render(other).props.open,false);assert.equal(h.requests[0].signal.aborted,true);assert.notEqual(h.wrapper(other).key,h.wrapper({...other,client:true}).key);
});
test('tracking editor identity is stable on refresh and changes with project or scope',()=>{
 const h=harness('projects/project-tracking.tsx','ProjectTrackingEditor'),a={kind:'team',projectId:'synthetic-a'},first=h.wrapper(a),refresh=h.wrapper({...a,onChanged:()=>{}});assert.ok(isValidElement(first));assert.equal(first.type,refresh.type);assert.equal(first.key,refresh.key);assert.notEqual(first.key,h.wrapper({...a,projectId:'synthetic-b'}).key);assert.notEqual(first.key,h.wrapper({...a,kind:'billing'}).key);
});
