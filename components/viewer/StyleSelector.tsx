'use client';
import { STYLE_LIST, STYLE_PRESETS } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

export function StyleSelector() {
  const { currentStyle, setStyle, generationStatus } = useEditor();
  const locked = generationStatus === 'pending' || generationStatus === 'polling';
  return (
    <div className="cs-card p-5">
      <div className="flex items-center justify-between px-2 pb-3.5">
        <span className="cs-label">Style</span>
        <span className="cs-label">{STYLE_PRESETS[currentStyle].label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STYLE_LIST.map((s) => (
          <button
            key={s.id}
            onClick={() => !locked && setStyle(s.id)}
            disabled={locked}
            className={cn(
              'h-12 px-4 rounded-pill border-[1.5px] transition-all flex items-center justify-center',
              currentStyle === s.id
                ? 'border-text bg-accent text-accent-bold'
                : 'border-text/15 hover:border-text/40',
              locked && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="font-display font-semibold text-[15px] tracking-tighter text-accent-bold whitespace-nowrap">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
