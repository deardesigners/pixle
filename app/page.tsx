'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toolbar } from '@/components/editor/Toolbar';
import { PixelCanvas } from '@/components/editor/PixelCanvas';
import { PressurePanel } from '@/components/editor/PressurePanel';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { StyleSelector } from '@/components/viewer/StyleSelector';
import { useEditor, pixelsToFlat } from '@/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ImageIcon, GalleryHorizontal } from 'lucide-react';
import { getClientId } from '@/lib/clientId';
import { toast } from '@/components/Toaster';

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

  const {
    pixels,
    size,
    currentStyle,
    setStatus,
    setCurrentModel,
    loadPixelData
  } = useEditor();

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
        toast('Demo mode: показан voxel-фолбэк (нет MESHY_API_KEY)');
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
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur border-b border-border bg-aurora">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ImageIcon className="h-5 w-5 text-accent" />
              <div className="absolute inset-0 blur-md bg-accent/40 rounded-full -z-10" />
            </div>
            <h1 className="font-heading font-semibold text-lg tracking-tight">
              Pixel-to-3D <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">Studio</span>
            </h1>
          </div>
          <Link href="/gallery">
            <Button variant="secondary" size="sm">
              <GalleryHorizontal className="h-4 w-4" />
              Gallery
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-3 p-3">
        <section className="flex flex-col gap-3">
          <Toolbar onGenerate={onGenerate} />
          <div className="flex-1 bg-panel border border-border rounded-xl flex items-center justify-center min-h-[400px] no-touch">
            <PixelCanvas />
          </div>
          <PressurePanel />
        </section>

        <section className="flex flex-col gap-3">
          <StyleSelector />
          <div className="flex-1 min-h-[400px]">
            <ModelViewer />
          </div>
        </section>
      </main>
    </div>
  );
}
