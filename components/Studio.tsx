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
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { GalleryHorizontal } from 'lucide-react';
import { toast } from '@/components/Toaster';

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

  const { pixels, size, loadPixelData } = useEditor();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c: AppConfig) => setConfig(c))
      .catch(() => setConfig({ hasBlob: false, hasPostgres: false }));
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-4 z-30 mx-4 mt-4 cs-capsule rounded-pill">
        <div className="h-[64px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-display font-bold text-[20px] tracking-tightest leading-none text-accent-bold">
              Pixle
            </div>
            <span className="cs-label hidden sm:inline">Pixel art into 3D</span>
          </div>
          <Link href="/gallery">
            <Button variant="default" size="sm">
              <GalleryHorizontal className="h-3.5 w-3.5" />
              Gallery
            </Button>
          </Link>
        </div>
      </header>

      {/*
        На мобильном (flex-col) порядок:
          1. Toolbar (order-1)
          2. Editor canvas (order-2) — квадрат
          3. ModelViewer (order-3) — квадрат той же ширины, под редактором
          4. StyleSelector (order-4)
          5. PressurePanel (order-5, появляется только при стилусе)

        На десктопе (md+) — двухколоночная сетка с явным размещением
        в строках/колонках; order сбрасывается через md:order-none.
      */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 md:auto-rows-min gap-5 md:gap-6 p-6 pt-6">
        <div className="order-1 md:order-none md:col-span-2">
          <Toolbar />
        </div>

        <div className="order-2 md:order-none md:col-start-1 md:row-start-2 relative cs-card flex items-center justify-center aspect-square md:aspect-auto md:min-h-[440px] md:flex-1 no-touch overflow-hidden p-8">
          <span className="absolute top-6 left-8 cs-label z-10">Editor · {size}×{size}</span>
          <PixelCanvas />
        </div>

        <div className="order-3 md:order-none md:col-start-2 md:row-start-3 aspect-square md:aspect-auto md:min-h-[480px]">
          <ModelViewer />
        </div>

        <div className="order-4 md:order-none md:col-start-2 md:row-start-2">
          <StyleSelector />
        </div>

        <div className="order-5 md:order-none md:col-start-1 md:row-start-3">
          <PressurePanel />
        </div>
      </main>
    </div>
  );
}
