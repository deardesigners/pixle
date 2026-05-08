'use client';
import { STYLE_LIST, STYLE_PRESETS } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STYLE_HINTS: Record<string, string> = {
  voxel: 'Cubic Minecraft-style blocks',
  lowpoly: 'Faceted, flat-shaded low polygon',
  claymation: 'Soft plasticine sculpture',
  toon: 'Cel-shaded with bold outlines',
  holographic: 'Translucent iridescent emissive',
  stone: 'Weathered granite statue',
  plush: 'Soft rounded plush surface',
  crystal: 'Translucent faceted crystal',
  neon: 'Glowing neon emissive',
  origami: 'Folded paper, low-poly facets',
  mercury: 'Liquid metal, polished'
};

export function StyleSelector() {
  const { currentStyle, setStyle } = useEditor();
  const locked = false;
  return (
    <div className="cs-card p-6">
      <div className="flex items-center justify-between px-2 pb-4">
        <span className="cs-label">Style</span>
        <span className="cs-label">{STYLE_PRESETS[currentStyle].label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STYLE_LIST.map((s) => (
          <Tooltip key={s.id} content={STYLE_HINTS[s.id] ?? s.description}>
            <button
              onClick={() => !locked && setStyle(s.id)}
              disabled={locked}
              aria-label={`Style: ${s.label}`}
              className={cn(
                'h-12 px-4 rounded-pill transition-all flex items-center justify-center',
                currentStyle === s.id
                  ? 'bg-accent ring-2 ring-text ring-inset'
                  : 'bg-transparent ring-[1.5px] ring-inset ring-text/12 hover:ring-text/40',
                locked && 'opacity-40 cursor-not-allowed'
              )}
            >
              <span className="font-display font-semibold text-[15px] tracking-tighter text-accent-bold whitespace-nowrap">
                {s.label}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
