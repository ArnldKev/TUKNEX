import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {quoteDefaults} from './form';
import {createQuoteProject,serializeQuoteProject} from './project';

test('dictado por campo: contrato, inserción y cancelación segura',async t=>{
 const api=await import('./dictation').catch(()=>null);
 assert.ok(api,'Falta el contrato de dictado directo por campo');
 await t.test('autoriza todos los textos pertinentes y rechaza fecha, elecciones y datos extra',()=>{
  const fields=['businessName','offering','city','website','customers','salesProcess','problem','otherFunctions','colorsLiked','colorsDisliked','references','competitor','firstImpression','previewComment','deadlineReason','existingDomain','approver','name','email','phone'];
  for(const field of fields)assert.equal(api.dictationPermissionSchema.safeParse({field,consent:'true',policyVersion:api.DICTATION_POLICY_VERSION}).success,true,field);
  for(const field of ['launchDate','sector','projectType','marketingConsent','price','__proto__'])
   assert.equal(api.dictationPermissionSchema.safeParse({field,consent:'true',policyVersion:api.DICTATION_POLICY_VERSION}).success,false,field);
  const body={field:'email',consent:'true',policyVersion:api.DICTATION_POLICY_VERSION};
  for(const extra of [{consent:'false'},{consent:true},{policyVersion:'2026-10-25-audio-v1'},{text:'texto escrito'},{project:{}}])
   assert.equal(api.dictationPermissionSchema.safeParse({...body,...extra}).success,false);
  assert.equal(api.isDictationField('email'),true);assert.equal(api.isDictationField('launchDate'),false);
 });
 await t.test('añade íntegro sin cortar ni modificar texto ya escrito o datos literales',()=>{
  assert.equal(api.appendDictation('Carta original',' También delivery. '),'Carta original También delivery.');
  assert.equal(api.appendDictation('Línea\n','Otra línea'),'Línea\nOtra línea');
  assert.equal(api.appendDictation('  ','texto'),'  texto');
  assert.equal(api.appendDictation('','José Quispe, Oxapampa; S/ 25.50.'),'José Quispe, Oxapampa; S/ 25.50.');
  assert.equal(api.appendDictation('correo@ejemplo.pe','Otro@Dominio.pe'),'correo@ejemplo.pe Otro@Dominio.pe');
  const long='x'.repeat(3000);assert.equal(api.appendDictation('ya escrito',long),'ya escrito '+long);
  assert.throws(()=>api.appendDictation('original','  '));
 });
 await t.test('aplica una sola vez sobre el valor más reciente, conservando edición concurrente',()=>{
  const session=new api.FieldDictationSession(),values:Record<string,string>={problem:'Antes',city:'Lima'};
  const read=(field:string)=>values[field],write=(field:string,value:string)=>{values[field]=value;};
  const ticket=session.begin('problem');values.problem='Antes y mientras grababa';values.city='Oxapampa';
  const insertion=session.apply(ticket,'Más mesas.',read,write);
  assert.equal(values.problem,'Antes y mientras grababa Más mesas.');assert.equal(values.city,'Oxapampa');
  assert.equal(insertion?.before,'Antes y mientras grababa');assert.equal(insertion?.field,'problem');
  assert.equal(session.apply(ticket,'Más mesas.',read,write),null);
  assert.equal(values.problem,'Antes y mientras grababa Más mesas.');
 });
 await t.test('cancelar o iniciar otro campo invalida respuestas tardías sin cambiar valores',()=>{
  const session=new api.FieldDictationSession(),values:Record<string,string>={offering:'Menú',name:'Ana'};
  const read=(field:string)=>values[field],write=(field:string,value:string)=>{values[field]=value;};
  const old=session.begin('offering');session.cancel();
  assert.equal(session.apply(old,'Nuevo menú',read,write),null);
  const previous=session.begin('offering'),current=session.begin('name');
  assert.equal(session.apply(previous,'No insertar',read,write),null);
  assert.equal(session.apply(current,'María',read,write)?.after,'Ana María');assert.equal(values.offering,'Menú');
  session.reset();assert.equal(session.canUndo(read),false);
 });
 await t.test('deshacer puntual respeta cambios posteriores y no toca otros campos',()=>{
  const session=new api.FieldDictationSession(),values:Record<string,string>={name:'Ana',problem:'Sin cambios'};
  const read=(field:string)=>values[field],write=(field:string,value:string)=>{values[field]=value;};
  session.apply(session.begin('name'),'María',read,write);assert.equal(session.canUndo(read),true);
  values.name='Ana María Quispe';assert.equal(session.undo(read,write),false);assert.equal(values.name,'Ana María Quispe');
  session.apply(session.begin('problem'),'Mejorar ventas.',read,write);
  assert.equal(session.undo(read,write),true);assert.equal(values.problem,'Sin cambios');assert.equal(values.name,'Ana María Quispe');
  assert.equal(session.undo(read,write),false);
 });
 await t.test('contacto dictado sigue excluido del proyecto serializable',()=>{
  const session=new api.FieldDictationSession(),values={...quoteDefaults};
  session.apply(session.begin('email'),'privado@ejemplo.pe',field=>values[field],(field,value)=>{values[field]=value;});
  session.apply(session.begin('approver'),'Persona privada',field=>values[field],(field,value)=>{values[field]=value;});
  const serialized=serializeQuoteProject(createQuoteProject(values));
  assert.equal(values.email,'privado@ejemplo.pe');assert.equal(serialized.includes('privado@ejemplo.pe'),false);
  assert.equal(serialized.includes('Persona privada'),false);
 });
 await t.test('frontend y backend comparten el contrato exacto',async()=>{
  const front=await readFile(new URL('./dictation.ts',import.meta.url),'utf8');
  const back=await readFile(new URL('../../../../backend/src/domain/quote/dictation.ts',import.meta.url),'utf8');
  assert.equal(front.replaceAll('\r\n','\n'),back.replaceAll('\r\n','\n'));
 });
});

test('controles de dictado comparten aviso y no convierten el micrófono en submit',async()=>{
 const ui=await import('../../components/quote/field-dictation').catch(()=>null);
 assert.ok(ui,'Faltan el proveedor y los controles de dictado por campo');
 const {QuoteDictationProvider,QuoteDictationNotice,QuoteFieldDictation}=ui;
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{FormProvider,useForm}=require('react-hook-form');
 function Form(){
  const form=useForm({defaultValues:quoteDefaults});
  return React.createElement(FormProvider,{...form,children:React.createElement(QuoteDictationProvider,{scopeKey:'test',children:[
   React.createElement(QuoteDictationNotice,{key:'notice'}),
   React.createElement(QuoteFieldDictation,{key:'field',field:'name',label:'Tu nombre'}),
  ]})});
 }
 const html=renderToStaticMarkup(React.createElement(Form));
 assert.match(html,/Groq/);assert.match(html,/type="button"/);assert.match(html,/aria-describedby=/);
 assert.match(html,/Dictar Tu nombre/);assert.doesNotMatch(html,/type="checkbox"/);
 assert.equal(renderToStaticMarkup(React.createElement(QuoteFieldDictation,{field:'name',label:'Tu nombre'})),'');
});

test('ocultar una respuesta solo cancela el dictado de ese campo',async()=>{
 const api=await import('./dictation'),session=new api.FieldDictationSession(),values:Record<string,string>={name:'Ana',problem:'Menú'};
 assert.equal(typeof session.cancelField,'function','Falta cancelar al ocultar el campo activo');
 const read=(field:string)=>values[field],write=(field:string,value:string)=>{values[field]=value;};
 const first=session.begin('problem');assert.equal(session.cancelField('name'),false);
 assert.equal(session.apply(first,'digital',read,write)?.after,'Menú digital');
 const hidden=session.begin('name');assert.equal(session.cancelField('name'),true);
 assert.equal(session.apply(hidden,'Texto tardío',read,write),null);assert.equal(values.name,'Ana');
});
