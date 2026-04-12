import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-muted text-muted-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
        recibido: 'bg-status-recibido-bg text-status-recibido-text border-status-recibido-border',
        en_proceso: 'bg-status-proceso-bg text-status-proceso-text border-status-proceso-border',
        listo: 'bg-status-listo-bg text-status-listo-text border-status-listo-border',
        entregado: 'bg-status-entregado-bg text-status-entregado-text border-status-entregado-border',
        overdue: 'bg-status-overdue-bg text-status-overdue-text border-status-overdue-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
