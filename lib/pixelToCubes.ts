import * as THREE from 'three';

export type Cube = {
  pos: [number, number, number];
  color: THREE.Color;
};

export type FitInfo = { cx: number; cy: number; cz: number; scale: number };

/**
 * Строит массив кубов из пиксельных данных. Z-слои назначаются по яркости
 * цвета (rec.709), от тёмного к светлому — даёт читаемый рельеф.
 *
 * Цвета группируются в максимум MAX_Z_LEVELS бакетов, чтобы импорт фото
 * (24+ цвета после квантизации) не превращался в «лестницу из 24 страт».
 * Для рисунка с ≤MAX_Z_LEVELS цветов поведение прежнее — каждый цвет
 * получает свой Z. Для фото близкие по яркости цвета сливаются в один
 * слой и модель выглядит как 6-уровневый рельеф вместо 24-уровневой стопки.
 *
 * pixels: Uint8ClampedArray (RGBA, длина = size*size*4)
 *   ИЛИ массив [r,g,b,a][] длиной size*size — годится оба варианта.
 */
const MAX_Z_LEVELS = 6;

export function pixelsToCubes(
  pixels: Uint8ClampedArray | number[][],
  size: number
): { cubes: Cube[]; fit: FitInfo } {
  const half = size / 2;
  const isFlat = Array.isArray(pixels);

  const readPixel = (idx: number): [number, number, number, number] => {
    if (isFlat) {
      const px = (pixels as number[][])[idx];
      if (!px) return [0, 0, 0, 0];
      return [px[0] ?? 0, px[1] ?? 0, px[2] ?? 0, px[3] ?? 0];
    }
    const i = idx * 4;
    const buf = pixels as Uint8ClampedArray;
    return [buf[i] ?? 0, buf[i + 1] ?? 0, buf[i + 2] ?? 0, buf[i + 3] ?? 0];
  };

  // Pass 1: собираем уникальные непрозрачные цвета и их яркость.
  const colorMeta = new Map<string, { r: number; g: number; b: number; lum: number }>();
  for (let i = 0; i < size * size; i++) {
    const [r, g, b, a] = readPixel(i);
    if (a < 16) continue;
    const key = `${r},${g},${b}`;
    if (!colorMeta.has(key)) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      colorMeta.set(key, { r, g, b, lum });
    }
  }

  // Сортируем по яркости. Если цветов мало (рисунок) — каждый получает свой Z.
  // Если много (фото) — равномерно распределяем по MAX_Z_LEVELS бакетам.
  const sortedColors = Array.from(colorMeta.entries()).sort((a, b) => a[1].lum - b[1].lum);
  const useBuckets = sortedColors.length > MAX_Z_LEVELS;
  const numLevels = Math.min(sortedColors.length, MAX_Z_LEVELS);
  const colorLayer = new Map<string, number>();
  for (let i = 0; i < sortedColors.length; i++) {
    const level = useBuckets
      ? Math.min(MAX_Z_LEVELS - 1, Math.floor((i / sortedColors.length) * MAX_Z_LEVELS))
      : i;
    colorLayer.set(sortedColors[i]![0], level);
  }

  const targetDepth = Math.max(2, size / 8);
  const layerSpacing =
    numLevels > 1 ? Math.min(1.0, targetDepth / (numLevels - 1)) : 1.0;

  // Pass 2: строим кубы.
  const out: Cube[] = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const [r, g, b, a] = readPixel(idx);
      if (a < 16) continue;
      const layer = colorLayer.get(`${r},${g},${b}`)!;
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
