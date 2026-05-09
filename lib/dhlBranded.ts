/**
 * DHL-стиль: воксели — обычные кубы, на каждой грани — лого DHL поверх
 * жёлтого фона. Текстура одна на все шесть граней каждого кубика.
 *
 * Текстура полностью генерируется на canvas в браузере (без внешнего
 * файла) — рисуем красные полоски по бокам и italic-bold «DHL» в центре
 * на жёлтой подложке. Шрифт выбирается из стека системных тяжёлых:
 * Arial Black на macOS/Windows, Liberation Sans Bold на Linux. Это
 * стабильно лучше чем SVG-плейсхолдер с непредсказуемым font-rendering'ом.
 */

import * as THREE from 'three';

const TEX_SIZE = 1024;
const DHL_YELLOW = '#FFCC00';
const DHL_RED = '#D40511';

let texturePromise: Promise<THREE.Texture> | null = null;

export function getDhlTexture(): Promise<THREE.Texture> {
  if (texturePromise) return texturePromise;
  texturePromise = (async () => {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    // 1. Жёлтый фон.
    ctx.fillStyle = DHL_YELLOW;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // 2. Боковые полоски — три слева, три справа, как в оригинальном
    // DHL mark'е. Размеры подобраны от высоты «строки лого» (центр canvas).
    const stripesCenterY = TEX_SIZE / 2;
    const stripeH = TEX_SIZE * 0.025;       // ~25px
    const stripeGap = TEX_SIZE * 0.018;     // ~18px между полосками
    const stripeW = TEX_SIZE * 0.12;        // ~120px длина полоски
    const stripeBlockH = stripeH * 3 + stripeGap * 2;
    const stripeY0 = stripesCenterY - stripeBlockH / 2;
    const leftX = TEX_SIZE * 0.06;
    const rightX = TEX_SIZE - TEX_SIZE * 0.06 - stripeW;
    ctx.fillStyle = DHL_RED;
    for (let i = 0; i < 3; i++) {
      const y = stripeY0 + i * (stripeH + stripeGap);
      ctx.fillRect(leftX, y, stripeW, stripeH);
      ctx.fillRect(rightX, y, stripeW, stripeH);
    }

    // 3. «DHL» italic-bold в центре. Стек тяжёлых шрифтов + ручной skew
    // ≈ -12°: гарантирует наклон даже если italic-вариант выбранного
    // шрифта на машине пользователя отсутствует.
    ctx.save();
    ctx.translate(TEX_SIZE / 2, TEX_SIZE / 2);
    ctx.transform(1, 0, -0.213, 1, 0, 0); // skewX(-12°)
    ctx.fillStyle = DHL_RED;
    ctx.font =
      '900 280px "Arial Black", "Helvetica Neue", "Impact", "Liberation Sans Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // letterSpacing — Chrome/Safari support; на старых Firefox no-op.
    if ('letterSpacing' in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-12px';
    }
    ctx.fillText('DHL', 0, 0);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  })();
  return texturePromise;
}
