/**
 * Генератор случайной симметричной «креатуры» — простая фигурка, которая
 * сразу показывает потенциал инструмента: тело произвольного силуэта
 * (зеркально по X), акцентные пиксели внутри, тёмные глаза. Используется
 * на старте (если канвас пустой) и по кнопке Random под канвасом.
 */

import type { StyleId } from './validation';

const STYLE_IDS: StyleId[] = ['voxel', 'neon', 'mercury', 'dhl', 'disco'];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function setPixel(
  buf: Uint8ClampedArray,
  size: number,
  x: number,
  y: number,
  rgb: [number, number, number]
) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = rgb[0];
  buf[i + 1] = rgb[1];
  buf[i + 2] = rgb[2];
  buf[i + 3] = 255;
}

/**
 * Симметричный по X силуэт: радиус от центра модулируется набором синусов
 * со случайной фазой → каждый запуск даёт уникальную «голову/тело».
 * Внутри случайно подмешиваются акцентные пиксели и две глазные точки.
 */
export function generateRandomShape(size: number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(size * size * 4);

  // Палитра: основа + контраст. Saturation высокая, lightness средний —
  // чтобы фигура читалась на любом стиле.
  const baseHue = Math.random();
  const accentHue = (baseHue + 0.3 + Math.random() * 0.4) % 1;
  const body = hslToRgb(baseHue, 0.65, 0.55);
  const accent = hslToRgb(accentHue, 0.8, 0.55);
  const dark: [number, number, number] = [22, 22, 30];

  // Параметры силуэта.
  const peaks = 3 + Math.floor(Math.random() * 3); // 3-5 «горбов»
  const peakPhases = Array.from({ length: peaks }, () => Math.random() * Math.PI * 2);
  const peakAmps = Array.from({ length: peaks }, () => 0.05 + Math.random() * 0.06);
  const baseRadius = size * (0.28 + Math.random() * 0.06);
  const cx = (size - 1) / 2;
  const cy = size / 2 + size * 0.04; // лёгкий сдвиг вниз → место для глаз сверху

  const radiusAt = (angle: number) => {
    let r = baseRadius;
    for (let i = 0; i < peaks; i++) {
      r += Math.sin((angle - peakPhases[i]!) * 2) * size * peakAmps[i]!;
    }
    return r;
  };

  const half = Math.ceil(size / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < half; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const target = radiusAt(angle);
      if (r > target) continue;

      // Внутри тела случайные акцентные пиксели — пятна, узоры.
      const isAccent = Math.random() < 0.18 && r < target * 0.85;
      const color = isAccent ? accent : body;
      setPixel(buf, size, x, y, color);
      // зеркально — кроме центральной колонки
      if (x !== size - 1 - x) setPixel(buf, size, size - 1 - x, y, color);
    }
  }

  // Глаза: две тёмные точки (2×2 или 1×1 в зависимости от размера холста).
  const eyeY = Math.floor(size * 0.36);
  const eyeOffset = Math.max(2, Math.floor(size * 0.16));
  const eyeSize = size >= 32 ? 2 : 1;
  for (let dy = 0; dy < eyeSize; dy++) {
    for (let dx = 0; dx < eyeSize; dx++) {
      setPixel(buf, size, Math.round(cx) - eyeOffset + dx, eyeY + dy, dark);
      setPixel(buf, size, Math.round(cx) + eyeOffset - 1 - dx, eyeY + dy, dark);
    }
  }

  return buf;
}

export function pickRandomStyle(): StyleId {
  return STYLE_IDS[Math.floor(Math.random() * STYLE_IDS.length)]!;
}
