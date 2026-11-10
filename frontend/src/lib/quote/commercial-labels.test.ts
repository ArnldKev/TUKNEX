import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteDefaults,quoteFormSchema} from './form';
import {quoteChoiceLabels,quoteChoiceLabel,quoteChoiceList,quoteOriginLabel} from './commercial-labels';
import {quoteAnswers,quoteProposalText} from './presentation';
import {estimateQuote} from '../pricing';

test('all commercial enums have complete explicit display labels and matching backend sources',()=>{
 for(const field of Object.keys(quoteChoiceLabels) as (keyof typeof quoteChoiceLabels)[]){
  const schema=quoteFormSchema.shape[field];
  const item='element' in schema?schema.element:schema;
  const options='options' in item?item.options:field==='sector'?['food','tourism','commerce','services','health','education','other']:[];
  assert.ok(options.length,field+' has enumerated options');
  for(const id of options){if(id==='')continue;assert.notEqual(quoteChoiceLabel(field,id),'Por definir');}
 }
 for(const name of ['commercial-labels.ts','presentation.ts','contracts.ts'])assert.equal(readFileSync(new URL(name,import.meta.url),'utf8'),readFileSync(new URL('../../../../backend/src/domain/quote/'+name,import.meta.url),'utf8'),name+' mirrored');
});
test('answers and shared proposal translate stored IDs without mutating or repricing inputs',()=>{
 const parsed=quoteFormSchema.parse({...quoteDefaults,offering:'Productos de prueba',sector:'commerce',problem:'Organizar las consultas',projectType:'catalog',salesChannels:['social','physical'],materials:['photos','prices','help'],privacyAcknowledged:true});
 const before=structuredClone(parsed),estimate=estimateQuote(parsed),answers=Object.fromEntries(quoteAnswers(parsed).map(a=>[a.question,a.value]));
 assert.equal(answers['Diseño'],'Esencial, adaptado a mi marca');assert.equal(answers['Estilo'],'Moderno');assert.equal(answers['Prioridad'],'En las próximas semanas');assert.equal(answers['Dominio'],'Necesito orientación');assert.equal(answers['Hosting'],'Necesito orientación');
 assert.equal(answers['Canales actuales'],'Redes sociales, Local físico');assert.equal(answers['Material disponible'],'Fotos propias, Productos y precios, Necesito ayuda para preparar el contenido');assert.equal(answers['Volumen de productos'],'Hasta 20 productos o servicios');assert.equal(answers['Usuarios'],'No aplica');
 const proposal=quoteProposalText(parsed,{...estimate,category:parsed.projectType,label:'Catálogo digital',currency:'PEN',version:'3.0',validUntil:'2026-12-01'});
 assert.doesNotMatch(proposal,/Diseño: essential|Estilo: modern|Prioridad: standard|Dominio: unsure|Hosting: unsure|photos,|prices,/);
 assert.deepEqual(parsed,before);assert.deepEqual(estimateQuote(parsed),estimate);
});
test('uncertainty, explicit negative answers and missing values retain their actual meaning',()=>{
 assert.equal(quoteChoiceLabel('productsRange','none'),'Todavía no lo sé');
 assert.equal(quoteChoiceLabel('domain','no'),'Todavía no tengo dominio');assert.equal(quoteChoiceLabel('hosting','no'),'Todavía no tengo alojamiento web');
 assert.equal(quoteChoiceLabel('materials','unknown'),'Por definir');assert.equal(quoteChoiceLabel('materials','__proto__'),'Por definir');assert.equal(quoteChoiceList('materials',[],'Por preparar'),'Por preparar');
 const answers=Object.fromEntries(quoteAnswers({...quoteDefaults,projectType:'system',userRange:'6+',domain:'yes',existingDomain:'negocio.example'}).map(a=>[a.question,a.value]));assert.equal(answers['Usuarios'],'Seis o más personas / varios roles');assert.equal(answers['Dominio'],'negocio.example');
});
test('origins are explicit only when supplied; defaults never impersonate a customer selection',()=>{
 const neutral=quoteAnswers(quoteDefaults).find(a=>a.question==='Estilo')!.value;assert.equal(neutral,'Moderno');assert.doesNotMatch(neutral,/seleccionad/i);
 const known=quoteAnswers(quoteDefaults,{stylePreference:'selected',design:'imported'});assert.match(known.find(a=>a.question==='Estilo')!.value,/Opción seleccionada/);assert.match(known.find(a=>a.question==='Diseño')!.value,/Valor importado/);assert.match(known.find(a=>a.question==='Hosting')!.value,/Origen no registrado/);
 assert.equal(quoteOriginLabel('transcribed'),'Texto dictado');assert.equal(quoteOriginLabel('suggested'),'Sugerencia aplicada');
});

