'use client';
import { useEditor } from '@/lib/store';
import { Toggle } from '@/components/ui/toggle';

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
    <div className="bg-panel border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Pressure</span>
        <Toggle pressed={pressureEnabled} onPressedChange={setPressureEnabled}>
          {pressureEnabled ? 'On' : 'Off'}
        </Toggle>
      </div>
      <div className="flex flex-wrap gap-2">
        <Toggle
          pressed={pressureMap.size}
          onPressedChange={() => togglePressureChannel('size')}
          disabled={!pressureEnabled}
        >
          Size
        </Toggle>
        <Toggle
          pressed={pressureMap.alpha}
          onPressedChange={() => togglePressureChannel('alpha')}
          disabled={!pressureEnabled}
        >
          Opacity
        </Toggle>
        <Toggle
          pressed={pressureMap.jitter}
          onPressedChange={() => togglePressureChannel('jitter')}
          disabled={!pressureEnabled}
        >
          Jitter
        </Toggle>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>Live pressure</span>
          <span>{livePressure.toFixed(2)}</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent2 transition-[width] duration-75"
            style={{ width: `${Math.round(livePressure * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
