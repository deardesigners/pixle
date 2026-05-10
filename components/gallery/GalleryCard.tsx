'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Heart, Recycle, Maximize2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { ModelPreview } from './ModelPreview';
import { STYLE_PRESETS } from '@/lib/styles';
import type { StyleId } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Toaster';

export type GalleryItem = {
  id: string;
  client_id: string;
  style_id: StyleId;
  preview_url: string;
  thumbnail_url: string;
  pixel_data: { size: number; pixels: number[][] };
  like_count: number;
  liked_by_me: boolean;
};

export function GalleryCard({
  item,
  clientId
}: {
  item: GalleryItem;
  clientId: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [liked, setLiked] = useState(item.liked_by_me);
  const [count, setCount] = useState(item.like_count);
  const [, startTransition] = useTransition();
  // Older DB rows may carry a style_id that's no longer in the current enum —
  // fall back to voxel so the card still renders instead of crashing at runtime.
  const preset = STYLE_PRESETS[item.style_id] ?? STYLE_PRESETS.voxel;
  const safeStyleId = STYLE_PRESETS[item.style_id] ? item.style_id : 'voxel';

  const onLike = () => {
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gallery/${item.id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId })
        });
        if (!res.ok) throw new Error('Like failed');
        const data = (await res.json()) as { liked: boolean; count: number };
        setLiked(data.liked);
        setCount(data.count);
      } catch {
        setLiked(prevLiked);
        setCount(prevCount);
        toast("Couldn't update like. Try again.");
      }
    });
  };

  const onRemix = () => {
    window.location.href = `/?remix=${item.id}`;
  };

  const [reported, setReported] = useState(false);
  const onReport = () => {
    if (reported) return;
    // Optimistic — disable the button immediately so a moderator's inbox
    // doesn't get hammered if the user re-taps.
    setReported(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gallery/${item.id}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId })
        });
        if (!res.ok) throw new Error('Report failed');
        toast('Reported · thanks for the heads-up');
      } catch {
        setReported(false);
        toast("Couldn't send report. Try again.");
      }
    });
  };

  const thumb = item.thumbnail_url || item.preview_url;
  const hasModel = item.pixel_data && item.pixel_data.pixels?.length > 0;

  const workHref = `/g/${item.id}`;

  return (
    <div className="cs-card overflow-hidden group">
      <Tooltip content="Open · hover for 3D preview">
        <Link
          href={workHref}
          className="relative aspect-square bg-bg checker-bg block"
          onPointerEnter={() => setShowPreview(true)}
          onPointerLeave={() => setShowPreview(false)}
          aria-label={`${preset.label} pixel art in 3D`}
        >
        {thumb && (
          <Image
            src={thumb}
            alt={`${preset.label} pixel art`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={cn('object-cover transition-opacity', showPreview && hasModel && 'opacity-0')}
            unoptimized
          />
        )}
        {showPreview && hasModel && (
          <div className="absolute inset-0 pointer-events-none">
            <ModelPreview pixelData={item.pixel_data} styleId={safeStyleId} />
          </div>
        )}
        <Badge className="absolute top-2 left-2">
          <span>{preset.emoji}</span>
          <span>{preset.label}</span>
        </Badge>
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 h-8 w-8 pointer-events-none"
          aria-hidden
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        </Link>
      </Tooltip>
      <div className="flex items-center justify-between p-3">
        <Tooltip content={liked ? 'Remove like' : 'Like this work'}>
          <button
            onClick={onLike}
            aria-label={liked ? 'Remove like' : 'Like this work'}
            aria-pressed={liked}
            className={cn(
              'flex items-center gap-1 text-sm rounded-md px-2 h-8 hover:bg-border transition-colors',
              liked && 'text-pink-400'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-pink-400')} />
            <span>{count}</span>
          </button>
        </Tooltip>
        <div className="flex items-center gap-1">
          <Tooltip content={reported ? 'Already reported' : 'Report inappropriate content'}>
            <button
              onClick={onReport}
              disabled={reported}
              aria-label="Report this work"
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-md text-text/40 hover:text-text hover:bg-border transition-colors',
                reported && 'opacity-50 pointer-events-none'
              )}
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Open in editor as a starting point">
            <Button variant="ghost" size="sm" onClick={onRemix}>
              <Recycle className="h-4 w-4" />
              Remix
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
