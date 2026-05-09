'use client';

import { useEffect, useMemo } from 'react';
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
  // Mercury получает монолитный merged mesh с дедупликацией вершин и
  // сглаженными нормалями — выглядит как цельная форма, не россыпь шариков.
  const isSmoothStyle = styleId === 'mercury';

  const monoGroups = useMemo<MonoGroup[]>(() => {
    if (!isSmoothStyle) return [];
    return buildMonoGroups(cubes, 1.0);
  }, [cubes, isSmoothStyle]);

  // Цилиндр для neon: ось вдоль Z, длина точно равна шагу слоя (1.0),
  // чтобы соседние воксели в одной X,Y-колонке стыковались торцами без
  // зазоров и формировали непрерывную трубу. Радиус 0.5 = диаметр клетки,
  // края цилиндров касаются по X/Y.
  const neonCylinder = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 18, 1, false);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => neonCylinder.dispose(), [neonCylinder]);

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

  if (styleId === 'neon') {
    // toneMapped=false — цвета идут в композитор без сжатия, Bloom их подхватит.
    return (
      <Instances limit={65536} range={cubes.length} castShadow={false} receiveShadow={false}>
        <primitive object={neonCylinder} attach="geometry" />
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
