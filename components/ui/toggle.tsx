'use client';
import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cn } from '@/lib/utils';

export const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({ className, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium border border-border bg-panel hover:bg-border transition-colors',
      'data-[state=on]:bg-accent data-[state=on]:border-accent data-[state=on]:text-white',
      className
    )}
    {...props}
  />
));
Toggle.displayName = 'Toggle';
