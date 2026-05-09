'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toolbar } from '@/components/editor/Toolbar';
import { PixelCanvas } from '@/components/editor/PixelCanvas';
import { PressurePanel } from '@/components/editor/PressurePanel';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { useEditor, pixelsToFlat } from '@/lib/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { GalleryHorizontal, Shuffle } from 'lucide-react';
import { toast } from '@/components/Toaster';
import { getDhlTexture } from '@/lib/dhlBranded';

type AppConfig = { hasBlob: boolean; hasPostgres: boolean };

export function Studio() {
  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <StudioInner />
      </Suspense>
    </TooltipProvider>
  );
}

function StudioInner() {
  const params = useSearchParams();
  const router = useRouter();
  const remixId = params.get('remix');
  const remixHandled = useRef(false);
  const [, setConfig] = useState<AppConfig | null>(null);

  const { pixels, size, loadPixelData, randomize } = useEditor();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c: AppConfig) => setConfig(c))
      .catch(() => setConfig({ hasBlob: false, hasPostgres: false }));
    // Warm up the DHL texture in the background — by the time the user
    // switches to DHL (or it gets picked as the initial random style)
    // the logo canvas is already generated and cached.
    getDhlTexture().catch(() => {});
  }, []);

  // Auto-generate a starter shape + random style on first load.
  // Skipped when ?remix= is set — that flow loads a saved work from the gallery.
  const seededRef = useRef(false);
  useEffect(() => {
    if (remixId || seededRef.current) return;
    const empty = pixels.every((v, i) => (i % 4 === 3 ? v === 0 : true));
    if (!empty) return;
    seededRef.current = true;
    randomize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixId]);

  useEffect(() => {
    if (!remixId || remixHandled.current) return;
    remixHandled.current = true;
    const prevSnapshot = new Uint8ClampedArray(pixels);
    const prevSize = size;
    const loadRemix = () =>
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
        .catch(() =>
          toast("Couldn't load that work. It may have been removed.", {
            label: 'Retry',
            onClick: loadRemix
          })
        );
    loadRemix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixId]);

  return (
    <div className="min-h-screen flex flex-col">
      {/*
        Header sits directly on the page background. Brand wordmark and
        tagline share a baseline; Gallery CTA is anchored to the right.
      */}
      <header className="px-6 pt-6 pb-3 flex items-center gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-bold text-[24px] tracking-tightest leading-none text-accent-bold">
            Pixle
          </span>
          <span className="cs-label hidden sm:inline">Pixel art into 3D</span>
        </div>
        <Link href="/gallery" className="ml-auto">
          <Tooltip content="Browse the public gallery">
            <Button variant="default" aria-label="Open gallery" className="cs-glow">
              <GalleryHorizontal className="h-[18px] w-[18px]" />
              Gallery
            </Button>
          </Tooltip>
        </Link>
      </header>

      {/*
        Toolbar on top, then equal-height editor + render grid, then
        PressurePanel (only mounts when a stylus is detected). PressurePanel
        lives outside the columns so its height never shortens the editor
        card relative to the render card.
      */}
      <main className="flex-1 flex flex-col gap-5 md:gap-6 p-6 pt-2">
        <Toolbar />

        <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-5 md:gap-6">
          <div className="relative cs-card aspect-square md:aspect-auto md:min-h-[560px] no-touch overflow-hidden">
            <span className="absolute top-6 left-6 z-10 cs-label">
              Editor · {size}×{size}
            </span>
            <div className="absolute inset-0 flex items-center justify-center px-10 pt-20 pb-24">
              <PixelCanvas />
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-center z-10">
              <Tooltip content="Generate a random shape · pick a random style">
                <Button variant="default" onClick={randomize} aria-label="Generate random shape">
                  <Shuffle className="h-[18px] w-[18px]" />
                  Random
                </Button>
              </Tooltip>
            </div>
          </div>

          <div className="aspect-square md:aspect-auto md:min-h-[560px]">
            <ModelViewer />
          </div>
        </div>

        <PressurePanel />
      </main>
    </div>
  );
}
