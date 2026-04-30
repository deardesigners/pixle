'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Heart, Recycle, Maximize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
  model_url: string;
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
  const preset = STYLE_PRESETS[item.style_id];

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
        toast('Не удалось поставить лайк');
      }
    });
  };

  const onRemix = () => {
    window.location.href = `/?remix=${item.id}`;
  };

  const thumb = item.thumbnail_url || item.preview_url;
  const hasModel = item.model_url && !item.model_url.startsWith('demo://');

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden group">
      <div
        className="relative aspect-square bg-bg checker-bg"
        onPointerEnter={() => setShowPreview(true)}
        onPointerLeave={() => setShowPreview(false)}
        onClick={() => setShowPreview((s) => !s)}
      >
        {thumb && (
          <Image
            src={thumb}
            alt={preset.label}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={cn('object-cover transition-opacity', showPreview && hasModel && 'opacity-0')}
            unoptimized
          />
        )}
        {showPreview && hasModel && (
          <div className="absolute inset-0">
            <ModelPreview url={item.model_url} />
          </div>
        )}
        <Badge className="absolute top-2 left-2">
          <span>{preset.emoji}</span>
          <span>{preset.label}</span>
        </Badge>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0">
            <div className="aspect-square w-full bg-bg">
              {hasModel ? (
                <ModelPreview url={item.model_url} />
              ) : thumb ? (
                <Image src={thumb} alt={preset.label} fill className="object-contain" unoptimized />
              ) : null}
            </div>
            <div className="p-4 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!hasModel) return toast('Demo mode: .glb недоступен');
                  const a = document.createElement('a');
                  a.href = item.model_url;
                  a.download = `${item.id}.glb`;
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                .glb
              </Button>
              <Button variant="default" size="sm" onClick={onRemix}>
                <Recycle className="h-4 w-4" />
                Remix
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center justify-between p-3">
        <button
          onClick={onLike}
          className={cn(
            'flex items-center gap-1 text-sm rounded-md px-2 h-8 hover:bg-border transition-colors',
            liked && 'text-pink-400'
          )}
        >
          <Heart className={cn('h-4 w-4', liked && 'fill-pink-400')} />
          <span>{count}</span>
        </button>
        <Button variant="ghost" size="sm" onClick={onRemix}>
          <Recycle className="h-4 w-4" />
          Remix
        </Button>
      </div>
    </div>
  );
}
