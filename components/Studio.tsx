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
import { Tooltip } from '@/components/ui/tooltip';
import { GalleryHorizontal, Shuffle } from 'lucide-react';
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

  const { pixels, size, loadPixelData, randomize } = useEditor();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c: AppConfig) => setConfig(c))
      .catch(() => setConfig({ hasBlob: false, hasPostgres: false }));
  }, []);

  // Auto-generate стартовую фигуру + случайный стиль на первой загрузке.
  // Не запускаем когда пришёл remix-параметр — там грузится работа из галереи.
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
        Десктоп: двухколоночная сетка. Toolbar на всю ширину сверху,
        слева — Editor + PressurePanel, справа — StyleSelector + ModelViewer.
        На мобильном секции «исчезают» через display:contents — их дети
        попадают напрямую в flex-col главного контейнера, и порядок
        перестраивается через order-1..5.

        Мобильный порядок: Toolbar → Editor → ModelViewer → StyleSelector
        → PressurePanel. Render-зона стоит сразу под редактором и
        квадратной формы (aspect-square).
      */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-5 md:gap-6 p-6 pt-6">
        <div className="order-1 md:order-none md:col-span-2">
          <Toolbar />
        </div>

        <section className="contents md:flex md:flex-col md:gap-5">
          <div className="order-2 md:order-none relative cs-card flex items-center justify-center aspect-square md:aspect-auto md:min-h-[440px] md:flex-1 no-touch overflow-hidden p-8">
            <span className="absolute top-6 left-8 cs-label z-10">Editor · {size}×{size}</span>
            <PixelCanvas />
          </div>
          <div className="order-[2.5] md:order-none flex justify-center">
            <Tooltip content="Generate a random shape · pick a random style">
              <Button variant="secondary" onClick={randomize} aria-label="Generate random shape">
                <Shuffle className="h-[18px] w-[18px]" />
                Random
              </Button>
            </Tooltip>
          </div>
          <div className="order-5 md:order-none">
            <PressurePanel />
          </div>
        </section>

        <section className="contents md:flex md:flex-col md:gap-5">
          <div className="order-4 md:order-none">
            <StyleSelector />
          </div>
          <div className="order-3 md:order-none aspect-square md:aspect-auto md:min-h-[480px] md:flex-1">
            <ModelViewer />
          </div>
        </section>
      </main>
    </div>
  );
}
