'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { animateNexi } from '@/lib/3d/nexi-model';
import { cloneNexiRig, disposeNexiInstance } from '@/lib/3d/nexi-rig';
import type { NexiState } from '@/lib/3d/types';
import { SceneLighting } from './scene-lighting';
import { ContextLifecycle } from './context-lifecycle';
import { useSceneQuality } from './scene-quality';

function NexiModel({
  state,
  angle,
  interactive,
  onReady,
}: {
  state: NexiState;
  angle: number;
  interactive: boolean;
  onReady: () => void;
}) {
  const asset = useGLTF('/models/nexi-original.glb');
  const rig = useMemo(() => cloneNexiRig(asset.scene), [asset.scene]);
  useEffect(() => {
    let active = true;
    const emblem = rig.root.getObjectByName('official_logo_surface') as
      THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | undefined;
    const texture = new THREE.TextureLoader().load('/brand-symbol.jpeg', (loaded) => {
      if (!active || !emblem) return;
      loaded.colorSpace = THREE.SRGBColorSpace;
      emblem.material.map = loaded;
      emblem.material.needsUpdate = true;
    });
    onReady();
    return () => {
      active = false;
      texture.dispose();
      disposeNexiInstance(rig);
    };
  }, [rig, onReady]);
  useFrame(({ clock, pointer }, delta) => {
    animateNexi(rig, state, clock.elapsedTime, interactive ? pointer.x : 0, interactive ? pointer.y : 0);
    rig.root.rotation.y = THREE.MathUtils.damp(rig.root.rotation.y, angle, 5, delta);
  });
  return <primitive object={rig.root} dispose={null} />;
}
function DogControls({ angle, compact, enabled }: { angle: number; compact: boolean; enabled: boolean }) {
  const ref = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.object.position.set(0, compact ? 2.12 : 2.05, compact ? 4.65 : 7);
    controls.target.set(0, compact ? 2.12 : 1.5, 0);
    controls.update();
  }, [angle, compact]);
  return (
    <OrbitControls
      ref={ref}
      target={[0, compact ? 2.12 : 1.5, 0]}
      enablePan={false}
      enableZoom={false}
      enabled={enabled}
      minPolarAngle={0.85}
      maxPolarAngle={1.65}
      enableDamping
      dampingFactor={0.07}
    />
  );
}
export default function NexiSceneCanvas({
  state,
  compact,
  interactive,
  angle,
  onFailure,
}: {
  state: NexiState;
  compact: boolean;
  interactive: boolean;
  angle: number;
  onFailure: () => void;
}) {
  const quality = useSceneQuality(),
    [ready, setReady] = useState(false);
  const modelReady = useCallback(() => setReady(true), []);
  return (
    <div className="tnx-canvas-shell" data-model-ready={ready}>
      {!ready && (
        <div className="tnx-model-loading" role="status">
          <img src="/images/nexi-fallback.svg" alt="" width="320" height="360" />
          <span>Preparando a NEXI…</span>
        </div>
      )}
      <Canvas
        shadows={quality.shadows && !compact}
        dpr={quality.dpr}
        camera={{ position: compact ? [0, 2.12, 4.65] : [0, 2.05, 7], fov: compact ? 36 : 34 }}
        gl={{ alpha: true, antialias: quality.antialias && !compact, powerPreference: 'low-power' }}
        style={{ opacity: ready ? 1 : 0 }}
        aria-hidden="true"
      >
        <ContextLifecycle onFailure={onFailure} />
        <SceneLighting dog shadows={quality.shadows} shadowSize={quality.shadowSize} />
        <Suspense fallback={null}>
          <NexiModel state={state} angle={angle} interactive={interactive} onReady={modelReady} />
        </Suspense>
        <DogControls angle={angle} compact={compact} enabled={interactive && !compact} />
      </Canvas>
    </div>
  );
}
