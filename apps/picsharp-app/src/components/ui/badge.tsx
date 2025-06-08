import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 dark:border-neutral-800 dark:focus:ring-neutral-300',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-neutral-900 text-neutral-50 shadow hover:bg-neutral-900/80 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/80',
        secondary:
          'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80',
        third:
          'border-transparent bg-neutral-200/60 text-neutral-900 dark:bg-neutral-600 dark:text-neutral-50 px-1.5',
        'third-mini':
          'border-transparent bg-neutral-200/60 text-neutral-900 dark:bg-neutral-600 dark:text-neutral-50 py-[1px] px-1',
        destructive:
          'border-transparent bg-red-500 text-neutral-50 shadow hover:bg-red-500/80 dark:bg-red-900 dark:text-neutral-50 dark:hover:bg-red-900/80',
        outline: 'text-neutral-950 dark:text-neutral-50',
        blue: 'border-blue-300 !bg-blue-50 !text-blue-700 dark:border-blue-800 dark:!bg-blue-950 dark:!text-blue-300',
        green:
          'border-green-300 !bg-green-50 !text-green-700 dark:border-green-800 dark:!bg-green-950 dark:!text-green-300',
        cyan: 'border-cyan-300 !bg-cyan-50 !text-cyan-700 dark:border-cyan-800 dark:!bg-cyan-950 dark:!text-cyan-300',
        purple:
          'border-purple-300 !bg-purple-50 !text-purple-700 dark:border-purple-800 dark:!bg-purple-950 dark:!text-purple-300',
        success:
          'border-green-300 !bg-green-50 !text-green-700 dark:border-green-800 dark:!bg-green-950 dark:!text-green-300',
        warning:
          'border-yellow-300 !bg-yellow-50 !text-yellow-700 dark:border-yellow-800 dark:!bg-yellow-950 dark:!text-yellow-300',
        error:
          'border-red-300 !bg-red-50 !text-red-700 dark:border-red-800 dark:!bg-red-950 dark:!text-red-300',
        processing:
          'border-blue-300 !bg-blue-50 !text-blue-700 dark:border-blue-800 dark:!bg-blue-950 dark:!text-blue-300',
        gray: 'border-gray-300 !bg-gray-50 !text-gray-700 dark:border-gray-800 dark:!bg-gray-950 dark:!text-gray-300',
        minor:
          'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-700 dark:text-neutral-200',
        mini: 'border-transparent bg-neutral-900 text-neutral-50 shadow dark:bg-neutral-50 dark:text-neutral-900 py-[1px] px-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
