'use client';

import { useEffect, useMemo, useState } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { StyleId } from '@/lib/validation';
import { buildMonoGroups, type MonoGroup } from '@/lib/voxelMesh';
import { getDhlTexture } from '@/lib/dhlBranded';

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
  // ВСЕ хуки должны вызываться на каждом рендере и в одинаковом порядке —
  // поэтому объявляем их здесь, до любых ранних return'ов. React запоминает
  // порядок вызова на первом рендере; если на следующем рендере ранний
  // return пропустит часть хуков — следующие useState/useEffect получат
  // «не свой» слот и приложение крашнется.

  // Mercury — монолитный merged mesh, дедуп вершин, сглаженные нормали.
  const isSmoothStyle = styleId === 'mercury';
  const monoGroups = useMemo<MonoGroup[]>(() => {
    if (!isSmoothStyle) return [];
    return buildMonoGroups(cubes, 1.0);
  }, [cubes, isSmoothStyle]);

  // Neon — горизонтальный цилиндр (ось X), длина 1.0, радиус 0.5.
  const neonCylinder = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 18, 1, false);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => neonCylinder.dispose(), [neonCylinder]);

  // DHL — текстура «жёлтый фон + красный лого» одна на все грани каждого
  // куба. Подгружается асинхронно из public/dhl-logo.svg.
  const [dhlTex, setDhlTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (styleId !== 'dhl') return;
    let cancelled = false;
    getDhlTexture()
      .then((t) => { if (!cancelled) setDhlTex(t); })
      .catch((e) => console.error('[dhl texture]', e));
    return () => { cancelled = true; };
  }, [styleId]);

  // Дальше — только условные рендеры, никаких хуков.

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

  if (styleId === 'dhl') {
    // key={dhlTex ? 'tex' : 'plain'} — при появлении текстуры Instances
    // и его материал пересоздаются. Без этого drei держит тот же
    // material instance, иногда не подхватывая обновлённый map prop;
    // в результате кубы оставались белыми без лого.
    return (
      <Instances
        key={dhlTex ? 'dhl-tex' : 'dhl-plain'}
        limit={65536}
        range={cubes.length}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshStandardMaterial
          wireframe={wireframe}
          map={dhlTex ?? null}
          color={dhlTex ? '#ffffff' : '#FFCC00'}
          roughness={0.6}
          metalness={0.05}
        />
        {cubes.map((c, i) => (
          <Instance key={i} position={c.pos} />
        ))}
      </Instances>
    );
  }

  if (styleId === 'neon') {
    return (
      <Instances
        limit={65536}
        range={cubes.length}
        castShadow={false}
        receiveShadow={false}
      >
        <primitive object={neonCylinder} attach="geometry" />
        <meshBasicMaterial toneMapped={false} wireframe={wireframe} />
        {cubes.map((c, i) => (
          <Instance key={i} position={c.pos} color={c.color} />
        ))}
      </Instances>
    );
  }

  // voxel — дефолтные кубы.
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
