'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { pixelsToCubes } from '@/lib/pixelToCubes';
import { STYLE_RENDER } from '@/lib/styles';
import { StyledInstances } from '@/components/viewer/StyledInstances';
import { LOGO_PIXELS, LOGO_SIZE, LOGO_STYLE_ID } from '@/lib/logoMark';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Tailwind size class — controls the rendered square (e.g. "h-9 w-9", "h-12 w-12"). */
  sizeClass?: string;
};

/**
 * Small rotating 3D brand mark used in headers in place of the "Pixle"
 * wordmark. Renders a baked-in pixel-art shape (see lib/logoMark.ts) in
 * the Mercury style with a transparent background and slow auto-spin.
 * No OrbitControls, no postprocessing — keeps GPU cost minimal so we
 * can run it on every page without affecting interaction.
 */
export function LogoMark({ className, sizeClass = 'h-10 w-10' }: Props) {
  return (
    <span
      role="img"
      aria-label="Pixle"
      className={cn('inline-block shrink-0 align-middle', sizeClass, className)}
    >
      <Canvas
        // Tighter than ModelPreview's preset so the mark fills the small
        // square, but with enough headroom that the model's diagonal
        // (~√2 of its side) doesn't clip while spinning around Y.
        camera={{ position: [2.2, 1.6, 2.2], fov: 36 }}
        // Render at 2-3x device pixel ratio so the small 80px box stays
        // crisp on retina screens — at the default [1, 1.5] cap the
        // wordmark looked muddy.
        dpr={[2, 3]}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 3]} intensity={0.4} />
        <Suspense fallback={null}>
          <Environment
            preset={STYLE_RENDER[LOGO_STYLE_ID].envPreset}
            environmentIntensity={STYLE_RENDER[LOGO_STYLE_ID].envIntensity}
            background={false}
          />
          <Spinner />
        </Suspense>
      </Canvas>
    </span>
  );
}

function Spinner() {
  const ref = useRef<THREE.Group>(null);
  const { cubes, fit } = useMemo(() => pixelsToCubes(LOGO_PIXELS, LOGO_SIZE), []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });
  if (cubes.length === 0) return null;
  return (
    <group ref={ref}>
      <group
        scale={fit.scale}
        position={[-fit.cx * fit.scale, -fit.cy * fit.scale, -fit.cz * fit.scale]}
      >
        <StyledInstances cubes={cubes} styleId={LOGO_STYLE_ID} />
      </group>
    </group>
  );
}
