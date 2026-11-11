import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {quoteDefaults,quoteFormSchema} from './form';
import {createQuoteProject,createProjectHistory,acceptProjectSuggestion,undoProject,projectToForm} from './project';
import {aiContext,aiOrganizedEnvelopeSchema,validateAiOrganizedReport} from './ai';
import {organizedIdeaSuggestion} from './idea-actions';
import {protectedIdeaDetails,validateOrganizedIdea} from './idea';
import {serializeQuoteRecovery,parseQuoteRecovery,initialQuoteFlow} from './workflow';
const id='226b85fc-d47f-4a08-9366-5d780d39598b',resultId='12b00e6a-3fb9-40ab-bc06-4b227a7989d6';
const values={...quoteDefaults,offering:'Carta de 25 platos',problem:'No quiero pagos online; quiero pedidos por WhatsApp',otherFunctions:'Entregar en 3 sedes',sector:'food' as const};
const project=createQuoteProject(values,id);
const text={narrative:'Quiero una carta de 25 platos, pedidos por WhatsApp y entregar en 3 sedes. No quiero pagos online.',requirements:['Mostrar 25 platos','Pedidos por WhatsApp','Entregar en 3 sedes'],exclusions:['No quiero pagos online'],questions:['¿Las sedes comparten carta?']};
const envelope={id:resultId,projectId:id,baseRevision:0,provider:'groq' as const,model:'synthetic',generatedAt:'2026-11-10T12:00:00.000Z',report:{...text,suggestions:[{title:'Carta digital',reason:'Se pidieron 25 platos',evidenceFields:['offering' as const],target:'addFeature' as const,value:'catalog'}]}};
test('idea contracts are identical in frontend and backend',async()=>{
 for(const name of ['idea','ai','form']){const [front,back]=await Promise.all([readFile(new URL('./'+name+'.ts',import.meta.url),'utf8'),readFile(new URL('../../../../backend/src/domain/quote/'+name+'.ts',import.meta.url),'utf8')]);assert.equal(front.replaceAll('\r\n','\n'),back.replaceAll('\r\n','\n'));}
});
test('structured organization rejects arbitrary code, extra fields, lost quantities and negations',()=>{
 assert.deepEqual(validateAiOrganizedReport(envelope.report,project),envelope.report);
 assert.throws(()=>validateOrganizedIdea({...text,narrative:'Catálogo de productos',requirements:[],exclusions:[],questions:[]},project.answers));
 assert.throws(()=>validateOrganizedIdea({...text,narrative:'Carta de 250 platos y 3 sedes. No quiero pagos online.',requirements:[]},project.answers));
 assert.throws(()=>validateOrganizedIdea({...text,narrative:'25 platos y 3 sedes',exclusions:[]},project.answers));
 assert.throws(()=>validateOrganizedIdea({...text,narrative:'<script>alert(1)</script>'},project.answers));
 assert.throws(()=>validateOrganizedIdea({...text,requirements:[...text.requirements,'Precio 100 soles']},project.answers));
 assert.throws(()=>validateOrganizedIdea({narrative:'Temperatura 5',requirements:[],exclusions:[],questions:[]},{offering:'Temperatura -5',problem:'',customers:'',otherFunctions:''}));
 assert.equal(aiOrganizedEnvelopeSchema.safeParse({...envelope,report:{...envelope.report,price:100}}).success,false);
 assert.ok(protectedIdeaDetails(project.answers).includes('No quiero pagos online;'));
});
test('approve preserves raw answers, only selected visual options apply and undo restores exact previous state',()=>{
 const before=createProjectHistory(project),after=acceptProjectSuggestion(before,organizedIdeaSuggestion(project,envelope,text,[0],envelope.generatedAt));
 assert.equal(after.present.answers.offering,values.offering);assert.equal(after.present.answers.problem,values.problem);assert.ok(after.present.answers.features.includes('catalog'));assert.equal(after.present.answers.approvedIdea?.reviewed.narrative,text.narrative);assert.equal(after.present.answers.approvedIdea?.sourceRevision,0);assert.equal(after.present.revision,1);
 const undone=undoProject(after);assert.deepEqual(undone.present.answers,project.answers);assert.equal(projectToForm(undone.present,projectToForm(after.present,values)).approvedIdea,undefined);
});
test('no options are selected implicitly and edited stale ideas cannot apply',()=>{
 const suggestion=organizedIdeaSuggestion(project,envelope,text,[],envelope.generatedAt);assert.equal(suggestion.change.visual,undefined);assert.equal(suggestion.change.answers?.features,undefined);
 assert.throws(()=>organizedIdeaSuggestion({...project,revision:1},envelope,text,[]));assert.throws(()=>organizedIdeaSuggestion(project,envelope,{...text,narrative:'25 platos y 3 sedes',exclusions:[]},[]));
});
test('approved interpretation survives local tab recovery and validates at explicit submission without dedicated contacts',()=>{
 const after=acceptProjectSuggestion(createProjectHistory(project),organizedIdeaSuggestion(project,envelope,text,[],envelope.generatedAt));const form=projectToForm(after.present,{...values,name:'Private Person',email:'private@example.test',phone:'900000001',privacyAcknowledged:true});assert.equal(quoteFormSchema.safeParse(form).success,true);
 const serialized=serializeQuoteRecovery(form,initialQuoteFlow(),1000);assert.equal(serialized.includes('private@example.test'),false);assert.equal(serialized.includes('Private Person'),false);const recovered=parseQuoteRecovery(serialized,1001);assert.equal(recovered?.values.approvedIdea?.id,resultId);assert.equal(recovered?.values.privacyAcknowledged,false);
});
test('provider suggestions must still use allowed controlled changes and evidence',()=>{
 assert.throws(()=>validateAiOrganizedReport({...envelope.report,suggestions:[{...envelope.report.suggestions[0],target:'html',value:'arbitrary'}]},project));assert.throws(()=>validateAiOrganizedReport({...envelope.report,suggestions:[{...envelope.report.suggestions[0],evidenceFields:['colorsDisliked']}]},project));
});

test('approved schema rejects lost quantities and only a current interpretation enters redacted model context',()=>{
 const history=acceptProjectSuggestion(createProjectHistory(project),organizedIdeaSuggestion(project,envelope,text,[],envelope.generatedAt));
 assert.equal((aiContext(history.present).approvedInterpretation as Record<string,unknown>).narrative,text.narrative);
 assert.equal(aiContext({...history.present,answers:{...history.present.answers,problem:'Otra necesidad'}}).approvedInterpretation,undefined);
 const changed=projectToForm(history.present,{...values,privacyAcknowledged:true});
 changed.approvedIdea={...changed.approvedIdea!,reviewed:{narrative:'Sin cantidades',requirements:[],exclusions:[],questions:[]}};
 assert.equal(quoteFormSchema.safeParse(changed).success,false);
});
