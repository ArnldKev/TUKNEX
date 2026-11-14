import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {quoteDefaults,quoteFormSchema} from './form';
import {createQuoteSubmissionSchema} from './submission';
import {quoteToday,isQuoteCalendarDate,quoteScheduleIssue,formatQuoteLaunchDate} from './schedule';
import {quoteAnswers,quoteTimingSummary} from './presentation';
import {estimateQuote} from '../pricing';
import {createQuoteProject,parseQuoteProject,serializeQuoteProject} from './project';
import {advanceQuoteFlow,initialQuoteFlow,parseQuoteRecovery,serializeQuoteRecovery,stageIsValid} from './workflow';
const beforeMidnight=new Date('2026-11-12T04:59:59.999Z'),afterMidnight=new Date('2026-11-12T05:00:00.000Z');
const base={...quoteDefaults,offering:'Café y postres',sector:'food' as const,problem:'Mostrar la carta del negocio',privacyAcknowledged:true,timeline:'flexible' as const};
const schema=createQuoteSubmissionSchema(()=>beforeMidnight);
test('quote dates use the calendar day in Peru around UTC and local midnight',()=>{
 assert.equal(quoteToday(beforeMidnight),'2026-11-11');assert.equal(quoteToday(afterMidnight),'2026-11-12');
 assert.equal(quoteToday(new Date('2026-01-01T02:00:00.000Z')),'2025-12-31');
});
test('calendar dates reject malformed formats and impossible days without rejecting leap days',()=>{
 for(const value of ['2026-02-29','2099-02-30','1900-02-29','2026-13-01','2026-00-01','2026-11-00','2026-1-01','0000-01-01','not-a-date','2026-11-11T00:00:00Z'])assert.equal(isQuoteCalendarDate(value),false,value);
 for(const value of ['2024-02-29','2000-02-29','2026-11-11','0001-01-01'])assert.equal(isQuoteCalendarDate(value),true,value);
});
test('a fixed deadline requires a date and points its error to the date field',()=>{
 const result=schema.safeParse({...base,hardDeadline:true,launchDate:''});assert.equal(result.success,false);
 if(!result.success){assert.deepEqual(result.error.issues.at(-1)?.path,['launchDate']);assert.match(result.error.issues.at(-1)?.message||'',/fecha límite/);}
 assert.equal(quoteScheduleIssue({launchDate:'',hardDeadline:true},beforeMidnight)?.code,'required');
});
test('a flexible request may keep its launch date empty',()=>{
 assert.equal(schema.safeParse({...base,hardDeadline:false,launchDate:''}).success,true);
 assert.equal(quoteScheduleIssue({launchDate:'',hardDeadline:false},beforeMidnight),null);
});
test('new requests reject a past date even if the deadline is optional',()=>{
 for(const hardDeadline of [false,true])assert.equal(schema.safeParse({...base,hardDeadline,launchDate:'2020-01-01'}).success,false);
 assert.equal(quoteScheduleIssue({launchDate:'2026-11-10',hardDeadline:false},beforeMidnight)?.code,'past');
});
test('new requests reject invalid calendar and programmatic date values',()=>{
 for(const launchDate of ['not-a-date','2026-02-30','2026-13-01'])assert.equal(schema.safeParse({...base,hardDeadline:true,launchDate}).success,false,launchDate);
});
test('today and future dates work without turning a fixed date into urgent pricing',()=>{
 for(const launchDate of ['2026-11-11','2099-01-15'])assert.equal(schema.safeParse({...base,hardDeadline:true,launchDate}).success,true);
 const values={...base,hardDeadline:true,launchDate:'2099-01-15'},before=structuredClone(values);
 assert.deepEqual(estimateQuote(values),estimateQuote(base));assert.equal(values.timeline,'flexible');assert.deepEqual(values,before);
});
test('the submission clock is refreshed for each parse rather than fixed at import',()=>{
 let clock=beforeMidnight;const live=createQuoteSubmissionSchema(()=>clock),values={...base,hardDeadline:true,launchDate:'2026-11-11'};
 assert.equal(live.safeParse(values).success,true);clock=afterMidnight;assert.equal(live.safeParse(values).success,false);
});
test('historical schemas and saved projects remain readable after their deadline passes',()=>{
 const values={...base,hardDeadline:true,launchDate:'2020-01-01',deadlineReason:'Fecha de la solicitud histórica'};
 assert.deepEqual(quoteFormSchema.parse(values),values);assert.equal(schema.safeParse(values).success,false);
 const project=createQuoteProject(values);assert.deepEqual(parseQuoteProject(serializeQuoteProject(project)),project);
});
test('browser recovery preserves dates and restrictions without concealing an invalid past date',()=>{
 const now=beforeMidnight.getTime(),values={...base,hardDeadline:true,launchDate:'2020-01-01'};
 const raw=serializeQuoteRecovery(values,{...initialQuoteFlow(),step:4,completed:[0,1,2,3],goalChosen:true},now);
 const restored=parseQuoteRecovery(raw,now+1000);assert.ok(restored);assert.equal(restored.values.launchDate,'2020-01-01');assert.equal(restored.values.hardDeadline,true);
 assert.equal(stageIsValid(4,restored.values,true),false);assert.throws(()=>advanceQuoteFlow(restored.flow,restored.values));
});
test('browser recovery opens timing when an invalid deadline was saved on the summary',()=>{
 const now=beforeMidnight.getTime(),values={...base,hardDeadline:true,launchDate:'2020-01-01'};
 const raw=serializeQuoteRecovery(values,{...initialQuoteFlow(),step:5,completed:[0,1,2,3,4],goalChosen:true},now);
 const restored=parseQuoteRecovery(raw,now+1000);
 assert.equal(restored?.flow.step,4);
 assert.equal(restored?.values.launchDate,'2020-01-01');
 assert.equal(restored?.values.hardDeadline,true);
});
test('the timing stage cannot advance with an absent or past fixed deadline',()=>{
 const flow={...initialQuoteFlow(),step:4,completed:[0,1,2,3],goalChosen:true};
 for(const launchDate of ['', '2020-01-01','2099-02-30'])assert.throws(()=>advanceQuoteFlow(flow,{...base,hardDeadline:true,launchDate}));
 const advanced=advanceQuoteFlow(flow,{...base,hardDeadline:true,launchDate:'2099-01-15'});assert.equal(advanced.step,5);
});
test('summaries show the requested date and deadline separately from priority',()=>{
 const values={...base,launchDate:'2099-01-15',hardDeadline:true,deadlineReason:'Inauguración'};
 const summary=quoteTimingSummary(values),answers=Object.fromEntries(quoteAnswers(values).map(answer=>[answer.question,answer.value]));
 assert.match(summary,/Flexible, sin prioridad urgente/);assert.match(summary,/Fecha límite solicitada: 15\/01\/2099/);
 assert.equal(answers['Lanzamiento ideal'],'15/01/2099');assert.match(answers['Fecha límite real'],/15\/01\/2099.*Solicitada.*Inauguración/);
 assert.equal(formatQuoteLaunchDate('2026-11-11'),'11/11/2026');assert.equal(formatQuoteLaunchDate('legacy date'),'legacy date');
});
test('new scheduling helpers and submission contract are identical on both sides',async()=>{
 for(const name of ['schedule','submission']){
  const front=await readFile(new URL('./'+name+'.ts',import.meta.url),'utf8'),back=await readFile(new URL('../../../../backend/src/domain/quote/'+name+'.ts',import.meta.url),'utf8');
  assert.equal(front.replaceAll('\r\n','\n'),back.replaceAll('\r\n','\n'),name);
 }
});
