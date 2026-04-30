import * as THREE from 'three';

export type Cube = {
  pos: [number, number, number];
  color: THREE.Color;
};

export type FitInfo = { cx: number; cy: number; cz: number; scale: number };

/**
 * Строит массив кубов из пиксельных данных. Каждый уникальный цвет —
 * отдельный Z-слой (стопка пластин). Возвращает также bounding-box
 * для авто-фита камеры.
 *
 * pixels: Uint8ClampedArray (RGBA, длина = size*size*4)
 *   ИЛИ массив [r,g,b,a][] длиной size*size — годится оба варианта.
 */
export function pixelsToCubes(
  pixels: Uint8ClampedArray | number[][],
  size: number
): { cubes: Cube[]; fit: FitInfo } {
  const out: Cube[] = [];
  const half = size / 2;
  const colorLayer = new Map<string, number>();
  let layerCount = 0;
  const layerSpacing = 1.0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const isFlat = Array.isArray(pixels);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      let r: number, g: number, b: number, a: number;
      if (isFlat) {
        const px = (pixels as number[][])[idx];
        if (!px) continue;
        r = px[0] ?? 0; g = px[1] ?? 0; b = px[2] ?? 0; a = px[3] ?? 0;
      } else {
        const i = idx * 4;
        const buf = pixels as Uint8ClampedArray;
        r = buf[i] ?? 0;
        g = buf[i + 1] ?? 0;
        b = buf[i + 2] ?? 0;
        a = buf[i + 3] ?? 0;
      }
      if (a < 16) continue;

      const key = `${r},${g},${b}`;
      let layer = colorLayer.get(key);
      if (layer === undefined) {
        layer = layerCount++;
        colorLayer.set(key, layer);
      }
      const px = x - half + 0.5;
      const py = half - y - 0.5;
      const pz = layer * layerSpacing;
      // Hex-строка: Three.js парсит как sRGB и корректно конвертит в linear
      // (raw float setRGB → linear, после sRGB-вывода цвета бледнеют).
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      out.push({ pos: [px, py, pz], color: new THREE.Color(hex) });

      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (pz < minZ) minZ = pz;
      if (pz > maxZ) maxZ = pz;
    }
  }

  if (out.length === 0) {
    return { cubes: out, fit: { cx: 0, cy: 0, cz: 0, scale: 1 } };
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const longest = Math.max(maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1);
  const scale = 1.7 / longest;
  return { cubes: out, fit: { cx, cy, cz, scale } };
}
