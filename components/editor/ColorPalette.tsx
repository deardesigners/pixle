'use client';
import { useEditor } from '@/lib/store';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PICO8: Array<{ hex: string; name: string }> = [
  { hex: '#000000', name: 'Black' },
  { hex: '#1D2B53', name: 'Dark blue' },
  { hex: '#7E2553', name: 'Dark purple' },
  { hex: '#008751', name: 'Dark green' },
  { hex: '#AB5236', name: 'Brown' },
  { hex: '#5F574F', name: 'Dark grey' },
  { hex: '#C2C3C7', name: 'Light grey' },
  { hex: '#FFF1E8', name: 'Cream' },
  { hex: '#FF004D', name: 'Red' },
  { hex: '#FFA300', name: 'Orange' },
  { hex: '#FFEC27', name: 'Yellow' },
  { hex: '#00E436', name: 'Green' },
  { hex: '#29ADFF', name: 'Blue' },
  { hex: '#83769C', name: 'Indigo' },
  { hex: '#FF77A8', name: 'Pink' },
  { hex: '#FFCCAA', name: 'Peach' }
];

export function ColorPalette() {
  const { color, setColor } = useEditor();
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-8 gap-2.5">
        {PICO8.map((c) => (
          <Tooltip key={c.hex} content={`${c.name} · ${c.hex.toUpperCase()}`}>
            <button
              aria-label={`${c.name} ${c.hex}`}
              className={cn(
                'w-6 h-6 rounded-full transition-transform',
                color.toLowerCase() === c.hex.toLowerCase()
                  ? 'ring-2 ring-text ring-offset-2 ring-offset-white scale-110'
                  : 'hover:scale-110 hover:ring-1 hover:ring-text/30'
              )}
              style={{ background: c.hex }}
              onClick={() => setColor(c.hex)}
            />
          </Tooltip>
        ))}
      </div>
      <Tooltip content="Custom colour · pick any hex">
        <label className="relative w-10 h-10 rounded-full border-[1.5px] border-text/20 overflow-hidden cursor-pointer ml-1 hover:border-text transition-colors">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Custom colour picker"
          />
          <div className="w-full h-full" style={{ background: color }} />
        </label>
      </Tooltip>
    </div>
  );
}
