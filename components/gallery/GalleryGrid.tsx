'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/LogoMark';
import { GalleryCard, type GalleryItem } from './GalleryCard';
import { getClientId } from '@/lib/clientId';
import type { StyleId } from '@/lib/validation';

type Props = {
  style?: StyleId;
  mine: boolean;
  sort: 'recent' | 'popular';
};

export function GalleryGrid({ style, mine, sort }: Props) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [clientId, setClientId] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setClientId(getClientId());
  }, []);

  // reset on filter change
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setDone(false);
  }, [style, mine, sort]);

  const fetchMore = useCallback(async () => {
    if (loading || done || !clientId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, limit: '24', clientId });
      if (style) params.set('style', style);
      if (mine) params.set('mine', '1');
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/gallery?${params.toString()}`);
      if (!res.ok) throw new Error('gallery fetch failed');
      const data = (await res.json()) as { items: GalleryItem[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [clientId, cursor, done, loading, mine, sort, style]);

  useEffect(() => {
    if (!clientId) return;
    fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, style, mine, sort]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e?.isIntersecting) fetchMore();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore]);

  const isEmpty = done && items.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <LogoMark sizeClass="h-44 w-44 md:h-56 md:w-56" />
        <h2 className="mt-4 font-display font-bold text-[28px] tracking-tightest leading-tight text-accent-bold">
          Nothing here yet
        </h2>
        <p className="mt-2 max-w-sm text-[14px] text-muted leading-relaxed">
          Make a pixel-art shape, pick a style, and hit Publish — your work will land here.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="default" aria-label="Open studio" className="cs-glow">
            Open studio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <GalleryCard key={it.id} item={it} clientId={clientId} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-12 flex items-center justify-center text-xs text-muted">
        {loading ? 'Loading…' : done ? 'End of feed' : ''}
      </div>
    </>
  );
}
