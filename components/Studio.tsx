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
      <header className="px-6 pt-6 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-bold text-[24px] tracking-tightest leading-none text-accent-bold">
            Pixle
          </span>
          <span className="cs-label hidden sm:inline">Pixel art into 3D</span>
        </div>
      </header>

      {/*
        Десктоп: двухколоночная сетка. Toolbar сверху на всю ширину,
        слева — Editor (внутри: style chips + Gallery, canvas, Random),
        справа — Render. Карточки растягиваются flex-1 → одинаковая высота.

        Мобильный (display:contents на секциях): Toolbar → Editor → Render →
        PressurePanel.
      */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-5 md:gap-6 p-6 pt-2">
        <div className="order-1 md:order-none md:col-span-2">
          <Toolbar />
        </div>

        <section className="contents md:flex md:flex-col md:gap-5">
          <div className="order-2 md:order-none relative cs-card aspect-square md:aspect-auto md:min-h-[560px] md:flex-1 no-touch overflow-hidden">
            {/*
              Top row: Editor label + style chips + Gallery. Floating над
              canvas'ом (z-10), не блокирует drawing-область.
            */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3 flex-wrap">
              <span className="cs-label shrink-0">Editor · {size}×{size}</span>
              <StyleSelector />
              <Link href="/gallery" className="shrink-0">
                <Button variant="default" size="sm" aria-label="Open gallery">
                  <GalleryHorizontal className="h-3.5 w-3.5" />
                  Gallery
                </Button>
              </Link>
            </div>
            {/* Canvas, центрируется, отступы под верхнюю и нижнюю панели. */}
            <div className="absolute inset-0 flex items-center justify-center px-8 pt-20 pb-20">
              <PixelCanvas />
            </div>
            {/* Random — bottom-left, симметрично Publish/GIF в render-card. */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 z-10">
              <Tooltip content="Generate a random shape · pick a random style">
                <Button variant="default" onClick={randomize} aria-label="Generate random shape">
                  <Shuffle className="h-[18px] w-[18px]" />
                  Random
                </Button>
              </Tooltip>
            </div>
          </div>
          <div className="order-5 md:order-none">
            <PressurePanel />
          </div>
        </section>

        <section className="contents md:flex md:flex-col md:gap-5">
          <div className="order-3 md:order-none aspect-square md:aspect-auto md:min-h-[560px] md:flex-1">
            <ModelViewer />
          </div>
        </section>
      </main>
    </div>
  );
}
