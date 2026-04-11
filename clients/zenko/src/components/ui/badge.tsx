import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-muted text-muted-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
        recibido: 'bg-amber-50 text-amber-800 border-amber-200',
        en_proceso: 'bg-blue-50 text-blue-800 border-blue-200',
        listo: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        entregado: 'bg-gray-100 text-gray-600 border-gray-200',
        overdue: 'bg-red-50 text-red-700 border-red-200',
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
