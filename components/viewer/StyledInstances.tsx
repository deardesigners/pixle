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
