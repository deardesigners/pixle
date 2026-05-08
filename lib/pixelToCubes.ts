import * as THREE from 'three';

export type Cube = {
  pos: [number, number, number];
  color: THREE.Color;
};

export type FitInfo = { cx: number; cy: number; cz: number; scale: number };

/**
 * Строит массив кубов из пиксельных данных. Z-слои назначаются по яркости.
 *
 * Два режима — определяются автоматически по числу уникальных цветов:
 *
 *   1. Рисунок (≤MAX_Z_LEVELS_DRAWING цветов): один цвет → один Z, цвета
 *      сортируются по яркости. Кубики стоят отдельными «слоями». Это сохраняет
 *      привычное поведение для рисунков с осознанной палитрой.
 *
 *   2. Фото / импорт (>MAX_Z_LEVELS_DRAWING цветов): полноценный LEGO-рельеф.
 *      Для каждого пикселя определяется высота 0..MAX_Z_LEVELS_PHOTO-1 по
 *      яркости (rec.709), и колонка кубиков заполняется от z=0 до этой высоты.
 *      Светлые точки (лоб, нос, щёки) → высокие столбики; тёмные (волосы,
 *      глаза) → короткие. Получается узнаваемый объёмный портрет.
 *
 * pixels: Uint8ClampedArray (RGBA, длина = size*size*4)
 *   ИЛИ массив [r,g,b,a][] длиной size*size — годится оба варианта.
 */
const MAX_Z_LEVELS_DRAWING = 6;
// 4 уровня для фото: достаточно для LEGO-рельефа (лоб/щёки выпирают, глаза
// утоплены), но не превращает модель в «гребёнку» при повороте камеры —
// глубина ~4 при ширине ~64, аспект 1:16, читается как «тиснёная пластина».
const MAX_Z_LEVELS_PHOTO = 4;

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

  // Pass 1: собираем уникальные непрозрачные цвета.
  const uniqueColors = new Set<string>();
  for (let i = 0; i < size * size; i++) {
    const [r, g, b, a] = readPixel(i);
    if (a < 16) continue;
    uniqueColors.add(`${r},${g},${b}`);
  }

  const photoMode = uniqueColors.size > MAX_Z_LEVELS_DRAWING;
  const layerSpacing = 1.0;

  // Для режима рисунка строим карту цвет → уровень (по яркости).
  let colorLayer: Map<string, number> | null = null;
  if (!photoMode) {
    const colors: Array<[string, number]> = [];
    for (const key of uniqueColors) {
      const [r, g, b] = key.split(',').map(Number) as [number, number, number];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      colors.push([key, lum]);
    }
    colors.sort((a, b) => a[1] - b[1]);
    colorLayer = new Map<string, number>();
    for (let i = 0; i < colors.length; i++) colorLayer.set(colors[i]![0], i);
  }

  // Pass 2: строим кубы. В photo-mode каждая колонка заполняется от z=0
  // до уровня яркости включительно — даёт LEGO-объём вместо плоской пластины.
  const out: Cube[] = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const [r, g, b, a] = readPixel(idx);
      if (a < 16) continue;

      const px = x - half + 0.5;
      const py = half - y - 0.5;
      // Hex: Three.js парсит как sRGB и корректно конвертит в linear.
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

      if (photoMode) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const topLevel = Math.min(
          MAX_Z_LEVELS_PHOTO - 1,
          Math.floor((lum / 256) * MAX_Z_LEVELS_PHOTO)
        );
        // Колонка от z=0 до topLevel (inclusive), как кирпичики LEGO на доске.
        for (let lvl = 0; lvl <= topLevel; lvl++) {
          const pz = lvl * layerSpacing;
          out.push({ pos: [px, py, pz], color: new THREE.Color(hex) });
          if (pz < minZ) minZ = pz;
          if (pz > maxZ) maxZ = pz;
        }
      } else {
        const level = colorLayer!.get(`${r},${g},${b}`)!;
        const pz = level * layerSpacing;
        out.push({ pos: [px, py, pz], color: new THREE.Color(hex) });
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
      }

      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
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
