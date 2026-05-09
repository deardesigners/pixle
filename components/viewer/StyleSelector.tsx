'use client';
import { STYLE_LIST } from '@/lib/styles';
import { useEditor } from '@/lib/store';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Компактный ряд style-чипсов. Живёт внутри editor-card'а сверху, не
 * как отдельная панель — занимает один ряд высотой 32px рядом с метками
 * Editor и Gallery.
 */
export function StyleSelector() {
  const { currentStyle, setStyle } = useEditor();
  return (
    <div className="flex items-center gap-1.5">
      {STYLE_LIST.map((s) => (
        <Tooltip key={s.id} content={s.description}>
          <button
            onClick={() => setStyle(s.id)}
            aria-label={`Style: ${s.label}`}
            aria-pressed={currentStyle === s.id}
            className={cn(
              'h-8 px-3.5 rounded-pill transition-colors text-[12px] font-semibold tracking-tight border-[1.5px] whitespace-nowrap',
              currentStyle === s.id
                ? 'bg-text text-white border-text'
                : 'bg-white/70 backdrop-blur border-text/15 text-text hover:border-text'
            )}
          >
            {s.label}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
