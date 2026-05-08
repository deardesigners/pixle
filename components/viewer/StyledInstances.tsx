'use client';

import { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { StyleId } from '@/lib/validation';

export type StyledCube = { pos: [number, number, number]; color: THREE.Color };

export function StyledInstances({
  cubes,
  styleId,
  wireframe = false
}: {
  cubes: StyledCube[];
  styleId: StyleId;
  wireframe?: boolean;
}) {
  // Стабильные псевдослучайные смещения на инстанс (origami flutter, plush jiggle).
  // Завязаны на индекс — не мерцают между ререндерами.
  const variants = useMemo(
    () =>
      cubes.map((_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 91.13 + n * 17.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          rx: (r(1) - 0.5) * 0.5,
          ry: (r(2) - 0.5) * 0.5,
          rz: (r(3) - 0.5) * 0.5,
          phase: r(4) * Math.PI * 2,
          scale: 0.85 + r(5) * 0.3
        };
      }),
    [cubes]
  );

  if (styleId === 'crystal') {
    return (
      <Instances limit={65536} range={cubes.length}>
        <octahedronGeometry args={[0.65, 0]} />
        <meshPhysicalMaterial
          wireframe={wireframe}
          transmission={0.92}
          ior={1.55}
          thickness={0.6}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          attenuationDistance={2}
          transparent
        />
        {cubes.map((c, i) => {
          const v = variants[i]!;
          return <Instance key={i} position={c.pos} color={c.color} rotation={[v.rx, v.ry, v.rz]} />;
        })}
      </Instances>
    );
  }

  if (styleId === 'neon') {
    return (
      <Instances limit={65536} range={cubes.length} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshBasicMaterial wireframe />
        {cubes.map((c, i) => (
          <Instance key={i} position={c.pos} color={c.color} />
        ))}
      </Instances>
    );
  }

  if (styleId === 'origami') {
    return (
      <Instances limit={65536} range={cubes.length} castShadow receiveShadow>
        <planeGeometry args={[0.95, 0.95]} />
        <meshStandardMaterial
          wireframe={wireframe}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
          flatShading
        />
        {cubes.map((c, i) => {
          const v = variants[i]!;
          return (
            <Instance
              key={i}
              position={c.pos}
              color={c.color}
              rotation={[v.rx * 0.6, v.ry * 0.6, v.rz * 0.4]}
            />
          );
        })}
      </Instances>
    );
  }

  if (styleId === 'mercury') {
    return (
      <Instances limit={65536} range={cubes.length} castShadow receiveShadow>
        <sphereGeometry args={[0.7, 24, 18]} />
        <meshPhysicalMaterial
          wireframe={wireframe}
          metalness={1}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
        {cubes.map((c, i) => (
          <Instance key={i} position={c.pos} color={c.color} />
        ))}
      </Instances>
    );
  }

  if (styleId === 'plush') {
    return (
      <Instances limit={65536} range={cubes.length} castShadow receiveShadow>
        <sphereGeometry args={[0.55, 16, 14]} />
        <meshStandardMaterial wireframe={wireframe} roughness={0.85} metalness={0} />
        {cubes.map((c, i) => {
          const v = variants[i]!;
          return <Instance key={i} position={c.pos} color={c.color} scale={v.scale} />;
        })}
      </Instances>
    );
  }

  // voxel
  return (
    <Instances limit={65536} range={cubes.length} castShadow receiveShadow>
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshStandardMaterial wireframe={wireframe} roughness={0.95} metalness={0} />
      {cubes.map((c, i) => (
        <Instance key={i} position={c.pos} color={c.color} />
      ))}
    </Instances>
  );
}
