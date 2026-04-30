'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

type Toast = { id: number; text: string; action?: { label: string; onClick: () => void } };

type ToastStore = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: number) => void;
};

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: Date.now() + Math.random() }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

export function toast(text: string, action?: Toast['action']): void {
  useToastStore.getState().push({ text, action });
}

export function Toaster() {
  const { toasts, remove } = useToastStore();

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto bg-panel border border-border px-4 py-3 rounded-lg shadow-xl',
            'flex items-center gap-3 min-w-[240px] max-w-[360px]'
          )}
        >
          <span className="text-sm flex-1">{t.text}</span>
          {t.action && (
            <button
              className="text-accent text-xs font-semibold hover:underline"
              onClick={() => {
                t.action?.onClick();
                remove(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
