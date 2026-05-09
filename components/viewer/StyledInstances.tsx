'use client';

import { useEffect, useMemo, useState } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { StyleId } from '@/lib/validation';
import { buildMonoGroups, type MonoGroup } from '@/lib/voxelMesh';
import { colorCubesDhl, getDhlMask, type DhlMask } from '@/lib/dhlBranded';

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

  // DHL: маска лого подгружается асинхронно из /dhl-logo.svg, кешируется
  // глобально (см. lib/dhlBranded). Пока грузится — все кубы жёлтые.
  const [dhlMask, setDhlMask] = useState<DhlMask | null>(null);
  useEffect(() => {
    if (styleId !== 'dhl') return;
    let cancelled = false;
    getDhlMask()
      .then((m) => { if (!cancelled) setDhlMask(m); })
      .catch((e) => console.error('[dhl mask]', e));
    return () => { cancelled = true; };
  }, [styleId]);

  const dhlCubes = useMemo(() => {
    if (styleId !== 'dhl') return cubes;
    if (!dhlMask) {
      // Fallback пока маска не подгрузилась — просто жёлтые кубы.
      const yellow = new THREE.Color(1, 0xcc / 255, 0);
      return cubes.map((c) => ({ pos: c.pos, color: yellow }));
    }
    return colorCubesDhl(cubes, dhlMask);
  }, [styleId, cubes, dhlMask]);

  if (styleId === 'dhl') {
    return (
      <Instances limit={65536} range={dhlCubes.length} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshStandardMaterial wireframe={wireframe} roughness={0.65} metalness={0.05} />
        {dhlCubes.map((c, i) => (
          <Instance key={i} position={c.pos} color={c.color} />
        ))}
      </Instances>
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
