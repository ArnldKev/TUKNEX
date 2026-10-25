import assert from 'node:assert/strict';
import test from 'node:test';
import { DraftSync } from './draft-sync';
import { quoteDefaults } from './form';
import { createQuoteProject, createProjectHistory, changeQuoteProject } from './project';
import { DRAFT_POLICY_VERSION, draftCreateSchema, draftProgress, draftContentKey, type RemoteDraft } from './drafts';
import { parseDraftRecovery } from './draft-recovery';
const project=createQuoteProject(quoteDefaults);
const remote:RemoteDraft={id:project.id,project,step:0,version:1,title:'Idea',progress:33,owner:null,
  createdAt:'2026-10-25T00:00:00.000Z',updatedAt:'2026-10-25T00:00:00.000Z',expiresAt:'2026-11-25T00:00:00.000Z',policyVersion:DRAFT_POLICY_VERSION};
const changed=(text:string)=>changeQuoteProject(createProjectHistory(project),{answers:{offering:text}}).present;
test('saving is serial and an old response never replaces newer desired input',async()=>{
  let resolve!:(value:RemoteDraft)=>void;const calls:unknown[]=[];
  const queue=new DraftSync(async(id,body)=>{calls.push({id,body});return new Promise(done=>{resolve=done;});},()=>{});
  const first=changed('Café'),latest=changed('Café y postres');
  queue.attach(remote);queue.update(first,1);const pending=queue.flush();
  queue.update(latest,2);assert.equal(queue.state.status,'saving');assert.equal(calls.length,1);
  resolve({...remote,project:first,step:1,version:2});await pending;
  assert.equal(queue.state.status,'dirty');assert.equal(queue.state.remote?.version,2);
  const next=queue.flush();assert.equal(calls.length,2);
  assert.equal((calls[1] as {body:{expectedVersion:number}}).body.expectedVersion,2);
  resolve({...remote,project:latest,step:2,version:3});await next;
  assert.equal(queue.state.status,'saved');assert.equal(queue.state.remote?.project.answers.offering,'Café y postres');
});
test('conflicts and failures preserve local work and require explicit recovery or retry',async()=>{
  let fail=true,count=0;
  const queue=new DraftSync(async(_id,body)=>{count++;if(fail)throw Object.assign(new Error('Otra versión'),{status:409});return {...remote,project:body.project,step:body.step,version:2};},()=>{});
  queue.attach(remote);queue.update(changed('Carta nueva'),1);await queue.flush();
  assert.equal(queue.state.status,'conflict');queue.resume();await queue.flush();assert.equal(count,1);
  fail=false;queue.attach({...remote,version:2});queue.update(changed('Mi decisión revisada'),1);await queue.flush();assert.equal(queue.state.status,'saved');
  const offline=new DraftSync(async()=>{throw new Error('Sin red');},()=>{});offline.attach(remote);offline.update(changed('No perder'),1);await offline.flush();
  assert.equal(offline.state.status,'error');await offline.flush();assert.equal(offline.state.remote?.project.answers.offering,'');
  offline.pause();assert.equal(offline.state.status,'paused');offline.resume();assert.equal(offline.state.status,'dirty');
});
test('late writes cannot revive cleared drafts or overwrite another selected draft',async()=>{
  let resolve!:(value:RemoteDraft)=>void;
  const queue=new DraftSync(async()=>new Promise(done=>{resolve=done;}),()=>{});
  queue.attach(remote);queue.update(changed('Pendiente'),1);const pending=queue.flush();queue.clear();
  const otherProject=createQuoteProject(quoteDefaults);queue.attach({...remote,id:otherProject.id,project:otherProject});
  resolve({...remote,version:2});await pending;assert.equal(queue.state.remote?.id,otherProject.id);
  queue.update(changed('No pertenece a este borrador'),2);assert.equal(queue.state.status,'saved');
});
test('unmount invalidates callbacks and Strict Mode can reactivate the coordinator safely',async()=>{
  let resolve!:(value:RemoteDraft)=>void;let count=0;
  const queue=new DraftSync(async()=>new Promise(done=>{resolve=done;}),()=>{count++;});
  queue.attach(remote);queue.update(changed('Idea'),1);const pending=queue.flush();queue.dispose();const before=count;
  resolve({...remote,version:2});await pending;assert.equal(count,before);
  queue.activate();queue.attach(remote);assert.equal(count,before+1);
});
test('remote payloads require consent, a policy and an explicit account context; contacts are rejected',()=>{
  const body={project,step:0,consent:true,policyVersion:DRAFT_POLICY_VERSION,accountId:null};
  assert.equal(draftCreateSchema.safeParse(body).success,true);
  for(const extra of [{consent:false},{policyVersion:'old'},{step:6},{accountId:'admin'}, {project:{...project,answers:{...project.answers,email:'private@example.test'}}}])
    assert.equal(draftCreateSchema.safeParse({...body,...extra}).success,false);
  assert.equal(draftCreateSchema.safeParse({...body,price:1}).success,false);
  assert.equal(draftContentKey(project,1),draftContentKey({...project,visual:{...project.visual}},1));
  assert.equal(draftProgress(project)>=0&&draftProgress(project)<=100,true);
});
test('tab recovery rejects malformed, expired, mismatched and contact-bearing copies',()=>{
  const now=Date.parse('2026-10-25T00:00:00Z');
  const copy={project,step:1,draftId:project.id,serverVersion:1,policyVersion:DRAFT_POLICY_VERSION,expiresAt:'2026-10-26T00:00:00Z'};
  assert.equal(parseDraftRecovery(JSON.stringify(copy),now)?.draftId,project.id);
  for(const bad of [{...copy,expiresAt:'2026-10-24T00:00:00Z'},{...copy,draftId:crypto.randomUUID()},{...copy,email:'private@example.test'}])
    assert.equal(parseDraftRecovery(JSON.stringify(bad),now),null);
  assert.equal(parseDraftRecovery('{broken',now),null);assert.equal(parseDraftRecovery('x'.repeat(64001),now),null);
});
