'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, KernelSize } from 'postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { pixelsToCubes } from '@/lib/pixelToCubes';
import { STYLE_RENDER } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { StyledInstances } from '@/components/viewer/StyledInstances';

/**
 * Превью 3D-модели для карточек галереи: тот же рендер-конфиг, что и
 * в редакторе, но без оверлеев и контролов.
 */
export function ModelPreview({
  pixelData,
  styleId
}: {
  pixelData: { size: number; pixels: number[][] };
  styleId: StyleId;
}) {
  const render = STYLE_RENDER[styleId] ?? STYLE_RENDER.voxel;
  return (
    <Canvas
      camera={{ position: [2.6, 2, 2.6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[render.background]} />
      <ambientLight intensity={render.ambient} />
      {render.directional > 0 && (
        <directionalLight position={[3, 4, 3]} intensity={render.directional} />
      )}
      <Suspense fallback={null}>
        <Environment preset={render.envPreset} environmentIntensity={render.envIntensity} background={false} />
        <SpinningPixels pixelData={pixelData} styleId={styleId} />
        {render.contactShadow > 0 && (
          <ContactShadows position={[0, -1.05, 0]} opacity={render.contactShadow} scale={5} blur={2} far={2} />
        )}
      </Suspense>
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          intensity={
            styleId === 'disco' ? 5.5 : styleId === 'neon' ? 1.4 : 0.4
          }
          luminanceThreshold={
            styleId === 'disco' ? 0.0 : styleId === 'neon' ? 0.2 : 0.85
          }
          luminanceSmoothing={styleId === 'disco' ? 0.7 : 0.4}
          kernelSize={styleId === 'disco' ? KernelSize.HUGE : KernelSize.LARGE}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}

function SpinningPixels({
  pixelData,
  styleId
}: {
  pixelData: { size: number; pixels: number[][] };
  styleId: StyleId;
}) {
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
        <StyledInstances cubes={cubes} styleId={styleId} />
      </group>
    </group>
  );
}
