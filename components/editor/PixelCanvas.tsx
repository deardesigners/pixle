'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor } from '@/lib/store';
import { brushFootprint, bresenham, computeStroke, floodFill, pressureFromVelocity } from '@/lib/brush';
import { hexToRgba } from '@/lib/utils';

const DISPLAY_PX = 512;

type ActivePointer = {
  id: number;
  type: string;
  lastX: number;
  lastY: number;
  lastT: number;
  hadRealPressure: boolean;
};

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const activeRef = useRef<Map<number, ActivePointer>>(new Map());
  const drawingPointerIdRef = useRef<number | null>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number; startMid: { x: number; y: number } } | null>(null);
  const transformRef = useRef<{ scale: number; tx: number; ty: number }>({ scale: 1, tx: 0, ty: 0 });

  const {
    size,
    pixels,
    tool,
    color,
    brushSize,
    pressureMap,
    pressureEnabled,
    pressureDetected,
    setPressureDetected,
    setLivePressure,
    paintPixel,
    pushHistory,
    replacePixels,
    setColor,
    undo,
    redo,
    setTool
  } = useEditor();

  const drawScene = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, DISPLAY_PX, DISPLAY_PX);

    const cell = DISPLAY_PX / 16;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#1f1f23' : '#15151a';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    const pxSize = DISPLAY_PX / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const a = pixels[i + 3] ?? 0;
        if (a === 0) continue;
        ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${a / 255})`;
        ctx.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
      }
    }

    if (size <= 32) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pxSize, 0);
        ctx.lineTo(i * pxSize, DISPLAY_PX);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * pxSize);
        ctx.lineTo(DISPLAY_PX, i * pxSize);
        ctx.stroke();
      }
    }
  }, [pixels, size]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    ctxRef.current = c.getContext('2d');
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    drawScene();
  }, [drawScene, pixels]);

  const eventToCanvasPx = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const c = canvasRef.current;
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      if (cx < 0 || cy < 0 || cx >= rect.width || cy >= rect.height) return null;
      const x = Math.floor((cx / rect.width) * size);
      const y = Math.floor((cy / rect.height) * size);
      return { x, y };
    },
    [size]
  );

  const stamp = useCallback(
    (cx: number, cy: number, pressure: number) => {
      const stroke = computeStroke(brushSize, pressure, pressureMap, pressureEnabled);
      const rgba = hexToRgba(color);
      if (tool === 'eraser') rgba[3] = 0;
      const targetA = tool === 'eraser' ? 0 : Math.round(rgba[3] * stroke.alpha);
      const finalRgba: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], targetA];
      const points = brushFootprint(
        Math.round(cx + stroke.jitterX),
        Math.round(cy + stroke.jitterY),
        stroke.size
      );
      for (const [px, py] of points) {
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        paintPixel(px, py, finalRgba);
      }
    },
    [brushSize, color, paintPixel, pressureEnabled, pressureMap, size, tool]
  );

  const drawLine = useCallback(
    (x0: number, y0: number, x1: number, y1: number, pressure: number) => {
      const points = bresenham(x0, y0, x1, y1);
      for (const [px, py] of points) stamp(px, py, pressure);
    },
    [stamp]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const c = canvasRef.current;
      if (!c) return;

      // Детектим стилус: первое же реальное pressure ≠ 0.5 включает Pen-ветку.
      if (e.pointerType === 'pen' || (e.pressure !== 0 && e.pressure !== 0.5)) {
        if (!pressureDetected) setPressureDetected(true);
      }

      const ap: ActivePointer = {
        id: e.pointerId,
        type: e.pointerType,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        hadRealPressure: e.pressure !== 0 && e.pressure !== 0.5
      };
      activeRef.current.set(e.pointerId, ap);

      // Multi-touch: второй палец → переход в pinch и отмена рисования.
      if (activeRef.current.size === 2 && e.pointerType === 'touch') {
        drawingPointerIdRef.current = null;
        const pts = Array.from(activeRef.current.values());
        const a = pts[0]!;
        const b = pts[1]!;
        const dx = a.lastX - b.lastX;
        const dy = a.lastY - b.lastY;
        pinchRef.current = {
          startDist: Math.hypot(dx, dy),
          startScale: transformRef.current.scale,
          startMid: { x: (a.lastX + b.lastX) / 2, y: (a.lastY + b.lastY) / 2 }
        };
        return;
      }

      c.setPointerCapture(e.pointerId);
      const point = eventToCanvasPx(e.clientX, e.clientY);
      if (!point) return;

      if (tool === 'eyedropper') {
        const i = (point.y * size + point.x) * 4;
        const r = pixels[i] ?? 0;
        const g = pixels[i + 1] ?? 0;
        const b = pixels[i + 2] ?? 0;
        const a = pixels[i + 3] ?? 0;
        if (a > 0) {
          const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
          setColor(hex);
        }
        setTool('brush');
        return;
      }

      pushHistory();

      if (tool === 'fill') {
        const next = new Uint8ClampedArray(pixels);
        const target = hexToRgba(color);
        floodFill(next, size, point.x, point.y, target);
        replacePixels(next);
        return;
      }

      drawingPointerIdRef.current = e.pointerId;
      const pressure =
        e.pointerType === 'mouse'
          ? 1
          : ap.hadRealPressure
            ? e.pressure
            : 0.6;
      setLivePressure(pressure);
      stamp(point.x, point.y, pressure);
    },
    [
      eventToCanvasPx,
      tool,
      pixels,
      size,
      setColor,
      setTool,
      pushHistory,
      color,
      replacePixels,
      stamp,
      pressureDetected,
      setPressureDetected,
      setLivePressure
    ]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const ap = activeRef.current.get(e.pointerId);
      if (!ap) return;

      // Pinch zoom двумя пальцами
      if (pinchRef.current && activeRef.current.size === 2) {
        ap.lastX = e.clientX;
        ap.lastY = e.clientY;
        const pts = Array.from(activeRef.current.values());
        const a = pts[0]!;
        const b = pts[1]!;
        const dist = Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY);
        const ratio = dist / pinchRef.current.startDist;
        const newScale = Math.min(4, Math.max(1, pinchRef.current.startScale * ratio));
        transformRef.current.scale = newScale;
        const cont = containerRef.current;
        if (cont) cont.style.transform = `scale(${newScale})`;
        return;
      }

      if (drawingPointerIdRef.current !== e.pointerId) return;

      // Coalesced events — ключ к плавности на iPad/Pencil.
      const events = typeof e.nativeEvent.getCoalescedEvents === 'function'
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];
      const eventList: PointerEvent[] = events.length > 0 ? events : [e.nativeEvent];

      for (const ev of eventList) {
        const point = eventToCanvasPx(ev.clientX, ev.clientY);
        if (!point) continue;

        let pressure: number;
        if (e.pointerType === 'mouse') {
          pressure = 1;
        } else if (ap.hadRealPressure || ev.pressure > 0) {
          pressure = ev.pressure || 0.6;
          if (ev.pressure !== 0 && ev.pressure !== 0.5) ap.hadRealPressure = true;
        } else {
          // Velocity-fallback для пальцев без аппаратного давления.
          const dx = ev.clientX - ap.lastX;
          const dy = ev.clientY - ap.lastY;
          const dist = Math.hypot(dx, dy);
          const dt = performance.now() - ap.lastT;
          pressure = pressureFromVelocity(dist, dt);
        }

        setLivePressure(pressure);

        const prev = eventToCanvasPx(ap.lastX, ap.lastY);
        if (prev && (prev.x !== point.x || prev.y !== point.y)) {
          drawLine(prev.x, prev.y, point.x, point.y, pressure);
        } else {
          stamp(point.x, point.y, pressure);
        }

        ap.lastX = ev.clientX;
        ap.lastY = ev.clientY;
        ap.lastT = performance.now();
      }
    },
    [drawLine, eventToCanvasPx, setLivePressure, stamp]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    activeRef.current.delete(e.pointerId);
    if (drawingPointerIdRef.current === e.pointerId) drawingPointerIdRef.current = null;
    if (activeRef.current.size < 2) pinchRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer уже отпущен
    }
    setLivePressure(0);
  }, [setLivePressure]);

  // Hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key === '0') {
        e.preventDefault();
        transformRef.current.scale = 1;
        if (containerRef.current) containerRef.current.style.transform = 'scale(1)';
        return;
      }
      switch (e.key.toLowerCase()) {
        case 'b': setTool('brush'); break;
        case 'e': setTool('eraser'); break;
        case 'g': setTool('fill'); break;
        case 'i': setTool('eyedropper'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [redo, setTool, undo]);

  const cursorClass =
    tool === 'eyedropper' ? 'cursor-crosshair' : tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div
        ref={containerRef}
        className="origin-center transition-transform duration-100"
      >
        <canvas
          ref={canvasRef}
          width={DISPLAY_PX}
          height={DISPLAY_PX}
          className={`pixel-canvas bg-black rounded-md shadow-2xl ${cursorClass}`}
          style={{ width: 'min(80vmin, 600px)', height: 'min(80vmin, 600px)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}
