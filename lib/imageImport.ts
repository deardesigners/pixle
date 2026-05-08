/**
 * Импорт картинки → 64×64 пиксельная сетка с авто-удалением однородного фона
 * и квантизацией в небольшую палитру.
 *
 * Логика фона:
 *   - Сэмплим 1px-кольцо по периметру.
 *   - Находим доминирующий цвет в кольце.
 *   - Если ≥78% краевых пикселей попадают в радиус EDGE_TOLERANCE от него
 *     (в RGB Euclidean) — фон считается «однородным» и вырезается.
 *   - Иначе (лес, улица, любой сложный фон) — оставляем как есть.
 *
 * Квантизация — медиан-кат до PALETTE_SIZE цветов на непрозрачных пикселях.
 * Меньше уникальных цветов = меньше Z-слоёв в 3D = читаемая модель.
 */

const TARGET_SIZE = 64;
const PALETTE_SIZE = 16;
const EDGE_DOMINANCE_THRESHOLD = 0.78;
const EDGE_TOLERANCE = 36; // RGB-Euclidean. ≈ jpeg-noise + лёгкие тени по фону.
const EDGE_TOLERANCE_SQ = EDGE_TOLERANCE * EDGE_TOLERANCE;

export type ImportResult = {
  size: 64;
  pixels: number[][];
  bgRemoved: boolean;
  paletteUsed: number;
};

export async function processImageFile(file: File): Promise<ImportResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const data = drawSquareCrop(bitmap);
    return processImageData(data);
  } finally {
    bitmap.close();
  }
}

function drawSquareCrop(bitmap: ImageBitmap): Uint8ClampedArray {
  const sw = bitmap.width;
  const sh = bitmap.height;
  const side = Math.min(sw, sh);
  // Центр по горизонтали; для портрета — лёгкий top-bias, чтобы лицо не уехало.
  const sx = (sw - side) / 2;
  const sy = sh > sw ? (sh - sw) * 0.2 : (sh - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
  return ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE).data;
}

function processImageData(data: Uint8ClampedArray): ImportResult {
  const edge = collectEdgePixels(data);
  const dominant = findDominantColor(edge);
  const matchRatio = dominant ? edgeMatchRatio(edge, dominant) : 0;
  const removeBg = matchRatio >= EDGE_DOMINANCE_THRESHOLD;

  const out: number[][] = new Array(TARGET_SIZE * TARGET_SIZE);
  const opaque: Array<[number, number, number]> = [];
  const opaqueIdx: number[] = [];

  for (let i = 0; i < TARGET_SIZE * TARGET_SIZE; i++) {
    const o = i * 4;
    const r = data[o]!;
    const g = data[o + 1]!;
    const b = data[o + 2]!;
    if (removeBg && dominant && distSq(r, g, b, dominant.r, dominant.g, dominant.b) <= EDGE_TOLERANCE_SQ) {
      out[i] = [0, 0, 0, 0];
    } else {
      opaque.push([r, g, b]);
      opaqueIdx.push(i);
    }
  }

  let palette: Array<[number, number, number]> = [];
  if (opaque.length > 0) {
    palette = medianCut(opaque, PALETTE_SIZE);
    for (let j = 0; j < opaque.length; j++) {
      const p = opaque[j]!;
      const c = nearestPaletteColor(palette, p[0], p[1], p[2]);
      out[opaqueIdx[j]!] = [c[0], c[1], c[2], 255];
    }
  }

  // Заполнить «дыры», если фон не убирали — каждая ячейка должна быть инициализирована.
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) out[i] = [0, 0, 0, 0];
  }

  return { size: TARGET_SIZE, pixels: out, bgRemoved: removeBg, paletteUsed: palette.length };
}

type EdgeBucket = Array<[number, number, number]>;

function collectEdgePixels(data: Uint8ClampedArray): EdgeBucket {
  const out: EdgeBucket = [];
  const N = TARGET_SIZE;
  for (let x = 0; x < N; x++) {
    pushPixel(out, data, x, 0);
    pushPixel(out, data, x, N - 1);
  }
  for (let y = 1; y < N - 1; y++) {
    pushPixel(out, data, 0, y);
    pushPixel(out, data, N - 1, y);
  }
  return out;
}

function pushPixel(out: EdgeBucket, data: Uint8ClampedArray, x: number, y: number) {
  const o = (y * TARGET_SIZE + x) * 4;
  out.push([data[o]!, data[o + 1]!, data[o + 2]!]);
}

/**
 * Грубое определение доминирующего цвета: бин-гистограмма с шагом 16/канал
 * (4096 ячеек). Берём самую населённую и возвращаем средний цвет внутри неё.
 */
function findDominantColor(pixels: EdgeBucket): { r: number; g: number; b: number } | null {
  if (pixels.length === 0) return null;
  const bins = new Map<number, { r: number; g: number; b: number; count: number }>();
  for (const p of pixels) {
    const key = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4);
    const e = bins.get(key);
    if (e) {
      e.r += p[0];
      e.g += p[1];
      e.b += p[2];
      e.count++;
    } else {
      bins.set(key, { r: p[0], g: p[1], b: p[2], count: 1 });
    }
  }
  let best: { r: number; g: number; b: number; count: number } | null = null;
  for (const v of bins.values()) {
    if (!best || v.count > best.count) best = v;
  }
  if (!best) return null;
  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count)
  };
}

function edgeMatchRatio(pixels: EdgeBucket, target: { r: number; g: number; b: number }): number {
  let hit = 0;
  for (const p of pixels) {
    if (distSq(p[0], p[1], p[2], target.r, target.g, target.b) <= EDGE_TOLERANCE_SQ) hit++;
  }
  return hit / pixels.length;
}

function distSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Медиан-кат: рекурсивно делим самое широкое измерение пополам, пока не получим
 * k блоков. Цвет блока — среднее. Стабильно для фото.
 */
function medianCut(
  pixels: Array<[number, number, number]>,
  k: number
): Array<[number, number, number]> {
  if (pixels.length === 0 || k <= 0) return [];
  if (k === 1 || pixels.length === 1) return [averageColor(pixels)];

  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (const p of pixels) {
    if (p[0] < minR) minR = p[0];
    if (p[0] > maxR) maxR = p[0];
    if (p[1] < minG) minG = p[1];
    if (p[1] > maxG) maxG = p[1];
    if (p[2] < minB) minB = p[2];
    if (p[2] > maxB) maxB = p[2];
  }
  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;
  const channel: 0 | 1 | 2 = rangeR >= rangeG && rangeR >= rangeB ? 0 : rangeG >= rangeB ? 1 : 2;

  pixels.sort((a, b) => a[channel] - b[channel]);
  const mid = pixels.length >> 1;
  const left = pixels.slice(0, mid);
  const right = pixels.slice(mid);
  const halfK = Math.floor(k / 2);
  return [...medianCut(left, halfK), ...medianCut(right, k - halfK)];
}

function averageColor(pixels: Array<[number, number, number]>): [number, number, number] {
  let r = 0, g = 0, b = 0;
  for (const p of pixels) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  const n = pixels.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function nearestPaletteColor(
  palette: Array<[number, number, number]>,
  r: number,
  g: number,
  b: number
): [number, number, number] {
  let best = palette[0]!;
  let bestD = Infinity;
  for (const c of palette) {
    const d = distSq(r, g, b, c[0], c[1], c[2]);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
