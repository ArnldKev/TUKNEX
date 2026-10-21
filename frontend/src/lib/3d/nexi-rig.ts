import * as THREE from 'three';
import type { NexiRig } from './nexi-model';

function pivot(root: THREE.Object3D, name: string): THREE.Object3D {
  const node = root.getObjectByName(name);
  if (!node) throw new Error('NEXI GLB is missing rig node: ' + name);
  return node;
}
/** The GLB keeps the editable named pivots; clones share immutable geometry/materials. */
export function cloneNexiRig(source: THREE.Object3D): NexiRig {
  const clone = source.clone(true);
  const root = pivot(clone, 'NEXI_original_procedural_dog');
  root.removeFromParent();
  const emblem = root.getObjectByName('official_logo_surface') as THREE.Mesh | undefined;
  if (emblem)
    emblem.material = Array.isArray(emblem.material)
      ? emblem.material.map((material) => material.clone())
      : emblem.material.clone();
  return {
    root,
    head: pivot(root, 'curious_head_pivot'),
    leftEar: pivot(root, 'left_drooping_ear_pivot'),
    rightEar: pivot(root, 'right_drooping_ear_pivot'),
    leftPaw: pivot(root, 'front_leg_left_pivot'),
    rightPaw: pivot(root, 'front_leg_right_pivot'),
    tail: pivot(root, 'wagging_curled_tail'),
    eyes: pivot(root, 'blink_eyes'),
  };
}
export function disposeNexiInstance(rig: NexiRig) {
  const emblem = rig.root.getObjectByName('official_logo_surface') as THREE.Mesh | undefined;
  if (emblem)
    (Array.isArray(emblem.material) ? emblem.material : [emblem.material]).forEach((material) =>
      material.dispose(),
    );
}
