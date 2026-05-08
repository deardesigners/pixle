'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { STYLE_LIST } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { cn } from '@/lib/utils';

export default function GalleryPage() {
  const [style, setStyle] = useState<StyleId | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');

  const chipClass = (active: boolean) =>
    cn(
      'whitespace-nowrap px-3 h-7 rounded-pill border text-[12px] tracking-tight transition-colors flex items-center gap-1.5',
      active
        ? 'bg-text text-bg border-text'
        : 'border-border-strong text-muted hover:text-text hover:bg-elev'
    );

  return (
    <div className="min-h-screen">
      <p className="sr-only">
        Browse a public gallery of pixel art turned into 3D models. Filter by style, sort by
        recent or popular, and remix any sprite as a starting point for your own pixel art
        creation.
      </p>
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
        <div className="px-6 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Studio
            </Button>
          </Link>
          <div className="flex items-baseline gap-2 flex-1">
            <h1 className="font-display font-semibold text-[15px] tracking-tightest leading-none">
              Gallery
            </h1>
            <span className="label">Public feed</span>
          </div>
          <div className="flex items-center gap-1">
            {(['recent', 'popular'] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={chipClass(sort === s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <button onClick={() => setMine(false)} className={chipClass(!mine)}>
            All
          </button>
          <button onClick={() => setMine(true)} className={chipClass(mine)}>
            My
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => setStyle(undefined)} className={chipClass(!style)}>
            Any style
          </button>
          {STYLE_LIST.map((s) => (
            <button key={s.id} onClick={() => setStyle(s.id)} className={chipClass(style === s.id)}>
              <span className="opacity-70">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        <GalleryGrid style={style} mine={mine} sort={sort} />
      </main>
    </div>
  );
}
