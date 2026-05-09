/**
 * Импорт картинки → 64×64 пиксельная сетка с авто-удалением однородного фона.
 *
 * Логика фона (flood-fill, не color-key):
 *   - Сэмплим 1px-кольцо по периметру и находим доминирующий цвет.
 *   - Если ≥EDGE_DOMINANCE_THRESHOLD краевых пикселей попадают в радиус
 *     EDGE_TOLERANCE — фон считается «однородным».
 *   - Затем БФС от каждого краевого пикселя bg-цвета: помечаем прозрачными
 *     ТОЛЬКО те пиксели, которые соединены с краем непрерывным регионом
 *     bg-цвета. Это критично — иначе блики на лбу/щеках (близкие к белому)
 *     удалялись бы как фон, и портрет терял половину детализации.
 *   - Для сложного фона (лес, улица, градиент) — оставляем как есть.
 *
 * Цветовая квантизация **отключена**: при 64×64 уникальных цветов и так не
 * больше пары тысяч, а median-cut в 24-48 кластеров «съедал» полутона лица.
 * Все depth-слои (≤6) делаются в pixelsToCubes по per-pixel яркости —
 * палитра больше не диктует геометрию.
 */

const TARGET_SIZE = 64;
const EDGE_DOMINANCE_THRESHOLD = 0.65;
const EDGE_TOLERANCE = 28; // RGB-Euclidean. ≈ jpeg-noise + лёгкие тени по фону.
const EDGE_TOLERANCE_SQ = EDGE_TOLERANCE * EDGE_TOLERANCE;

export type ImportResult = {
  size: 64;
  pixels: number[][];
  bgRemoved: boolean;
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
  const N = TARGET_SIZE;
  const total = N * N;

  // Шаг 1. Доминирующий цвет края + признак «фон однородный».
  const edge: Array<[number, number, number]> = [];
  for (let x = 0; x < N; x++) {
    edge.push(readRgb(data, x, 0));
    edge.push(readRgb(data, x, N - 1));
  }
  for (let y = 1; y < N - 1; y++) {
    edge.push(readRgb(data, 0, y));
    edge.push(readRgb(data, N - 1, y));
  }
  const dominant = findDominantColor(edge);
  let removeBg = false;
  if (dominant) {
    let hit = 0;
    for (const p of edge) {
      if (distSq(p[0], p[1], p[2], dominant.r, dominant.g, dominant.b) <= EDGE_TOLERANCE_SQ) hit++;
    }
    removeBg = hit / edge.length >= EDGE_DOMINANCE_THRESHOLD;
  }

  // Шаг 2. Flood-fill от края — помечаем прозрачными только пиксели,
  // соединённые с краем через непрерывный bg-цвет.
  const transparent = new Uint8Array(total); // 1 = bg, 0 = непрозрачный
  if (removeBg && dominant) {
    const visited = new Uint8Array(total);
    const queue: number[] = [];
    const tryEnqueue = (x: number, y: number) => {
      if (x < 0 || x >= N || y < 0 || y >= N) return;
      const idx = y * N + x;
      if (visited[idx]) return;
      const o = idx * 4;
      const dr = data[o]! - dominant.r;
      const dg = data[o + 1]! - dominant.g;
      const db = data[o + 2]! - dominant.b;
      if (dr * dr + dg * dg + db * db > EDGE_TOLERANCE_SQ) return;
      visited[idx] = 1;
      transparent[idx] = 1;
      queue.push(idx);
    };
    // Стартуем с любого пикселя на границе, который похож на bg-цвет.
    for (let x = 0; x < N; x++) {
      tryEnqueue(x, 0);
      tryEnqueue(x, N - 1);
    }
    for (let y = 0; y < N; y++) {
      tryEnqueue(0, y);
      tryEnqueue(N - 1, y);
    }
    while (queue.length) {
      const idx = queue.pop()!;
      const x = idx % N;
      const y = (idx - x) / N;
      tryEnqueue(x - 1, y);
      tryEnqueue(x + 1, y);
      tryEnqueue(x, y - 1);
      tryEnqueue(x, y + 1);
    }
  }

  // Шаг 3. Собираем результат — пиксели как есть, без квантизации.
  const out: number[][] = new Array(total);
  for (let i = 0; i < total; i++) {
    if (transparent[i]) {
      out[i] = [0, 0, 0, 0];
    } else {
      const o = i * 4;
      out[i] = [data[o]!, data[o + 1]!, data[o + 2]!, 255];
    }
  }

  return { size: TARGET_SIZE, pixels: out, bgRemoved: removeBg };
}

function readRgb(data: Uint8ClampedArray, x: number, y: number): [number, number, number] {
  const o = (y * TARGET_SIZE + x) * 4;
  return [data[o]!, data[o + 1]!, data[o + 2]!];
}

/**
 * Грубое определение доминирующего цвета: бин-гистограмма с шагом 16/канал
 * (4096 ячеек). Берём самую населённую и возвращаем средний цвет внутри неё.
 */
function findDominantColor(
  pixels: Array<[number, number, number]>
): { r: number; g: number; b: number } | null {
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

function distSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}
