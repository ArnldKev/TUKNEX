'use client';

export function SceneLighting({
  dog = false,
  shadows = true,
  shadowSize = 1024,
}: {
  dog?: boolean;
  shadows?: boolean;
  shadowSize?: number;
}) {
  return (
    <>
      <ambientLight intensity={0.7} color="#f6faff" />
      <hemisphereLight args={['#f6fbff', '#cad7cd', 1.15]} />
      <directionalLight
        position={[-3, 6, 5]}
        intensity={3}
        color="#fff4df"
        castShadow={shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-normalBias={0.035}
        shadow-bias={-0.0002}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[4, 3, -3]} intensity={dog ? 1.25 : 2} color="#bdece8" />
      <pointLight position={[-4, 1, -1]} intensity={5} color="#53ded0" distance={9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={dog ? 0.13 : 0.1} />
      </mesh>
    </>
  );
}
