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
    // Прогреваем DHL-текстуру в фоне на старте — к моменту когда юзер
    // переключится на DHL (или это окажется initial random style),
    // canvas с лого будет уже сгенерирован и закеширован.
    getDhlTexture().catch(() => {});
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
      {/*
        Хедер «на фоне» — без cs-capsule подложки. Просто лого + таглайн
        прямо на странице, в одной строке с Gallery-кнопкой… кстати, нет:
        Gallery теперь внутри editor-card'а, поэтому здесь только бренд.
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
        Toolbar сверху, под ним сетка из editor + render одинаковой высоты,
        ниже PressurePanel (только если детектится stylus). PressurePanel
        вынесен из колонок — иначе его высота укорачивала editor-card относительно
        render-card.
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
