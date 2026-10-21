'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ServiceDevice } from './product-models';
import { SceneLighting } from './scene-lighting';
import { ContextLifecycle } from './context-lifecycle';
import { DemandInteractions } from './demand-interactions';
import { useSceneQuality } from './scene-quality';
import type { ServiceKind } from '@/lib/3d/types';

function ServiceComposition({ kind }: { kind: ServiceKind }) {
  const ref = useRef<THREE.Group>(null),
    { viewport, invalidate } = useThree();
  useFrame(({ pointer }, delta) => {
    if (!ref.current) return;
    const target = pointer.x * 0.12;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, target, 8, delta);
    if (Math.abs(ref.current.rotation.y - target) > 0.0005) invalidate();
  });
  return (
    <group ref={ref} scale={Math.min(1, viewport.width / 6.7)}>
      <ServiceDevice key={kind} kind={kind} />
    </group>
  );
}

export default function ServiceSceneCanvas({
  kind,
  onFailure,
}: {
  kind: ServiceKind;
  onFailure: () => void;
}) {
  const quality = useSceneQuality();
  return (
    <Canvas
      frameloop="demand"
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{ position: [3.3, 3.0, 7.7], fov: 34 }}
      gl={{ alpha: true, antialias: quality.antialias, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <ContextLifecycle onFailure={onFailure} />
      <SceneLighting shadows={quality.shadows} shadowSize={quality.shadowSize} />
      <DemandInteractions />
      <ServiceComposition kind={kind} />
      <OrbitControls
        target={[0, 1.45, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.8}
        maxPolarAngle={1.6}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.8}
        enableDamping
      />
    </Canvas>
  );
}
