/**
 * DHL-стиль: воксели — обычные кубы, на каждой грани каждого кубика
 * напечатано лого DHL поверх жёлтого фона. Текстура одна на все шесть
 * граней, поэтому с любого ракурса видно «парсель» с лого.
 *
 * Лого живёт в public/dhl-logo.svg (плейсхолдер). Чтобы заменить на
 * финальный PNG: положи файл в public/dhl-logo.png и поменяй
 * DHL_LOGO_URL ниже.
 */

import * as THREE from 'three';

const DHL_LOGO_URL = '/dhl-logo.svg';
const DHL_YELLOW_HEX = '#FFCC00';
const TEX_SIZE = 512;

let texturePromise: Promise<THREE.Texture> | null = null;

export function getDhlTexture(): Promise<THREE.Texture> {
  if (texturePromise) return texturePromise;
  texturePromise = (async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = DHL_LOGO_URL;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('DHL logo failed to load'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    // 1. Жёлтый фон на всю текстуру.
    ctx.fillStyle = DHL_YELLOW_HEX;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // 2. Лого по центру: fit-by-width 88%, центрировано вертикально.
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    const logoW = TEX_SIZE * 0.88;
    const logoH = logoW / aspect;
    const logoX = (TEX_SIZE - logoW) / 2;
    const logoY = (TEX_SIZE - logoH) / 2;
    ctx.drawImage(img, logoX, logoY, logoW, logoH);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  })();
  return texturePromise;
}
