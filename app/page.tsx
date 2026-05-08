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

  const { pixels, size, loadPixelData } = useEditor();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c: AppConfig) => setConfig(c))
      .catch(() => setConfig({ hasBlob: false, hasPostgres: false }));
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-4 z-30 mx-4 mt-4 cs-capsule rounded-pill">
        <div className="h-[64px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-display font-bold text-[20px] tracking-tightest leading-none text-accent-bold">
              Pixle
            </div>
            <span className="cs-label hidden sm:inline">Pixels into 3D</span>
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
          <Toolbar />
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
