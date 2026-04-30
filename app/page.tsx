'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toolbar } from '@/components/editor/Toolbar';
import { PixelCanvas } from '@/components/editor/PixelCanvas';
import { PressurePanel } from '@/components/editor/PressurePanel';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { StyleSelector } from '@/components/viewer/StyleSelector';
import { useEditor, pixelsToFlat } from '@/lib/store';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ImageIcon, GalleryHorizontal, Info } from 'lucide-react';
import { getClientId } from '@/lib/clientId';
import { toast } from '@/components/Toaster';

type AppConfig = { hasMeshy: boolean; hasBlob: boolean; hasPostgres: boolean };

export default function HomePage() {
  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    </TooltipProvider>
  );
}

function Studio() {
  const params = useSearchParams();
  const router = useRouter();
  const remixId = params.get('remix');
  const remixHandled = useRef(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const {
    pixels,
    size,
    currentStyle,
    setStatus,
    setCurrentModel,
    loadPixelData
  } = useEditor();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c: AppConfig) => setConfig(c))
      .catch(() => setConfig({ hasMeshy: false, hasBlob: false, hasPostgres: false }));
  }, []);

  // remix-флоу
  useEffect(() => {
    if (!remixId || remixHandled.current) return;
    remixHandled.current = true;
    const prevSnapshot = new Uint8ClampedArray(pixels);
    const prevSize = size;
    fetch(`/api/gallery/${remixId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { pixel_data: { size: number; pixels: number[][] }; style_id: string }) => {
        loadPixelData(data.pixel_data.size, data.pixel_data.pixels);
        toast('Loaded from gallery', {
          label: 'Undo',
          onClick: () => {
            loadPixelData(prevSize, pixelsToFlat(prevSnapshot));
          }
        });
        const url = new URL(window.location.href);
        url.searchParams.delete('remix');
        router.replace(url.pathname);
      })
      .catch(() => toast('Не удалось загрузить ремикс'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixId]);

  const onGenerate = async () => {
    setStatus('pending', 5);
    setCurrentModel(null);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 256;
    exportCanvas.height = 256;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      setStatus('error', 0, 'Canvas unsupported');
      return;
    }
    ctx.imageSmoothingEnabled = false;
    const pxSize = 256 / size;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const a = pixels[i + 3] ?? 0;
        if (a === 0) continue;
        ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${a / 255})`;
        ctx.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
      }
    }
    const dataUrl = exportCanvas.toDataURL('image/png');
    const flat = pixelsToFlat(pixels);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          styleId: currentStyle,
          clientId: getClientId(),
          pixelData: { size, pixels: flat }
        })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Generation failed');
      }
      const data = (await res.json()) as {
        generationId: string;
        taskId: string | null;
        modelUrl: string | null;
        demoMode: boolean;
      };

      if (data.demoMode || !data.taskId) {
        setCurrentModel({ url: 'demo://voxel', generationId: data.generationId });
        setStatus('ready', 100);
        return;
      }

      setStatus('polling', 10);
      pollTask(data.taskId, data.generationId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      setStatus('error', 0, msg);
    }
  };

  const pollTask = async (taskId: string, generationId: string) => {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/generate/${taskId}/status`);
        if (!res.ok) throw new Error('Status fetch failed');
        const data = (await res.json()) as {
          status: string;
          progress: number;
          modelUrl?: string;
          error?: string;
        };
        if (data.status === 'SUCCEEDED' && data.modelUrl) {
          setCurrentModel({ url: data.modelUrl, generationId });
          setStatus('ready', 100);
          stopped = true;
          return;
        }
        if (['FAILED', 'CANCELED', 'EXPIRED'].includes(data.status)) {
          setStatus('error', data.progress ?? 0, data.error ?? data.status);
          stopped = true;
          return;
        }
        setStatus('polling', Math.max(15, data.progress ?? 0));
        setTimeout(poll, 4000);
      } catch (err) {
        setStatus('error', 0, err instanceof Error ? err.message : 'Polling failed');
      }
    };
    void poll();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-4 z-30 mx-4 mt-4 cs-capsule rounded-pill">
        <div className="h-[64px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-display font-bold text-[19px] tracking-tightest leading-none flex items-baseline gap-1.5 text-accent-bold">
              <span>Pixel</span>
              <span className="opacity-50">→</span>
              <span>3D</span>
            </div>
            <span className="cs-label hidden sm:inline">Studio</span>
            {config && !config.hasMeshy && (
              <Tooltip content={
                <div className="max-w-[260px] text-[13px] leading-snug">
                  Live 3D работает мгновенно. Hi-res Meshy-рендер требует <span className="font-mono">MESHY_API_KEY</span> в env-переменных Vercel.
                </div>
              }>
                <span className="ml-1 inline-flex items-center h-8 px-3.5 rounded-pill bg-accent text-accent-bold text-[13px] font-semibold cursor-help">
                  Demo
                </span>
              </Tooltip>
            )}
          </div>
          <Link href="/gallery">
            <Button variant="secondary" size="sm">
              <GalleryHorizontal className="h-3.5 w-3.5" />
              Gallery
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-6 p-6 pt-6">
        <section className="flex flex-col gap-5">
          <Toolbar onGenerate={onGenerate} hasHiRes={config?.hasMeshy ?? false} />
          <div className="relative flex-1 cs-card flex items-center justify-center min-h-[440px] no-touch overflow-hidden p-8">
            <span className="absolute top-6 left-8 cs-label z-10">Editor · {size}×{size}</span>
            <PixelCanvas />
          </div>
          <PressurePanel />
        </section>

        <section className="flex flex-col gap-5">
          <StyleSelector />
          <div className="flex-1 min-h-[480px]">
            <ModelViewer />
          </div>
        </section>
      </main>
    </div>
  );
}
