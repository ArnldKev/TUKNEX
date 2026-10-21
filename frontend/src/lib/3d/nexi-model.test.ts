import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { animateNexi, createNexiModel, disposeNexi } from './nexi-model';
import type { NexiState } from './types';

test('the original canine mesh has finite geometry, a complete rig and sane seated proportions', () => {
  const rig = createNexiModel();
  try {
    let triangles = 0;
    rig.root.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      const position = part.geometry.attributes.position;
      for (const value of position.array) assert.equal(Number.isFinite(value), true);
      triangles += (part.geometry.index?.count ?? position.count) / 3;
    });
    const size = new THREE.Box3().setFromObject(rig.root).getSize(new THREE.Vector3());
    assert.ok(size.y > 2.5 && size.y < 3.5, 'seated dog fits the camera framing');
    assert.ok(size.y > size.x && size.x > 1, 'vertical canine silhouette includes the dropped ears');
    assert.ok(triangles > 1000 && triangles < 100000, 'model stays within a modest web geometry budget');
    assert.ok(rig.leftEar.parent === rig.head && rig.rightEar.parent === rig.head);
    assert.ok(rig.root.getObjectByName('rounded_black_nose'));
    assert.ok(rig.root.getObjectByName('short_muzzle_bridge'));
  } finally {
    disposeNexi(rig);
  }
});

test('canine interaction states animate safely and restore the paw after greeting', () => {
  const rig = createNexiModel();
  try {
    const states: NexiState[] = ['idle', 'wave', 'listening', 'thinking', 'celebrate'];
    for (const state of states)
      for (const time of [0, 1.5, 4.675, 20]) {
        animateNexi(rig, state, time, 1, -1);
        assert.ok(rig.eyes.scale.y >= 0.07 && rig.eyes.scale.y <= 1.01);
        [rig.root, rig.head, rig.leftEar, rig.rightEar, rig.leftPaw, rig.tail].forEach((part) => {
          assert.equal(
            [part.rotation.x, part.rotation.y, part.rotation.z, part.position.y].every(Number.isFinite),
            true,
          );
        });
      }
    animateNexi(rig, 'wave', 1);
    assert.notEqual(rig.leftPaw.rotation.x, 0);
    animateNexi(rig, 'idle', 2);
    assert.equal(rig.leftPaw.rotation.x, 0);
    assert.equal(rig.leftPaw.rotation.z, 0);
  } finally {
    disposeNexi(rig);
  }
});
