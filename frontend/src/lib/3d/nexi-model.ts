import * as THREE from 'three';
import { curlyCoat, curveTube, sculptedEllipsoid } from './fur-geometry';
import type { NexiState } from './types';
import { brand } from '../../config/brand';

export interface NexiRig {
  root: THREE.Object3D;
  head: THREE.Object3D;
  leftEar: THREE.Object3D;
  rightEar: THREE.Object3D;
  leftPaw: THREE.Object3D;
  rightPaw: THREE.Object3D;
  tail: THREE.Object3D;
  eyes: THREE.Object3D;
}

const cream = '#f1e5cc',
  lightCream = '#fff4df',
  warmCream = '#e1ccaa',
  earCream = '#d7bb92';

/** Original, editable canine model. The photographs guide anatomy, never become billboards. */
export function createNexiModel(): NexiRig {
  const root = new THREE.Group();
  root.name = 'NEXI_original_procedural_dog';
  const materials = {
    coat: new THREE.MeshStandardMaterial({ color: cream, roughness: 0.92 }),
    curls: new THREE.MeshStandardMaterial({ color: lightCream, roughness: 1 }),
    warm: new THREE.MeshStandardMaterial({ color: warmCream, roughness: 0.95 }),
    ear: new THREE.MeshStandardMaterial({ color: earCream, roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: '#172026', roughness: 0.5 }),
    eye: new THREE.MeshPhysicalMaterial({ color: '#1a1210', roughness: 0.1, clearcoat: 1 }),
    iris: new THREE.MeshStandardMaterial({ color: '#61462e', roughness: 0.4 }),
    shine: new THREE.MeshBasicMaterial({ color: '#fffdf5' }),
    pink: new THREE.MeshStandardMaterial({ color: '#dc9c9c', roughness: 0.7 }),
    navy: new THREE.MeshStandardMaterial({ color: brand.colors.navy, roughness: 0.6 }),
    teal: new THREE.MeshStandardMaterial({ color: brand.colors.turquoise, metalness: 0.25, roughness: 0.3 }),
  };

  function mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: number[],
    name: string,
  ) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(position[0], position[1], position[2]);
    part.name = name;
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }
  function furry(
    parent: THREE.Object3D,
    position: number[],
    scale: number[],
    name: string,
    count = 65,
    tint: keyof typeof materials = 'coat',
    seed = 1,
  ) {
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    group.name = name;
    const vector = new THREE.Vector3(scale[0], scale[1], scale[2]);
    mesh(group, sculptedEllipsoid(vector, 0.045, seed), materials[tint], [0, 0, 0], `${name}_sculpt`);
    if (count > 0)
      mesh(
        group,
        curlyCoat(vector, Math.round(count * 0.75), seed, name.includes('ear') ? 0.17 : 0.13),
        materials.curls,
        [0, 0, 0],
        `${name}_curled_locks`,
      );
    parent.add(group);
    return group;
  }

  const body = furry(root, [0, 1.02, -0.04], [0.55, 0.82, 0.4], 'seated_torso', 150, 'coat', 3);
  const bodyPosition = (body.children[0] as THREE.Mesh).geometry.attributes.position;
  for (let i = 0; i < bodyPosition.count; i++) {
    const y = bodyPosition.getY(i);
    bodyPosition.setX(i, bodyPosition.getX(i) * (1 - y * 0.17));
  }
  (body.children[0] as THREE.Mesh).geometry.computeVertexNormals();
  furry(root, [-0.46, 0.45, -0.17], [0.31, 0.43, 0.34], 'left_seated_haunch', 44, 'warm', 8);
  furry(root, [0.46, 0.45, -0.17], [0.31, 0.43, 0.34], 'right_seated_haunch', 44, 'coat', 10);
  furry(root, [-0.55, 0.13, 0.05], [0.25, 0.14, 0.32], 'left_hind_foot', 18, 'coat', 6);
  furry(root, [0.55, 0.13, 0.05], [0.25, 0.14, 0.32], 'right_hind_foot', 18, 'coat', 7);

  function foreleg(side: number) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.29, 1.24, 0.21);
    pivot.name = side < 0 ? 'front_leg_left_pivot' : 'front_leg_right_pivot';
    furry(pivot, [0, -0.49, 0.09], [0.17, 0.53, 0.18], 'front_foreleg', 44, 'coat', side + 12);
    furry(pivot, [0, -1.08, 0.23], [0.23, 0.15, 0.29], 'soft_front_paw', 25, 'coat', side + 16);
    for (let i = 0; i < 2; i++)
      mesh(
        pivot,
        curveTube(
          [
            [i * 0.12 - 0.06, -1.12, 0.46],
            [i * 0.12 - 0.06, -1.04, 0.49],
          ],
          0.006,
          5,
        ),
        materials.warm,
        [0, 0, 0],
        'paw_toe_seam',
      );
    root.add(pivot);
    return pivot;
  }
  const leftPaw = foreleg(-1),
    rightPaw = foreleg(1);

  furry(root, [0, 1.75, 0.01], [0.36, 0.35, 0.32], 'neck_ruff', 48, 'coat', 9);
  const collar = mesh(
    root,
    new THREE.CylinderGeometry(0.365, 0.395, 0.14, 36),
    materials.navy,
    [0, 1.73, 0.01],
    'navy_tech_collar',
  );
  collar.scale.z = 0.92;
  const piping = mesh(
    root,
    new THREE.TorusGeometry(0.38, 0.016, 6, 36),
    materials.teal,
    [0, 1.79, 0.01],
    'turquoise_collar_piping',
  );
  piping.rotation.x = Math.PI / 2;
  piping.scale.y = 0.92;
  const tag = mesh(
    root,
    new THREE.CylinderGeometry(0.112, 0.112, 0.036, 32),
    materials.teal,
    [0, 1.61, 0.403],
    'TUKNEX_emblem_mount',
  );
  tag.rotation.x = Math.PI / 2;
  // The official JPEG is attached by the client scene; exported geometry stays self-contained.
  const emblem = mesh(
    root,
    new THREE.CircleGeometry(0.084, 32),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    [0, 1.61, 0.423],
    'official_logo_surface',
  );
  emblem.userData.officialTexturePath = '/brand-symbol.jpeg';

  const head = new THREE.Group();
  head.position.set(0, 2.13, 0.03);
  head.name = 'curious_head_pivot';
  root.add(head);
  furry(head, [0, 0.13, 0.0], [0.57, 0.57, 0.44], 'fluffy_cranium', 115, 'coat', 4);
  furry(head, [0, 0.58, 0.0], [0.39, 0.21, 0.31], 'wavy_crown', 38, 'coat', 2);
  furry(head, [-0.27, 0.28, 0.36], [0.24, 0.15, 0.14], 'left_fluffy_brow', 18, 'coat', 7);
  furry(head, [0.27, 0.28, 0.36], [0.24, 0.15, 0.14], 'right_fluffy_brow', 18, 'coat', 6);

  function ear(side: number) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.48, 0.44, -0.015);
    pivot.rotation.z = side * 0.16;
    pivot.name = side < 0 ? 'left_drooping_ear_pivot' : 'right_drooping_ear_pivot';
    const part = furry(
      pivot,
      [side * 0.08, -0.41, 0.015],
      [0.24, 0.55, 0.2],
      'long_wavy_ear',
      54,
      'ear',
      side + 20,
    );
    part.rotation.z = side * 0.05;
    furry(pivot, [side * 0.02, -0.06, 0.01], [0.25, 0.22, 0.22], 'cream_ear_root', 20, 'coat', side + 22);
    head.add(pivot);
    return pivot;
  }
  const leftEar = ear(-1),
    rightEar = ear(1);

  const eyes = new THREE.Group();
  eyes.name = 'blink_eyes';
  head.add(eyes);
  for (const side of [-1, 1]) {
    mesh(
      eyes,
      sculptedEllipsoid(new THREE.Vector3(0.146, 0.166, 0.082), 0),
      materials.iris,
      [side * 0.275, 0.14, 0.42],
      'soft_brown_eye_rim',
    );
    mesh(
      eyes,
      sculptedEllipsoid(new THREE.Vector3(0.119, 0.14, 0.092), 0),
      materials.eye,
      [side * 0.275, 0.145, 0.457],
      'large_dark_eye',
    );
    mesh(
      eyes,
      new THREE.SphereGeometry(0.029, 12, 8),
      materials.shine,
      [side * 0.275 - 0.034, 0.19, 0.54],
      'eye_softbox_reflection',
    );
    mesh(
      eyes,
      new THREE.SphereGeometry(0.012, 10, 6),
      materials.shine,
      [side * 0.275 + 0.036, 0.102, 0.548],
      'eye_secondary_reflection',
    );
  }

  furry(head, [0, -0.25, 0.37], [0.38, 0.29, 0.34], 'short_muzzle_bridge', 45, 'warm', 2);
  furry(head, [-0.16, -0.22, 0.56], [0.235, 0.18, 0.23], 'left_whisker_muzzle', 25, 'coat', 12);
  furry(head, [0.16, -0.22, 0.56], [0.235, 0.18, 0.23], 'right_whisker_muzzle', 25, 'coat', 14);
  mesh(
    head,
    sculptedEllipsoid(new THREE.Vector3(0.165, 0.114, 0.115), 0.018),
    materials.dark,
    [0, -0.15, 0.775],
    'rounded_black_nose',
  );
  mesh(
    head,
    sculptedEllipsoid(new THREE.Vector3(0.06, 0.018, 0.012), 0),
    new THREE.MeshStandardMaterial({ color: '#687279', roughness: 0.5 }),
    [-0.04, -0.114, 0.875],
    'nose_soft_highlight',
  );
  mesh(
    head,
    curveTube(
      [
        [0, -0.23, 0.79],
        [0, -0.31, 0.77],
        [-0.12, -0.35, 0.7],
      ],
      0.013,
      12,
    ),
    materials.dark,
    [0, 0, 0],
    'left_smile',
  );
  mesh(
    head,
    curveTube(
      [
        [0, -0.31, 0.77],
        [0.12, -0.35, 0.7],
      ],
      0.013,
      10,
    ),
    materials.dark,
    [0, 0, 0],
    'right_smile',
  );
  mesh(
    head,
    sculptedEllipsoid(new THREE.Vector3(0.105, 0.078, 0.046), 0),
    materials.dark,
    [0, -0.375, 0.672],
    'gentle_open_mouth',
  );
  mesh(
    head,
    sculptedEllipsoid(new THREE.Vector3(0.066, 0.086, 0.035), 0),
    materials.pink,
    [0, -0.407, 0.72],
    'small_pink_tongue',
  );
  furry(head, [0, -0.43, 0.39], [0.26, 0.14, 0.21], 'soft_chin_beard', 24, 'coat', 2);
  for (const side of [-1, 1])
    for (let j = 0; j < 3; j++)
      mesh(
        head,
        new THREE.SphereGeometry(0.009, 8, 6),
        materials.dark,
        [side * (0.17 + (j % 2) * 0.05), -0.2 - j * 0.035, 0.755 - (j % 2) * 0.02],
        'whisker_follicle',
      );

  const tail = new THREE.Group();
  tail.position.set(0.36, 0.59, -0.39);
  tail.name = 'wagging_curled_tail';
  root.add(tail);
  mesh(
    tail,
    curveTube(
      [
        [0, 0, 0],
        [0.38, 0.15, -0.23],
        [0.58, 0.52, -0.2],
        [0.47, 0.86, -0.13],
        [0.24, 0.87, -0.04],
      ],
      0.115,
      28,
    ),
    materials.coat,
    [0, 0, 0],
    'curl_tail_core',
  );
  furry(tail, [0.27, 0.87, -0.045], [0.16, 0.14, 0.15], 'tail_fluffy_tip', 16, 'coat', 4);
  root.userData = {
    author: 'TUKNEX',
    license: 'Original procedural geometry supplied with the project',
    reference: 'Two client-supplied canine photographs',
    version: 1,
  };
  root.traverse((part) => {
    if (!(part instanceof THREE.Mesh)) return;
    part.geometry.normalizeNormals();
    const normal = part.geometry.attributes.normal,
      position = part.geometry.attributes.position;
    for (let i = 0; i < normal.count; i++) {
      if (Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) > 0.5) continue;
      const direction = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).normalize();
      normal.setXYZ(i, direction.x || 0, direction.lengthSq() ? direction.y : 1, direction.z || 0);
    }
  });
  return { root, head, leftEar, rightEar, leftPaw, rightPaw, tail, eyes };
}

export function animateNexi(rig: NexiRig, state: NexiState, time: number, pointerX = 0, pointerY = 0) {
  const thinking = state === 'thinking',
    listening = state === 'listening',
    celebrating = state === 'celebrate';
  rig.root.position.y = Math.sin(time * (celebrating ? 5 : 1.6)) * (celebrating ? 0.045 : 0.008);
  rig.head.rotation.z = (thinking ? -0.16 : listening ? 0.13 : 0.025) + Math.sin(time * 0.85) * 0.025;
  rig.head.rotation.y =
    THREE.MathUtils.clamp(pointerX * 0.16, -0.18, 0.18) + (thinking ? Math.sin(time * 0.6) * 0.08 : 0);
  rig.head.rotation.x = THREE.MathUtils.clamp(-pointerY * 0.065, -0.09, 0.09) + (listening ? -0.045 : 0);
  rig.leftEar.rotation.z = -0.16 + Math.sin(time * 1.4) * 0.025;
  rig.rightEar.rotation.z = 0.16 + Math.sin(time * 1.4 + 1.2) * 0.025;
  rig.tail.rotation.z =
    Math.sin(time * (celebrating ? 11 : listening ? 5 : 3.8)) * (celebrating ? 0.38 : 0.18);
  rig.tail.rotation.y = Math.sin(time * 3.5) * 0.16;
  rig.leftPaw.rotation.z = state === 'wave' ? -0.95 + Math.sin(time * 5.5) * 0.16 : 0;
  rig.leftPaw.rotation.x = state === 'wave' ? -0.55 : 0;
  rig.rightPaw.rotation.z = celebrating ? 0.1 + Math.sin(time * 5) * 0.03 : 0;
  const blinkPhase = time % 4.8;
  const blink = blinkPhase > 4.55 ? Math.max(0.07, Math.abs(blinkPhase - 4.675) / 0.125) : 1;
  // Keep eye centers steady while scaling eyelids/eyeballs around brow height.
  rig.eyes.scale.y = blink;
  rig.eyes.position.y = 0.145 * (1 - blink);
}

export function disposeNexi(rig: NexiRig) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  rig.root.traverse((part) => {
    if (part instanceof THREE.Mesh) {
      geometries.add(part.geometry);
      (Array.isArray(part.material) ? part.material : [part.material]).forEach((material) =>
        materials.add(material),
      );
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
