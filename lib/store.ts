'use client';

import { create } from 'zustand';
import type { StyleId } from './validation';
import { generateRandomShape, pickRandomStyle } from './randomShape';

export type Tool = 'brush' | 'eraser' | 'fill' | 'eyedropper';

export type PressureMap = { size: boolean; alpha: boolean; jitter: boolean };

type Snapshot = Uint8ClampedArray;

type State = {
  size: 16 | 32 | 64;
  pixels: Uint8ClampedArray;
  // Bump на каждой мутации pixels. Uint8ClampedArray мутируется in-place,
  // ссылка не меняется — без version useEffect/useMemo деп-чек пропускает обновления
  // и канвас/3D-сцена не перерисовываются во время рисования.
  version: number;
  history: Snapshot[];
  future: Snapshot[];
  tool: Tool;
  color: string;
  brushSize: 1 | 2 | 3 | 4;
  pressureMap: PressureMap;
  pressureEnabled: boolean;
  pressureDetected: boolean;
  livePressure: number;
  currentStyle: StyleId;
};

type Actions = {
  setSize: (s: 16 | 32 | 64) => void;
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setBrushSize: (n: 1 | 2 | 3 | 4) => void;
  togglePressureChannel: (k: keyof PressureMap) => void;
  setPressureEnabled: (v: boolean) => void;
  setPressureDetected: (v: boolean) => void;
  setLivePressure: (v: number) => void;
  setStyle: (s: StyleId) => void;
  paintPixel: (x: number, y: number, rgba: [number, number, number, number]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  loadPixelData: (size: number, flat: number[][]) => void;
  replacePixels: (next: Uint8ClampedArray) => void;
  randomize: () => void;
};

function makeBuffer(size: number): Uint8ClampedArray {
  return new Uint8ClampedArray(size * size * 4);
}

const HISTORY_LIMIT = 50;

export const useEditor = create<State & Actions>((set, get) => ({
  size: 32,
  pixels: makeBuffer(32),
  version: 0,
  history: [],
  future: [],
  tool: 'brush',
  color: '#ec4899',
  brushSize: 1,
  pressureMap: { size: true, alpha: false, jitter: false },
  pressureEnabled: false,
  pressureDetected: false,
  livePressure: 0,
  currentStyle: 'voxel',

  setSize: (s) => {
    set({ size: s, pixels: makeBuffer(s), version: get().version + 1, history: [], future: [] });
  },
  setTool: (t) => set({ tool: t }),
  setColor: (c) => set({ color: c }),
  setBrushSize: (n) => set({ brushSize: n }),
  togglePressureChannel: (k) =>
    set((state) => ({ pressureMap: { ...state.pressureMap, [k]: !state.pressureMap[k] } })),
  setPressureEnabled: (v) => set({ pressureEnabled: v }),
  setPressureDetected: (v) => set({ pressureDetected: v, pressureEnabled: v || get().pressureEnabled }),
  setLivePressure: (v) => set({ livePressure: v }),
  setStyle: (s) => set({ currentStyle: s }),

  paintPixel: (x, y, [r, g, b, a]) => {
    const { size, pixels } = get();
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const next = pixels;
    if (a === 0) {
      next[i] = 0;
      next[i + 1] = 0;
      next[i + 2] = 0;
      next[i + 3] = 0;
    } else if (a < 255) {
      // Альфа-блендинг с фоном (для pressure-alpha)
      const dstA = next[i + 3] ?? 0;
      const srcA = a / 255;
      const outA = srcA + (dstA / 255) * (1 - srcA);
      const blend = (s: number, d: number) =>
        outA === 0 ? 0 : Math.round((s * srcA + d * (dstA / 255) * (1 - srcA)) / outA);
      next[i] = blend(r, next[i] ?? 0);
      next[i + 1] = blend(g, next[i + 1] ?? 0);
      next[i + 2] = blend(b, next[i + 2] ?? 0);
      next[i + 3] = Math.round(outA * 255);
    } else {
      next[i] = r;
      next[i + 1] = g;
      next[i + 2] = b;
      next[i + 3] = 255;
    }
    set({ pixels: next, version: get().version + 1 });
  },

  pushHistory: () => {
    const { pixels, history } = get();
    const snap = new Uint8ClampedArray(pixels);
    const next = [...history, snap];
    if (next.length > HISTORY_LIMIT) next.shift();
    set({ history: next, future: [] });
  },

  undo: () => {
    const { history, future, pixels, version } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    const newHistory = history.slice(0, -1);
    set({
      history: newHistory,
      future: [...future, new Uint8ClampedArray(pixels)],
      pixels: new Uint8ClampedArray(prev),
      version: version + 1
    });
  },

  redo: () => {
    const { history, future, pixels, version } = get();
    if (future.length === 0) return;
    const next = future[future.length - 1]!;
    const newFuture = future.slice(0, -1);
    set({
      history: [...history, new Uint8ClampedArray(pixels)],
      future: newFuture,
      pixels: new Uint8ClampedArray(next),
      version: version + 1
    });
  },

  clear: () => {
    const { size, version } = get();
    get().pushHistory();
    set({ pixels: makeBuffer(size), version: version + 1 });
  },

  loadPixelData: (size, flat) => {
    const buf = makeBuffer(size);
    for (let i = 0; i < flat.length && i < size * size; i++) {
      const px = flat[i];
      if (!px) continue;
      const j = i * 4;
      buf[j] = px[0] ?? 0;
      buf[j + 1] = px[1] ?? 0;
      buf[j + 2] = px[2] ?? 0;
      buf[j + 3] = px[3] ?? 0;
    }
    const validSize: 16 | 32 | 64 = size <= 16 ? 16 : size <= 32 ? 32 : 64;
    set({ size: validSize, pixels: buf, version: get().version + 1, history: [], future: [] });
  },

  replacePixels: (next) => set({ pixels: next, version: get().version + 1 }),

  randomize: () => {
    const { size, version } = get();
    get().pushHistory();
    set({
      pixels: generateRandomShape(size),
      currentStyle: pickRandomStyle(),
      version: version + 1
    });
  }
}));

export function pixelsToFlat(buf: Uint8ClampedArray): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < buf.length; i += 4) {
    out.push([buf[i] ?? 0, buf[i + 1] ?? 0, buf[i + 2] ?? 0, buf[i + 3] ?? 0]);
  }
  return out;
}
