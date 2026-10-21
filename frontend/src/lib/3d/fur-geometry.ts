import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function sculptedEllipsoid(scale: THREE.Vector3, waves = 0.025, seed = 0) {
  const geometry = new THREE.SphereGeometry(1, 24, 18);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const longitude = Math.atan2(z, x),
      latitude = Math.acos(Math.max(-1, Math.min(1, y)));
    const ripple =
      1 + waves * Math.sin(longitude * 13 + seed + latitude * 3) * Math.sin(latitude * 11 + seed);
    position.setXYZ(i, x * scale.x * ripple, y * scale.y * ripple, z * scale.z * ripple);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function seeded(index: number, seed: number) {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Short S-shaped locks lie on a sculpted coat; they are real mesh geometry. */
export function curlyCoat(scale: THREE.Vector3, count: number, seed: number, length = 0.13) {
  const geometries: THREE.BufferGeometry[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) * 2) / count;
    const radius = Math.sqrt(1 - y * y),
      angle = i * golden + seed;
    const normal = new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    const center = new THREE.Vector3(normal.x * scale.x, normal.y * scale.y, normal.z * scale.z);
    const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0.1, 1, 0.05)).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const size = length * (0.7 + seeded(i, seed) * 0.6);
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const point = center
        .clone()
        .addScaledVector(tangent, (t - 0.5) * size * 1.5)
        .addScaledVector(bitangent, Math.sin(t * Math.PI * 2.1) * size * 0.22)
        .addScaledVector(normal, 0.012 + Math.sin(t * Math.PI) * size * 0.19);
      points.push(point);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    geometries.push(new THREE.TubeGeometry(curve, 8, 0.008 + seeded(i, seed + 3) * 0.005, 3, false));
  }
  const merged = mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

export function curveTube(points: number[][], radius: number, segments = 22) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
    segments,
    radius,
    6,
    false,
  );
}
