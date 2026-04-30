'use client';
import { STYLE_LIST } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

export function StyleSelector() {
  const { currentStyle, setStyle, generationStatus } = useEditor();
  const locked = generationStatus === 'pending' || generationStatus === 'polling';
  return (
    <div className="bg-panel border border-border rounded-2xl p-2">
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="label">Style</span>
        <span className="label">{currentStyle}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
        {STYLE_LIST.map((s) => (
          <button
            key={s.id}
            onClick={() => !locked && setStyle(s.id)}
            disabled={locked}
            className={cn(
              'group flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-colors',
              currentStyle === s.id
                ? 'border-accent bg-accent/5'
                : 'border-transparent hover:bg-elev',
              locked && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="text-base leading-none opacity-80">{s.emoji}</span>
            <span className="font-display font-medium text-[13px] tracking-tight leading-none">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
