/**
 * DHL-стиль: воксели сохраняют свою позицию/слой, но перекрашиваются —
 * жёлтый по умолчанию, красный там, где маска лого непрозрачна.
 *
 * Лого подгружается из /dhl-logo.svg (плейсхолдер; замени на финальный
 * PNG/SVG и положи в public/, путь оставь тот же или поменяй URL ниже).
 */

import * as THREE from 'three';

const DHL_LOGO_URL = '/dhl-logo.svg';
const DHL_RED: [number, number, number] = [212 / 255, 5 / 255, 17 / 255];
const DHL_YELLOW: [number, number, number] = [1, 0xcc / 255, 0];

// Размер на котором мы рендерим SVG в bitmap для сэмплирования. Чем больше,
// тем чётче край букв при больших моделях; 800×267 = ~213K сэмплов, дёшево.
const RASTER_W = 800;
const RASTER_H = 267;

export type DhlMask = {
  width: number;
  height: number;
  /** 1 = логотип занимает пиксель, 0 = прозрачно */
  data: Uint8Array;
};

let maskPromise: Promise<DhlMask> | null = null;

export function getDhlMask(): Promise<DhlMask> {
  if (maskPromise) return maskPromise;
  maskPromise = (async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = DHL_LOGO_URL;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('DHL logo failed to load'));
    });
    const c = document.createElement('canvas');
    c.width = RASTER_W;
    c.height = RASTER_H;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.clearRect(0, 0, RASTER_W, RASTER_H);
    ctx.drawImage(img, 0, 0, RASTER_W, RASTER_H);
    const px = ctx.getImageData(0, 0, RASTER_W, RASTER_H).data;
    const data = new Uint8Array(RASTER_W * RASTER_H);
    for (let i = 0; i < data.length; i++) {
      data[i] = px[i * 4 + 3]! > 64 ? 1 : 0;
    }
    return { width: RASTER_W, height: RASTER_H, data };
  })();
  return maskPromise;
}

/**
 * Назначает каждому кубу DHL-цвет: красный если попадает в маску лого,
 * жёлтый иначе. Лого позиционируется по центру модели, fit-by-width.
 */
export function colorCubesDhl(
  cubes: { pos: [number, number, number]; color: THREE.Color }[],
  mask: DhlMask
): { pos: [number, number, number]; color: THREE.Color }[] {
  if (cubes.length === 0) return cubes;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const c of cubes) {
    if (c.pos[0] < minX) minX = c.pos[0];
    if (c.pos[0] > maxX) maxX = c.pos[0];
    if (c.pos[1] < minY) minY = c.pos[1];
    if (c.pos[1] > maxY) maxY = c.pos[1];
  }
  const W = Math.max(1, maxX - minX);
  const H = Math.max(1, maxY - minY);
  const logoAspect = mask.width / mask.height; // ~3 для DHL
  const logoW = W; // fit by width
  const logoH = logoW / logoAspect;
  const logoCenterY = (minY + maxY) / 2;
  const logoTop = logoCenterY + logoH / 2;
  const logoBottom = logoCenterY - logoH / 2;

  const yellow = new THREE.Color(DHL_YELLOW[0], DHL_YELLOW[1], DHL_YELLOW[2]);
  const red = new THREE.Color(DHL_RED[0], DHL_RED[1], DHL_RED[2]);

  return cubes.map((c) => {
    const cx = c.pos[0];
    const cy = c.pos[1];
    let isLogo = false;
    if (cy >= logoBottom && cy <= logoTop) {
      const ux = (cx - minX) / W;
      // image-y растёт вниз; logo top соответствует pixel y=0
      const uy = (logoTop - cy) / logoH;
      const ix = Math.min(mask.width - 1, Math.max(0, Math.floor(ux * mask.width)));
      const iy = Math.min(mask.height - 1, Math.max(0, Math.floor(uy * mask.height)));
      isLogo = mask.data[iy * mask.width + ix] === 1;
    }
    return { pos: c.pos, color: isLogo ? red : yellow };
  });
}
