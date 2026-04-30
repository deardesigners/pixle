'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill border transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent text-[13px] font-medium tracking-tight',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg border-accent hover:bg-text hover:border-text',
        secondary: 'bg-transparent border-border-strong text-text hover:bg-text hover:text-bg hover:border-text',
        ghost: 'border-transparent text-text hover:bg-elev',
        outline: 'border-border-strong text-text hover:bg-elev',
        destructive: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white'
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-11 px-5 text-sm',
        icon: 'h-9 w-9 px-0'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'md' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';
