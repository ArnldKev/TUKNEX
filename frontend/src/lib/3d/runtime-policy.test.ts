import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSceneQuality, SceneBudget } from './runtime-policy';

test('quality respects data saving and limited hardware without assuming GPU capability', () => {
  assert.equal(chooseSceneQuality({ saveData: true, hardwareConcurrency: 8 }).enabled, false);
  assert.equal(chooseSceneQuality({ deviceMemory: 2 }).enabled, false);
  assert.equal(chooseSceneQuality({ hardwareConcurrency: 2 }).enabled, false);
  const mobile = chooseSceneQuality({ hardwareConcurrency: 8, deviceMemory: 8, coarsePointer: true });
  assert.equal(mobile.enabled, true);
  assert.equal(mobile.dpr, 1);
  assert.equal(mobile.shadows, false);
  assert.equal(chooseSceneQuality({ hardwareConcurrency: 8, deviceMemory: 8 }).tier, 'high');
});
test('only one visible scene owns a slot and queued scenes resume after release', () => {
  const budget = new SceneBudget(1);
  const releaseHero = budget.request('hero');
  const releaseDog = budget.request('dog');
  assert.equal(budget.isGranted('hero'), true);
  assert.equal(budget.isGranted('dog'), false);
  releaseHero();
  assert.equal(budget.isGranted('dog'), true);
  releaseDog();
  assert.equal(budget.isGranted('dog'), false);
});
test('higher priority can preempt and obsolete cleanup cannot release a newer request', () => {
  const budget = new SceneBudget();
  const releaseOld = budget.request('hero');
  const releaseNew = budget.request('hero');
  releaseOld();
  assert.equal(budget.isGranted('hero'), true);
  const releaseForeground = budget.request('foreground', 10);
  assert.equal(budget.isGranted('foreground'), true);
  assert.equal(budget.isGranted('hero'), false);
  releaseForeground();
  assert.equal(budget.isGranted('hero'), true);
  releaseNew();
});
test('a scene removed while queued is never activated later', () => {
  const budget = new SceneBudget();
  const releaseA = budget.request('a');
  const releaseB = budget.request('b');
  releaseB();
  releaseA();
  assert.equal(budget.isGranted('b'), false);
});
