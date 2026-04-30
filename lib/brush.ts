import { clamp } from './utils';

export type PressureChannels = { size: boolean; alpha: boolean; jitter: boolean };

export type EffectiveStroke = {
  size: number;
  alpha: number;
  jitterX: number;
  jitterY: number;
};

/**
 * Pressure-математика. Вход: brushSize (1..4) и pressure (0..1).
 * size: ×1.5 множитель — даёт ощутимый разброс на маленьких кистях.
 * alpha: смещение 0.3..1.0, чтобы при лёгком касании след оставался виден, но прозрачный.
 * jitter: случайный сдвиг ±(1 - p) пикселя — больше разброс при слабом нажатии.
 */
export function computeStroke(
  brushSize: number,
  pressure: number,
  channels: PressureChannels,
  pressureEnabled: boolean
): EffectiveStroke {
  const p = pressureEnabled ? clamp(pressure, 0, 1) : 1;
  const size =
    pressureEnabled && channels.size
      ? Math.max(1, Math.round(brushSize * (0.4 + p * 1.1)))
      : brushSize;
  const alpha = pressureEnabled && channels.alpha ? 0.3 + p * 0.7 : 1;
  const jitterMag = pressureEnabled && channels.jitter ? 1 - p : 0;
  const jitterX = jitterMag > 0 ? (Math.random() * 2 - 1) * jitterMag : 0;
  const jitterY = jitterMag > 0 ? (Math.random() * 2 - 1) * jitterMag : 0;
  return { size, alpha, jitterX, jitterY };
}

/**
 * Velocity-fallback для тач-устройств без аппаратного давления.
 * Обратная зависимость: быстро = тонко, медленно = толсто.
 * Нормализация по эмпирическому потолку 1500 px/sec в координатах канваса CSS.
 */
export function pressureFromVelocity(distance: number, dtMs: number): number {
  if (dtMs <= 0) return 0.6;
  const v = distance / (dtMs / 1000);
  const norm = clamp(v / 1500, 0, 1);
  return clamp(1 - norm * 0.7, 0.3, 1);
}

/**
 * Брезенхэм: между pointermove-точками браузер пропускает промежуточные пиксели,
 * особенно на стилусе — без интерполяции штрих рваный.
 */
export function bresenham(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function brushFootprint(cx: number, cy: number, radius: number): Array<[number, number]> {
  const half = Math.floor(radius / 2);
  const out: Array<[number, number]> = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      out.push([cx + dx, cy + dy]);
    }
  }
  return out;
}

/**
 * Flood fill (BFS), толерантность 0 — заливает строго совпадающие RGBA.
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  size: number,
  startX: number,
  startY: number,
  target: [number, number, number, number]
): void {
  const idx = (x: number, y: number) => (y * size + x) * 4;
  const i0 = idx(startX, startY);
  const sr = pixels[i0] ?? 0;
  const sg = pixels[i0 + 1] ?? 0;
  const sb = pixels[i0 + 2] ?? 0;
  const sa = pixels[i0 + 3] ?? 0;
  if (sr === target[0] && sg === target[1] && sb === target[2] && sa === target[3]) return;

  const queue: Array<[number, number]> = [[startX, startY]];
  const visited = new Set<number>();
  visited.add(startY * size + startX);

  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const [x, y] = head;
    const i = idx(x, y);
    if (
      (pixels[i] ?? 0) !== sr ||
      (pixels[i + 1] ?? 0) !== sg ||
      (pixels[i + 2] ?? 0) !== sb ||
      (pixels[i + 3] ?? 0) !== sa
    )
      continue;
    pixels[i] = target[0];
    pixels[i + 1] = target[1];
    pixels[i + 2] = target[2];
    pixels[i + 3] = target[3];

    const neighbours: Array<[number, number]> = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const key = ny * size + nx;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }
}
