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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Studio
            </Button>
          </Link>
          <h1 className="font-semibold text-lg flex-1">Gallery</h1>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setSort('recent')}
              className={cn(
                'px-3 h-8 rounded-md border border-border',
                sort === 'recent' ? 'bg-accent border-accent text-white' : 'bg-panel hover:bg-border'
              )}
            >
              Recent
            </button>
            <button
              onClick={() => setSort('popular')}
              className={cn(
                'px-3 h-8 rounded-md border border-border',
                sort === 'popular' ? 'bg-accent border-accent text-white' : 'bg-panel hover:bg-border'
              )}
            >
              Popular
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setMine(false)}
            className={cn(
              'whitespace-nowrap px-3 h-8 rounded-full border text-xs',
              !mine ? 'bg-white text-black border-white' : 'border-border bg-panel'
            )}
          >
            All
          </button>
          <button
            onClick={() => setMine(true)}
            className={cn(
              'whitespace-nowrap px-3 h-8 rounded-full border text-xs',
              mine ? 'bg-white text-black border-white' : 'border-border bg-panel'
            )}
          >
            My
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={() => setStyle(undefined)}
            className={cn(
              'whitespace-nowrap px-3 h-8 rounded-full border text-xs',
              !style ? 'bg-accent text-white border-accent' : 'border-border bg-panel'
            )}
          >
            All styles
          </button>
          {STYLE_LIST.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={cn(
                'whitespace-nowrap px-3 h-8 rounded-full border text-xs flex items-center gap-1',
                style === s.id ? 'bg-accent text-white border-accent' : 'border-border bg-panel'
              )}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4">
        <GalleryGrid style={style} mine={mine} sort={sort} />
      </main>
    </div>
  );
}
