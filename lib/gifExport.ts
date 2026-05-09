import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Снимает N кадров с живого WebGL-канваса и кодирует их в анимированный GIF.
 *
 * Подход — sampler over real time: сцена и так анимируется через r3f
 * useFrame, мы просто фотографируем её каждые 1/fps мс. Это требует
 * preserveDrawingBuffer=true на WebGL-контексте — иначе drawImage заберёт
 * пустой буфер.
 *
 * Кадры рисуются в OffscreenCanvas с целевым разрешением — масштабирование
 * до выходного размера происходит на этапе drawImage, GIF получает уже
 * downsampled пиксели.
 */

export type ExportGifOptions = {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  background?: string; // CSS-цвет; GIF не умеет alpha, заливаем фоном
  onProgress?: (ratio: number) => void;
};

export async function exportGif({
  canvas,
  width = 320,
  height = 320,
  fps = 24,
  durationSec = 2.5,
  background = '#F3F0FF',
  onProgress
}: ExportGifOptions): Promise<Blob> {
  const totalFrames = Math.max(1, Math.round(fps * durationSec));
  const frameDelayMs = 1000 / fps;

  // OffscreenCanvas доступен везде кроме старых Safari; fallback на DOM-канвас.
  const off: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });
  const ctx = off.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('Canvas 2D unavailable');

  // Фаза 1 — сэмплирование. Используем requestAnimationFrame чтобы попасть
  // на свежие кадры r3f-ренда и не дёргать setTimeout наугад.
  const frames: Uint8ClampedArray[] = [];
  const startedAt = performance.now();
  let lastCapturedAt = startedAt - frameDelayMs; // первый кадр снимем сразу

  while (frames.length < totalFrames) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const now = performance.now();
    if (now - lastCapturedAt < frameDelayMs - 1) continue;
    lastCapturedAt = now;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    // Копируем — getImageData разделяет буфер с canvas, нельзя ссылаться.
    frames.push(new Uint8ClampedArray(data));
    onProgress?.((frames.length / totalFrames) * 0.5);
  }

  // Фаза 2 — энкодинг. Каждый кадр квантуется в 256-цветную палитру
  // независимо (median-cut на rgb444). Для плавности можно делить общую
  // палитру, но это даст артефакты на ярких bloom-стилях.
  const enc = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const rgba = new Uint8Array(frames[i]!.buffer);
    const palette = quantize(rgba, 256, { format: 'rgb444' });
    const indexed = applyPalette(rgba, palette, 'rgb444');
    enc.writeFrame(indexed, width, height, { palette, delay: Math.round(frameDelayMs) });
    onProgress?.(0.5 + ((i + 1) / frames.length) * 0.5);
    // Дать UI вздохнуть между кадрами.
    if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }
  enc.finish();

  // Cast: TS видит ArrayBufferLike vs ArrayBuffer; для Blob это эквивалентно.
  return new Blob([enc.bytes() as unknown as BlobPart], { type: 'image/gif' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
