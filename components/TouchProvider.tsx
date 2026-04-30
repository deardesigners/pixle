'use client';

import { useEffect, type ReactNode } from 'react';

export function TouchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      // Глобально гасим pinch-to-zoom страницы; внутри канваса жесты обрабатываются вручную.
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchstart', prevent, { passive: false });
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      document.removeEventListener('touchstart', prevent);
      document.removeEventListener('touchmove', prevent);
    };
  }, []);
  return <>{children}</>;
}
