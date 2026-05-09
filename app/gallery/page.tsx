'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { STYLE_LIST } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { cn } from '@/lib/utils';

export default function GalleryPage() {
  const [style, setStyle] = useState<StyleId | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');

  // Match the StyleSelector chips on the studio render card so filter
  // chips read with the same visual weight across the product.
  const chipClass = (active: boolean) =>
    cn(
      'h-8 px-3.5 rounded-pill transition-colors text-[12px] font-semibold tracking-tight border-[1.5px] whitespace-nowrap flex items-center gap-1.5',
      active
        ? 'bg-text text-white border-text'
        : 'bg-white/70 backdrop-blur border-text/15 text-text hover:border-text'
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col">
        <p className="sr-only">
          Browse a public gallery of pixel art turned into 3D models. Filter by style, sort by
          recent or popular, and remix any sprite as a starting point for your own pixel art
          creation.
        </p>

        {/* Studio-parity top header: brand wordmark + tagline (left), primary CTA back to studio (right). */}
        <header className="px-6 pt-6 pb-3 flex items-center gap-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="font-display font-bold text-[24px] tracking-tightest leading-none text-accent-bold"
              aria-label="Pixle home"
            >
              Pixle
            </Link>
            <span className="cs-label hidden sm:inline">Gallery · public feed</span>
          </div>
          <Link href="/" className="ml-auto">
            <Tooltip content="Back to the studio">
              <Button variant="default" aria-label="Back to studio" className="cs-glow">
                <ArrowLeft className="h-[18px] w-[18px]" />
                Studio
              </Button>
            </Tooltip>
          </Link>
        </header>

        {/* Sticky filter strip — keeps controls reachable while scrolling the feed. */}
        <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
          <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tooltip content="Show all submissions">
                <button onClick={() => setMine(false)} className={chipClass(!mine)} aria-pressed={!mine}>
                  All
                </button>
              </Tooltip>
              <Tooltip content="Show only my submissions on this device">
                <button onClick={() => setMine(true)} className={chipClass(mine)} aria-pressed={mine}>
                  My
                </button>
              </Tooltip>
              <div className="w-px h-4 bg-border mx-1" />
              <Tooltip content="Any style">
                <button
                  onClick={() => setStyle(undefined)}
                  className={chipClass(!style)}
                  aria-pressed={!style}
                >
                  Any style
                </button>
              </Tooltip>
              {STYLE_LIST.map((s) => (
                <Tooltip key={s.id} content={s.description}>
                  <button
                    onClick={() => setStyle(s.id)}
                    className={chipClass(style === s.id)}
                    aria-pressed={style === s.id}
                    aria-label={`Filter by ${s.label}`}
                  >
                    <span className="opacity-70">{s.emoji}</span>
                    {s.label}
                  </button>
                </Tooltip>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {(['recent', 'popular'] as const).map((s) => (
                <Tooltip key={s} content={s === 'recent' ? 'Newest first' : 'Most-liked first'}>
                  <button
                    onClick={() => setSort(s)}
                    className={chipClass(sort === s)}
                    aria-pressed={sort === s}
                    aria-label={`Sort by ${s}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <main className="flex-1 p-6">
          <GalleryGrid style={style} mine={mine} sort={sort} />
        </main>
      </div>
    </TooltipProvider>
  );
}
