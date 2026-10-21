import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { cloneNexiRig, disposeNexiInstance } from './nexi-rig';
import { animateNexi } from './nexi-model';

test('the shipped GLB keeps its canine rig and can reuse geometry without sharing animated pivots', async () => {
  const bytes = readFileSync('public/models/nexi-original.glb');
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const asset = await new GLTFLoader().parseAsync(buffer, '');
  const first = cloneNexiRig(asset.scene),
    second = cloneNexiRig(asset.scene);
  try {
    assert.notEqual(first.head, second.head);
    assert.equal(first.leftEar.parent, first.head);
    const firstNose = first.root.getObjectByName('rounded_black_nose') as THREE.Mesh;
    const secondNose = second.root.getObjectByName('rounded_black_nose') as THREE.Mesh;
    assert.equal(firstNose.geometry, secondNose.geometry);
    const firstEmblem = first.root.getObjectByName('official_logo_surface') as THREE.Mesh;
    const secondEmblem = second.root.getObjectByName('official_logo_surface') as THREE.Mesh;
    assert.notEqual(firstEmblem.material, secondEmblem.material);
    animateNexi(first, 'wave', 1.5);
    assert.notEqual(first.leftPaw.rotation.x, second.leftPaw.rotation.x);
    animateNexi(first, 'idle', 2);
    assert.equal(first.leftPaw.rotation.x, 0);
    let disposedGeometry = false;
    firstNose.geometry.addEventListener('dispose', () => {
      disposedGeometry = true;
    });
    disposeNexiInstance(first);
    assert.equal(disposedGeometry, false, 'unmounting an instance must not destroy cached shared geometry');
  } finally {
    disposeNexiInstance(second);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    asset.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      geometries.add(mesh.geometry);
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) =>
        materials.add(material),
      );
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
});
