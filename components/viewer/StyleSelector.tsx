'use client';
import { STYLE_LIST, STYLE_PRESETS } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

export function StyleSelector() {
  const { currentStyle, setStyle, generationStatus } = useEditor();
  const locked = generationStatus === 'pending' || generationStatus === 'polling';
  return (
    <div className="cs-card p-3">
      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
        <span className="cs-label">Style</span>
        <span className="cs-label">{STYLE_PRESETS[currentStyle].label}</span>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
        {STYLE_LIST.map((s) => (
          <button
            key={s.id}
            onClick={() => !locked && setStyle(s.id)}
            disabled={locked}
            className={cn(
              'group flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-2xl border-[1.5px] text-left transition-all',
              currentStyle === s.id
                ? 'border-text bg-accent/40'
                : 'border-transparent hover:bg-text/5 hover:border-text/10',
              locked && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className={cn('shrink-0', styleIndicator(s.id))} />
            <span className="font-display font-semibold text-[13px] tracking-tighter leading-tight text-accent-bold truncate">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function styleIndicator(id: string): string {
  switch (id) {
    case 'voxel': return 'w-3 h-3 bg-accent-bold rounded-[2px]';
    case 'lowpoly': return 'w-3 h-3 border-l-[6px] border-t-[6px] border-accent-bold border-r-[6px] border-r-transparent border-b-[6px] border-b-transparent';
    case 'claymation': return 'w-3 h-3 bg-accent-bold rounded-full';
    case 'toon': return 'w-3 h-3 bg-accent-bold rounded-[2px] border-2 border-accent-bold ring-1 ring-accent-bold/40 ring-offset-2 ring-offset-white';
    case 'holographic': return 'w-3 h-3 bg-gradient-to-br from-accent to-accent-bold rounded-[2px] opacity-70';
    case 'stone': return 'w-3 h-3 bg-gray rounded-[2px]';
    default: return 'w-3 h-3 bg-text rounded-[2px]';
  }
}
