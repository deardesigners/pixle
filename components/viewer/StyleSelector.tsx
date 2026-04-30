'use client';
import { STYLE_LIST } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

export function StyleSelector() {
  const { currentStyle, setStyle, generationStatus } = useEditor();
  const locked = generationStatus === 'pending' || generationStatus === 'polling';
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-panel border border-border rounded-lg">
      {STYLE_LIST.map((s) => (
        <button
          key={s.id}
          onClick={() => !locked && setStyle(s.id)}
          disabled={locked}
          className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-md text-xs border',
            currentStyle === s.id
              ? 'bg-accent/20 border-accent text-white'
              : 'border-border bg-bg hover:bg-border',
            locked && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-2xl">{s.emoji}</span>
          <span className="font-medium">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
