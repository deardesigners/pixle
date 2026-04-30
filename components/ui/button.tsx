'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('cs-btn', {
  variants: {
    variant: {
      default: 'cs-btn--accent',
      secondary: '',
      outline: '',
      ghost: 'cs-btn--ghost',
      destructive: ''
    },
    size: {
      sm: 'cs-btn--sm',
      md: '',
      lg: '',
      icon: 'cs-btn--icon'
    }
  },
  defaultVariants: { variant: 'secondary', size: 'md' }
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';
