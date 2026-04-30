'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Instances, Instance } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { pixelsToCubes } from '@/lib/pixelToCubes';

/**
 * Превью 3D-модели из сохранённых пиксельных данных. Используется в карточках
 * галереи — рендерит ту же воксельную геометрию что и редактор, без .glb.
 */
export function ModelPreview({ pixelData }: { pixelData: { size: number; pixels: number[][] } }) {
  return (
    <Canvas
      camera={{ position: [2.6, 2, 2.6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      flat
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 3]} intensity={0.4} />
      <Suspense fallback={null}>
        <Environment preset="apartment" environmentIntensity={0.05} background={false} />
        <SpinningPixels pixelData={pixelData} />
        <ContactShadows position={[0, -1.05, 0]} opacity={0.35} scale={5} blur={2} far={2} />
      </Suspense>
    </Canvas>
  );
}

function SpinningPixels({ pixelData }: { pixelData: { size: number; pixels: number[][] } }) {
  const ref = useRef<THREE.Group>(null);
  const { cubes, fit } = useMemo(
    () => pixelsToCubes(pixelData.pixels, pixelData.size),
    [pixelData]
  );
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5;
  });
  if (cubes.length === 0) return null;
  return (
    <group ref={ref}>
      <group scale={fit.scale} position={[-fit.cx * fit.scale, -fit.cy * fit.scale, -fit.cz * fit.scale]}>
        <Instances limit={4096} range={cubes.length} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.95, 0.95]} />
          <meshStandardMaterial roughness={0.95} metalness={0} />
          {cubes.map((c, i) => (
            <Instance key={i} position={c.pos} color={c.color} />
          ))}
        </Instances>
      </group>
    </group>
  );
}
