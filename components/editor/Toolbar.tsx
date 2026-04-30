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
    <div
      className={cn(
        'flex flex-wrap gap-3 items-center p-3 bg-panel border border-border rounded-lg',
        'md:rounded-xl'
      )}
    >
      <div className="flex items-center gap-1">
        {[16, 32, 64].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s as 16 | 32 | 64)}
            className={cn(
              'h-8 px-2 rounded text-xs font-mono border border-border',
              size === s ? 'bg-accent text-white border-accent' : 'bg-bg hover:bg-border'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        {TOOLS.map(({ id, label, Icon }) => (
          <Tooltip key={id} content={label}>
            <Button
              size="icon"
              variant={tool === id ? 'default' : 'secondary'}
              onClick={() => setTool(id)}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </Tooltip>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      <ColorPalette />

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-xs text-muted whitespace-nowrap">Brush</span>
        <Slider
          value={[brushSize]}
          min={1}
          max={4}
          step={1}
          onValueChange={(v) => setBrushSize((v[0] ?? 1) as 1 | 2 | 3 | 4)}
        />
        <span className="text-xs text-muted w-4">{brushSize}</span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        <Tooltip content="Undo (⌘Z)">
          <Button size="icon" variant="ghost" onClick={undo} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Redo (⌘⇧Z)">
          <Button size="icon" variant="ghost" onClick={redo} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Clear">
          <Button size="icon" variant="ghost" onClick={clear} aria-label="Clear">
            <Trash2 className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="default"
          size="md"
          onClick={onGenerate}
          disabled={isEmpty || generating}
        >
          {generating ? (
            <>
              <ImagePlus className="h-4 w-4 animate-pulse" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate 3D
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
