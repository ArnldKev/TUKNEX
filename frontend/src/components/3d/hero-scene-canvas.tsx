'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingPanel, ProductTerminal, ShoppingBag } from './product-models';
import { SceneLighting } from './scene-lighting';
import { ContextLifecycle } from './context-lifecycle';
import { DemandInteractions } from './demand-interactions';
import { useSceneQuality } from './scene-quality';
import type { HeroSolution } from '@/lib/3d/types';

function HeroComposition({
  selected,
  onSelect,
}: {
  selected: HeroSolution;
  onSelect: (kind: HeroSolution) => void;
}) {
  const ref = useRef<THREE.Group>(null),
    { viewport, invalidate } = useThree();
  const scale = Math.min(1, viewport.width / 7.4);
  useFrame(({ pointer }, delta) => {
    if (!ref.current) return;
    const targetY = pointer.x * 0.08,
      targetX = -pointer.y * 0.025;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, targetY, 8, delta);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, targetX, 8, delta);
    if (Math.abs(ref.current.rotation.y - targetY) + Math.abs(ref.current.rotation.x - targetX) > 0.0005)
      invalidate();
  });
  return (
    <group ref={ref} scale={scale}>
      <ProductTerminal kind={selected === 'web' ? 'business' : selected} desktop={selected === 'system'} />
      <FloatingPanel
        kind="web"
        position={[-2.48, 2.95, 0.5]}
        selected={selected === 'web'}
        onSelect={onSelect}
      />
      <FloatingPanel
        kind="store"
        position={[2.48, 2.53, 0.4]}
        selected={selected === 'store'}
        onSelect={onSelect}
        index={1}
      />
      <FloatingPanel
        kind="system"
        position={[2.08, 0.79, 1.7]}
        selected={selected === 'system'}
        onSelect={onSelect}
        index={2}
      />
      {selected === 'store' && <ShoppingBag position={[-2.2, 0.09, 0.72]} />}
      <mesh position={[-2.4, 0.72, 0.8]} rotation={[0.38, 0.4, 0.3]} castShadow>
        <icosahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#5ed7c7" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[1.75, 3.65, -1.8]} castShadow>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#dfc5a7" metalness={0.25} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function HeroSceneCanvas({
  selected,
  onSelect,
  onFailure,
}: {
  selected: HeroSolution;
  onSelect: (kind: HeroSolution) => void;
  onFailure: () => void;
}) {
  const quality = useSceneQuality();
  return (
    <Canvas
      frameloop="demand"
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{ position: [4.7, 3.4, 8.5], fov: 36 }}
      gl={{ alpha: true, antialias: quality.antialias, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <ContextLifecycle onFailure={onFailure} />
      <SceneLighting shadows={quality.shadows} shadowSize={quality.shadowSize} />
      <DemandInteractions />
      <HeroComposition selected={selected} onSelect={onSelect} />
      <OrbitControls
        target={[0, 1.35, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.9}
        maxPolarAngle={1.55}
        minAzimuthAngle={-0.25}
        maxAzimuthAngle={0.8}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
