'use client';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

const PICO8 = [
  '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
  '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
];

export function ColorPalette() {
  const { color, setColor } = useEditor();
  return (
    <div className="flex items-center gap-1.5">
      <div className="grid grid-cols-8 gap-[3px]">
        {PICO8.map((c) => (
          <button
            key={c}
            aria-label={c}
            className={cn(
              'w-4 h-4 rounded-sm transition-transform',
              color.toLowerCase() === c.toLowerCase()
                ? 'ring-1 ring-text ring-offset-2 ring-offset-panel scale-110'
                : 'hover:scale-110'
            )}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <label className="relative w-7 h-7 rounded-pill border border-border-strong overflow-hidden cursor-pointer ml-1">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ background: color }} />
      </label>
    </div>
  );
}
