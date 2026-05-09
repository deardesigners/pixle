'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  Brush,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  Trash2,
  ImagePlus,
  GalleryHorizontal
} from 'lucide-react';
import { useEditor, pixelsToFlat, type Tool } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ColorPalette } from './ColorPalette';
import { cn } from '@/lib/utils';
import { processImageFile } from '@/lib/imageImport';
import { toast } from '@/components/Toaster';

const TOOLS: Array<{ id: Tool; label: string; Icon: typeof Brush; key: string }> = [
  { id: 'brush', label: 'Brush (B)', Icon: Brush, key: 'B' },
  { id: 'eraser', label: 'Eraser (E)', Icon: Eraser, key: 'E' },
  { id: 'fill', label: 'Fill (G)', Icon: PaintBucket, key: 'G' },
  { id: 'eyedropper', label: 'Eyedropper (I)', Icon: Pipette, key: 'I' }
];

export function Toolbar() {
  const { size, setSize, tool, setTool, brushSize, setBrushSize, undo, redo, clear, loadPixelData, pixels: currentPixels } =
    useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUploadClick = () => fileInputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // позволяет повторно выбрать тот же файл
    if (!file) return;
    const prevSnapshot = new Uint8ClampedArray(currentPixels);
    const prevSize = size;
    try {
      const result = await processImageFile(file);
      loadPixelData(result.size, result.pixels);
      const note = result.bgRemoved ? 'background removed' : 'full image';
      toast(`Imported · ${note}`, {
        label: 'Undo',
        onClick: () => loadPixelData(prevSize, pixelsToFlat(prevSnapshot))
      });
    } catch (err) {
      console.error(err);
      toast('Не удалось загрузить картинку');
    }
  };

  return (
    <div className="cs-card px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex items-center gap-2.5">
        <span className="cs-label">Size</span>
        <div className="flex items-center gap-1.5">
          {[16, 32, 64].map((s) => (
            <Tooltip key={s} content={`Canvas ${s}×${s} · resets drawing`}>
              <button
                onClick={() => setSize(s as 16 | 32 | 64)}
                aria-label={`Canvas size ${s} by ${s}`}
                className={cn(
                  'h-10 min-w-[44px] px-3.5 text-[14px] font-semibold leading-none rounded-pill transition-colors border-[1.5px]',
                  size === s
                    ? 'bg-text text-white border-text'
                    : 'bg-transparent border-text/15 text-text hover:border-text'
                )}
              >
                {s}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="w-px h-7 bg-text/10" />

      <div className="flex items-center gap-1.5">
        {TOOLS.map(({ id, label, Icon }) => (
          <Tooltip key={id} content={label}>
            <button
              onClick={() => setTool(id)}
              aria-label={label}
              className={cn(
                'h-11 w-11 inline-flex items-center justify-center rounded-pill transition-colors border-[1.5px]',
                tool === id
                  ? 'bg-text text-white border-text'
                  : 'border-transparent text-text hover:bg-text/5 hover:border-text/15'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="w-px h-7 bg-text/10" />

      <ColorPalette />

      <div className="w-px h-7 bg-text/10" />

      <div className="flex items-center gap-3 min-w-[170px]">
        <span className="cs-label">Brush</span>
        <Slider
          value={[brushSize]}
          min={1}
          max={4}
          step={1}
          onValueChange={(v) => setBrushSize((v[0] ?? 1) as 1 | 2 | 3 | 4)}
        />
        <span className="text-[15px] font-semibold w-4 text-right tabular-nums">{brushSize}</span>
      </div>

      <div className="w-px h-7 bg-text/10" />

      <div className="flex items-center gap-1">
        <Tooltip content="Upload image · auto-cuts plain background">
          <button
            onClick={onUploadClick}
            aria-label="Upload image"
            className="h-11 w-11 inline-flex items-center justify-center rounded-pill text-text hover:bg-text/5 transition-colors"
          >
            <ImagePlus className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
        <div className="w-px h-7 bg-text/10 mx-1" />
        <Tooltip content="Undo · ⌘Z">
          <button onClick={undo} aria-label="Undo" className="h-11 w-11 inline-flex items-center justify-center rounded-pill text-text hover:bg-text/5 transition-colors">
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
        <Tooltip content="Redo · ⌘⇧Z">
          <button onClick={redo} aria-label="Redo" className="h-11 w-11 inline-flex items-center justify-center rounded-pill text-text hover:bg-text/5 transition-colors">
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
        <Tooltip content="Clear">
          <button onClick={clear} aria-label="Clear" className="h-11 w-11 inline-flex items-center justify-center rounded-pill text-text/50 hover:text-text hover:bg-text/5 transition-colors">
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </Tooltip>
      </div>

      {/* ml-auto толкает Gallery в правый край toolbar'а на любой ширине. */}
      <Link href="/gallery" className="ml-auto">
        <Tooltip content="Browse the public gallery">
          <Button variant="default" size="sm" aria-label="Open gallery">
            <GalleryHorizontal className="h-3.5 w-3.5" />
            Gallery
          </Button>
        </Tooltip>
      </Link>
    </div>
  );
}
