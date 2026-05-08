'use client';

import { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { StyleId } from '@/lib/validation';
import { buildMonoGroups, type MonoGroup } from '@/lib/voxelMesh';

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
  // Стабильные псевдослучайные смещения на инстанс (origami flutter).
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

  // Smooth-стили получают монолитный merged mesh с дедупликацией вершин и
  // сглаженными нормалями — выглядят как цельная форма, не россыпь кубов.
  const isSmoothStyle =
    styleId === 'crystal' || styleId === 'mercury' || styleId === 'plush';

  const monoGroups = useMemo<MonoGroup[]>(() => {
    if (!isSmoothStyle) return [];
    // Чуть-чуть перекрытия (1.0) — соседние кубы смыкаются по граням и
    // mergeVertices их склеит. Иначе остаются микрозазоры.
    return buildMonoGroups(cubes, 1.0);
  }, [cubes, isSmoothStyle]);

  if (styleId === 'crystal') {
    return (
      <group>
        {monoGroups.map((g, i) => (
          <mesh key={i} geometry={g.geometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={g.color}
              wireframe={wireframe}
              transmission={1}
              ior={1.55}
              thickness={1.5}
              roughness={0.05}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.02}
              attenuationDistance={3}
              attenuationColor={g.color}
              transparent
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (styleId === 'mercury') {
    return (
      <group>
        {monoGroups.map((g, i) => (
          <mesh key={i} geometry={g.geometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={g.color}
              wireframe={wireframe}
              metalness={1}
              roughness={0.06}
              clearcoat={1}
              clearcoatRoughness={0.02}
              envMapIntensity={1.4}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (styleId === 'plush') {
    return (
      <group>
        {monoGroups.map((g, i) => (
          <mesh key={i} geometry={g.geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color={g.color}
              wireframe={wireframe}
              roughness={0.95}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (styleId === 'neon') {
    // toneMapped=false — цвета идут в композитор без сжатия, Bloom их подхватит.
    // Plus небольшой scale чтобы куб ощущался как источник, а не каркас.
    return (
      <Instances limit={65536} range={cubes.length} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshBasicMaterial toneMapped={false} wireframe={wireframe} />
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

  // voxel — кубы остаются как есть, это его идентичность
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
