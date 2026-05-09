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
  // Mercury получает монолитный merged mesh с дедупликацией вершин и
  // сглаженными нормалями — выглядит как цельная форма, не россыпь шариков.
  const isSmoothStyle = styleId === 'mercury';

  const monoGroups = useMemo<MonoGroup[]>(() => {
    if (!isSmoothStyle) return [];
    return buildMonoGroups(cubes, 1.0);
  }, [cubes, isSmoothStyle]);

  // Цилиндр для neon: ось вдоль X (горизонтальная трубка), длина = шаг
  // клетки (1.0), радиус 0.5. Соседние воксели в одной строке (одинаковый
  // Y и Z) стыкуются торцами без зазоров и формируют непрерывную трубку
  // по горизонтали. По Y/Z — круглое сечение, касание соседей на гранях.
  const neonCylinder = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 18, 1, false);
    // Default cylinder ось — Y. rotateZ(π/2) делает ось X.
    g.rotateZ(Math.PI / 2);
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

  // DHL: текстура (жёлтый фон + красный лого) подгружается асинхронно
  // и применяется как map ко всем граням каждого кубика. Пока грузится —
  // material color жёлтый и без map'а.
  const [dhlTex, setDhlTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (styleId !== 'dhl') return;
    let cancelled = false;
    getDhlTexture()
      .then((t) => { if (!cancelled) setDhlTex(t); })
      .catch((e) => console.error('[dhl texture]', e));
    return () => { cancelled = true; };
  }, [styleId]);

  if (styleId === 'dhl') {
    return (
      <Instances limit={65536} range={cubes.length} castShadow receiveShadow>
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

  // Disco: палитра DUNE (cyan / orange / red) — три ярких HDR-цвета,
  // распределённых по яркости пикселя. Значения >1.0 пробивают порог
  // bloom'а и дают «дикий» радужный световой шторм вокруг каждого куба.
  const discoCubes = useMemo(() => {
    if (styleId !== 'disco') return cubes;
    const cyan = new THREE.Color().setRGB(0.0, 4.5, 5.5);
    const orange = new THREE.Color().setRGB(5.5, 1.6, 0.05);
    const red = new THREE.Color().setRGB(5.0, 0.3, 0.4);
    return cubes.map((c) => {
      const hsl = { h: 0, s: 0, l: 0 };
      c.color.getHSL(hsl);
      // Делим на три бакета по lightness — светлое в cyan, среднее в
      // orange, тёмное в red. Получается контрастное «триколор-неон».
      const palette = hsl.l > 0.6 ? cyan : hsl.l > 0.35 ? orange : red;
      return { pos: c.pos, color: palette.clone() };
    });
  }, [styleId, cubes]);

  if (styleId === 'disco') {
    // toneMapped=false — цвета не зажимаются, проходят в bloom как HDR.
    return (
      <Instances limit={65536} range={discoCubes.length} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshBasicMaterial toneMapped={false} wireframe={wireframe} />
        {discoCubes.map((c, i) => (
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
