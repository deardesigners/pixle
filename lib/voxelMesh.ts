import * as THREE from 'three';
import {
  mergeGeometries,
  mergeVertices
} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Группирует кубы по цвету, мерджит соседние воксели в один меш и сглаживает
 * нормали — кубы перестают быть «отдельными пикселями» и сливаются в монолитную
 * форму со скруглёнными углами (за счёт усреднения нормалей в общих вершинах).
 *
 * Используется для smooth-стилей (Plush, Crystal, Mercury, Stone) — вместо
 * рендера N инстансов кубов отдаётся один меш на каждый цвет, по которому
 * можно применить сильный материал (transmission, metalness, displacement).
 */
export type MonoGroup = {
  color: THREE.Color;
  geometry: THREE.BufferGeometry;
};

export function buildMonoGroups(
  positions: ReadonlyArray<{ pos: [number, number, number]; color: THREE.Color }>,
  voxelSize = 0.96
): MonoGroup[] {
  if (positions.length === 0) return [];

  // Сгруппировать по цвету.
  const buckets = new Map<string, { color: THREE.Color; pts: [number, number, number][] }>();
  for (const p of positions) {
    const key = `${p.color.r.toFixed(4)},${p.color.g.toFixed(4)},${p.color.b.toFixed(4)}`;
    let b = buckets.get(key);
    if (!b) {
      b = { color: p.color.clone(), pts: [] };
      buckets.set(key, b);
    }
    b.pts.push(p.pos);
  }

  const result: MonoGroup[] = [];
  // Один box-template, клонируем для каждого вокселя.
  const template = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);

  for (const bucket of buckets.values()) {
    const parts: THREE.BufferGeometry[] = [];
    for (const [x, y, z] of bucket.pts) {
      const g = template.clone();
      g.translate(x, y, z);
      parts.push(g);
    }
    let merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) continue;
    // Дедубликация совпадающих вершин — без неё нормали не усреднятся
    // и углы кубов останутся резкими.
    merged = mergeVertices(merged, 1e-4);
    merged.computeVertexNormals();
    result.push({ color: bucket.color, geometry: merged });
  }
  template.dispose();
  return result;
}
