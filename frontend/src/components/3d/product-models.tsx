'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { createInterfaceTexture, createPanelTexture } from '@/lib/3d/interface-textures';
import type { HeroSolution, ServiceKind } from '@/lib/3d/types';

function Keyboard() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const transform = new THREE.Object3D();
    for (let row = 0; row < 5; row++)
      for (let column = 0; column < 14; column++) {
        transform.position.set(-1.67 + column * 0.256, 0.232, -0.51 + row * 0.213);
        transform.updateMatrix();
        ref.current.setMatrixAt(row * 14 + column, transform.matrix);
      }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 70]} castShadow>
      <boxGeometry args={[0.214, 0.025, 0.156]} />
      <meshStandardMaterial color="#3b505d" roughness={0.7} />
    </instancedMesh>
  );
}

export function ProductTerminal({ kind, desktop = false }: { kind: ServiceKind; desktop?: boolean }) {
  const texture = useMemo(() => createInterfaceTexture(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <group position={[0, desktop ? 2.0 : 1.62, desktop ? 0 : -0.74]} rotation={[desktop ? 0 : -0.1, 0, 0]}>
        <RoundedBox args={[4.2, 2.77, 0.18]} radius={0.13} smoothness={3} castShadow>
          <meshStandardMaterial color="#13364a" metalness={0.65} roughness={0.33} />
        </RoundedBox>
        <mesh position={[0, 0, 0.101]}>
          <planeGeometry args={[3.94, 2.5]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.32, 0.103]}>
          <sphereGeometry args={[0.022, 10, 8]} />
          <meshStandardMaterial color="#7d959d" />
        </mesh>
        <mesh position={[0, -1.32, 0.104]}>
          <boxGeometry args={[0.45, 0.014, 0.01]} />
          <meshStandardMaterial color="#50cbc2" emissive="#06aaa7" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {desktop ? (
        <>
          <RoundedBox args={[0.2, 0.8, 0.24]} radius={0.04} position={[0, 0.48, -0.1]} castShadow>
            <meshStandardMaterial color="#8ba5aa" metalness={0.8} roughness={0.3} />
          </RoundedBox>
          <RoundedBox args={[1.4, 0.12, 0.86]} radius={0.08} position={[0, 0.1, 0.1]} castShadow>
            <meshStandardMaterial color="#d4e4e4" metalness={0.75} roughness={0.25} />
          </RoundedBox>
        </>
      ) : (
        <>
          <RoundedBox
            args={[4.42, 0.16, 2.44]}
            radius={0.09}
            smoothness={3}
            position={[0, 0.13, 0.25]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#adc3c9" metalness={0.78} roughness={0.3} />
          </RoundedBox>
          <Keyboard />
          <RoundedBox args={[1.38, 0.009, 0.5]} radius={0.06} position={[0, 0.218, 1.01]}>
            <meshStandardMaterial color="#9cb7be" metalness={0.8} roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.12, 1.48]}>
            <boxGeometry args={[0.65, 0.035, 0.009]} />
            <meshStandardMaterial color="#5b7882" />
          </mesh>
        </>
      )}
    </group>
  );
}

export function FloatingPanel({
  kind,
  position,
  selected,
  onSelect,
  index = 0,
}: {
  kind: HeroSolution;
  position: [number, number, number];
  selected?: boolean;
  onSelect?: (kind: HeroSolution) => void;
  index?: number;
}) {
  const ref = useRef<THREE.Group>(null),
    [hovered, setHovered] = useState(false);
  useCursor(hovered && !!onSelect);
  const invalidate = useThree((state) => state.invalidate);
  const texture = useMemo(() => createPanelTexture(kind), [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hovered ? 1.06 : selected ? 1.025 : 1;
    ref.current.scale.setScalar(THREE.MathUtils.damp(ref.current.scale.x, target, 12, delta));
    if (Math.abs(ref.current.scale.x - target) > 0.0005) invalidate();
  });
  return (
    <group
      ref={ref}
      position={position}
      rotation={[0, -0.14, -0.03 + index * 0.035]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(kind);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <RoundedBox args={[2.08, 1.0, 0.1]} radius={0.1} smoothness={3} castShadow>
        <meshPhysicalMaterial
          color={selected ? '#93e6d9' : '#d9f5ef'}
          transparent
          opacity={0.9}
          metalness={0.15}
          roughness={0.24}
          clearcoat={0.6}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.059]}>
        <planeGeometry args={[1.99, 0.91]} />
        <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={0.98} />
      </mesh>
      {selected && (
        <mesh position={[-0.88, 0.35, 0.07]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshStandardMaterial color="#00c6ad" emissive="#00c6ad" emissiveIntensity={0.35} />
        </mesh>
      )}
    </group>
  );
}

export function ProductBottle({
  position,
  color = '#b4d0bd',
  size = 1,
}: {
  position: [number, number, number];
  color?: string;
  size?: number;
}) {
  return (
    <group position={position} scale={size}>
      <RoundedBox args={[0.57, 0.92, 0.43]} radius={0.1} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.44} metalness={0.1} />
      </RoundedBox>
      <RoundedBox args={[0.37, 0.15, 0.32]} radius={0.035} position={[0, 1.03, 0]} castShadow>
        <meshStandardMaterial color="#194c4c" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.53, 0.218]}>
        <planeGeometry args={[0.44, 0.32]} />
        <meshStandardMaterial color="#f7f8ec" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.54, 0.222]}>
        <planeGeometry args={[0.2, 0.023]} />
        <meshStandardMaterial color="#346b5c" />
      </mesh>
    </group>
  );
}

export function ShoppingBag({ position = [2, 0.1, 0.6] }: { position?: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.2, -0.07]}>
      <RoundedBox args={[1.03, 1.2, 0.48]} radius={0.075} position={[0, 0.65, 0]} castShadow>
        <meshStandardMaterial color="#2ab6a8" roughness={0.58} />
      </RoundedBox>
      <mesh position={[0, 1.34, 0.02]}>
        <torusGeometry args={[0.26, 0.028, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#0c5f67" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.73, 0.25]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.28, 0.28, 0.015]} />
        <meshStandardMaterial color="#e5fff3" />
      </mesh>
    </group>
  );
}

export function ServiceDevice({ kind }: { kind: ServiceKind }) {
  if (kind === 'catalog')
    return (
      <group>
        <ProductTerminal kind="catalog" desktop />
        <ProductBottle position={[-2.45, 0, 0.55]} color="#c0d7a6" size={1.15} />
        <ProductBottle position={[2.18, 0, 0.4]} color="#d8c2a3" size={0.85} />
        <ProductBottle position={[2.73, 0, 0.27]} color="#9ecbc6" size={0.65} />
      </group>
    );
  return (
    <group>
      <ProductTerminal kind={kind} desktop={kind === 'system'} />
      {kind === 'store' && <ShoppingBag position={[2.36, 0.02, 0.6]} />}
      {kind === 'system' && <FloatingPanel kind="system" position={[2.3, 1.0, 0.9]} index={2} />}
      {kind === 'business' && (
        <group position={[2.1, 0.38, 0.65]} rotation={[0, -0.25, 0.1]}>
          <RoundedBox args={[0.76, 1.42, 0.09]} radius={0.1} position={[0, 0.7, 0]} castShadow>
            <meshStandardMaterial color="#0e3449" roughness={0.4} metalness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0.7, 0.052]}>
            <planeGeometry args={[0.64, 1.2]} />
            <meshStandardMaterial color="#d8f6eb" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.85, 0.057]}>
            <planeGeometry args={[0.38, 0.41]} />
            <meshStandardMaterial color="#2cb5a6" />
          </mesh>
          <mesh position={[0, 0.38, 0.058]}>
            <planeGeometry args={[0.42, 0.1]} />
            <meshStandardMaterial color="#133e4e" />
          </mesh>
        </group>
      )}
    </group>
  );
}
