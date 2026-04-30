'use client';
import { useEditor } from '@/lib/store';
import { cn } from '@/lib/utils';

export function PressurePanel() {
  const {
    pressureMap,
    togglePressureChannel,
    pressureEnabled,
    setPressureEnabled,
    pressureDetected,
    livePressure
  } = useEditor();

  if (!pressureDetected && !pressureEnabled) return null;

  return (
    <div className="cs-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="cs-label">Pressure</span>
        <button
          onClick={() => setPressureEnabled(!pressureEnabled)}
          className={cn(
            'h-7 px-4 rounded-pill text-[11px] font-bold uppercase tracking-wider transition-all',
            pressureEnabled
              ? 'bg-accent text-accent-bold'
              : 'bg-text/5 text-text/50 hover:bg-text/10'
          )}
        >
          {pressureEnabled ? 'On' : 'Off'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(['size', 'alpha', 'jitter'] as const).map((k) => (
          <button
            key={k}
            onClick={() => togglePressureChannel(k)}
            disabled={!pressureEnabled}
            className={cn(
              'h-8 px-3.5 rounded-pill border-[1.5px] text-[13px] font-semibold tracking-tight transition-colors disabled:opacity-30',
              pressureMap[k]
                ? 'bg-text text-white border-text'
                : 'bg-transparent border-text/15 text-text hover:border-text'
            )}
          >
            {k === 'alpha' ? 'Opacity' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="cs-label">Live</span>
          <span className="text-[12px] font-semibold tabular-nums">{livePressure.toFixed(2)}</span>
        </div>
        <div className="h-1 bg-text/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-75"
            style={{ width: `${Math.round(livePressure * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
