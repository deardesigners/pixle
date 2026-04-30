'use client';

import {
  Brush,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  ImagePlus
} from 'lucide-react';
import { useEditor, type Tool } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip } from '@/components/ui/tooltip';
import { ColorPalette } from './ColorPalette';
import { cn } from '@/lib/utils';

const TOOLS: Array<{ id: Tool; label: string; Icon: typeof Brush; key: string }> = [
  { id: 'brush', label: 'Brush (B)', Icon: Brush, key: 'B' },
  { id: 'eraser', label: 'Eraser (E)', Icon: Eraser, key: 'E' },
  { id: 'fill', label: 'Fill (G)', Icon: PaintBucket, key: 'G' },
  { id: 'eyedropper', label: 'Eyedropper (I)', Icon: Pipette, key: 'I' }
];

export function Toolbar({ onGenerate }: { onGenerate: () => void }) {
  const {
    size,
    setSize,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    undo,
    redo,
    clear,
    pixels,
    generationStatus
  } = useEditor();

  const isEmpty = pixels.every((v, i) => (i % 4 === 3 ? v === 0 : true));
  const generating = generationStatus === 'pending' || generationStatus === 'polling';

  return (
    <div className="flex flex-wrap gap-3 items-center px-5 py-4 cs-card">
      <div className="flex items-center gap-1.5">
        <span className="cs-label pr-1">Size</span>
        {[16, 32, 64].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s as 16 | 32 | 64)}
            className={cn(
              'h-8 px-3 text-[13px] font-semibold leading-none rounded-pill transition-colors border-[1.5px]',
              size === s
                ? 'bg-text text-white border-text'
                : 'bg-transparent border-text/15 text-text hover:border-text'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-text/10 mx-1" />

      <div className="flex items-center gap-1">
        {TOOLS.map(({ id, label, Icon }) => (
          <Tooltip key={id} content={label}>
            <button
              onClick={() => setTool(id)}
              aria-label={label}
              className={cn(
                'h-9 w-9 inline-flex items-center justify-center rounded-pill transition-colors border-[1.5px]',
                tool === id
                  ? 'bg-text text-white border-text'
                  : 'border-transparent text-text hover:bg-text/5'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="w-px h-6 bg-text/10 mx-1" />

      <ColorPalette />

      <div className="w-px h-6 bg-text/10 mx-1" />

      <div className="flex items-center gap-2.5 min-w-[140px]">
        <span className="cs-label">Brush</span>
        <Slider
          value={[brushSize]}
          min={1}
          max={4}
          step={1}
          onValueChange={(v) => setBrushSize((v[0] ?? 1) as 1 | 2 | 3 | 4)}
        />
        <span className="text-[13px] font-semibold w-3 text-right">{brushSize}</span>
      </div>

      <div className="w-px h-6 bg-text/10 mx-1" />

      <div className="flex items-center gap-0.5">
        <Tooltip content="Undo · ⌘Z">
          <button onClick={undo} aria-label="Undo" className="h-9 w-9 inline-flex items-center justify-center rounded-pill text-text hover:bg-text/5 transition-colors">
            <Undo2 className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Redo · ⌘⇧Z">
          <button onClick={redo} aria-label="Redo" className="h-9 w-9 inline-flex items-center justify-center rounded-pill text-text hover:bg-text/5 transition-colors">
            <Redo2 className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Clear">
          <button onClick={clear} aria-label="Clear" className="h-9 w-9 inline-flex items-center justify-center rounded-pill text-text/50 hover:text-text hover:bg-text/5 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="ml-auto">
        <Button
          variant="default"
          onClick={onGenerate}
          disabled={isEmpty || generating}
        >
          {generating ? (
            <>
              <span className="flex gap-1"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /></span>
              <span>Rendering</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Render
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
