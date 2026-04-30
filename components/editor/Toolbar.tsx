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
    <div className="flex flex-wrap gap-2 items-center px-3 py-2 bg-panel border border-border rounded-2xl">
      <div className="flex items-center gap-1">
        <span className="label pr-1">Size</span>
        {[16, 32, 64].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s as 16 | 32 | 64)}
            className={cn(
              'h-7 px-2.5 mono text-[11px] leading-none rounded-pill border transition-colors',
              size === s
                ? 'bg-text text-bg border-text'
                : 'border-border-strong text-muted hover:text-text hover:bg-elev'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      <div className="flex items-center gap-1">
        {TOOLS.map(({ id, label, Icon }) => (
          <Tooltip key={id} content={label}>
            <button
              onClick={() => setTool(id)}
              aria-label={label}
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-pill border transition-colors',
                tool === id
                  ? 'bg-text text-bg border-text'
                  : 'border-transparent text-text hover:bg-elev'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      <ColorPalette />

      <div className="w-px h-5 bg-border mx-1" />

      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="label">Brush</span>
        <Slider
          value={[brushSize]}
          min={1}
          max={4}
          step={1}
          onValueChange={(v) => setBrushSize((v[0] ?? 1) as 1 | 2 | 3 | 4)}
        />
        <span className="mono text-[11px] text-muted w-3 text-right">{brushSize}</span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      <div className="flex items-center gap-0.5">
        <Tooltip content="Undo · ⌘Z">
          <button onClick={undo} aria-label="Undo" className="h-8 w-8 inline-flex items-center justify-center rounded-pill text-text hover:bg-elev transition-colors">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Redo · ⌘⇧Z">
          <button onClick={redo} aria-label="Redo" className="h-8 w-8 inline-flex items-center justify-center rounded-pill text-text hover:bg-elev transition-colors">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Clear">
          <button onClick={clear} aria-label="Clear" className="h-8 w-8 inline-flex items-center justify-center rounded-pill text-muted hover:text-text hover:bg-elev transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      <div className="ml-auto">
        <Button
          variant="default"
          size="md"
          onClick={onGenerate}
          disabled={isEmpty || generating}
        >
          {generating ? (
            <>
              <span className="flex gap-0.5"><span className="ai-dot" style={{background:'currentColor'}}/><span className="ai-dot" style={{background:'currentColor'}}/><span className="ai-dot" style={{background:'currentColor'}}/></span>
              <span>Rendering</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Render
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
