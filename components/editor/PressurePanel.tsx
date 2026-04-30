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
    <div className="bg-panel border border-border rounded-2xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label">Pressure</span>
        <button
          onClick={() => setPressureEnabled(!pressureEnabled)}
          className={cn(
            'h-6 px-3 rounded-pill border text-[11px] mono uppercase tracking-widest transition-colors',
            pressureEnabled
              ? 'bg-accent text-accent-fg border-accent'
              : 'border-border-strong text-muted hover:text-text'
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
              'h-7 px-3 rounded-pill border text-[12px] tracking-tight transition-colors disabled:opacity-30',
              pressureMap[k]
                ? 'bg-text text-bg border-text'
                : 'border-border-strong text-text hover:bg-elev'
            )}
          >
            {k === 'alpha' ? 'Opacity' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="label">Live</span>
          <span className="mono text-[10px] text-muted">{livePressure.toFixed(2)}</span>
        </div>
        <div className="h-px bg-border-strong overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-75"
            style={{ width: `${Math.round(livePressure * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
