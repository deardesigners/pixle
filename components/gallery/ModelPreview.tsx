'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

function Spinning({ url }: { url: string }) {
  const ref = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={ref}>
      <primitive object={gltf.scene.clone()} scale={1.4} />
    </group>
  );
}

export function ModelPreview({ url }: { url: string }) {
  return (
    <Canvas
      camera={{ position: [2.5, 2, 2.5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 3]} intensity={0.9} />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <Spinning url={url} />
      </Suspense>
    </Canvas>
  );
}
