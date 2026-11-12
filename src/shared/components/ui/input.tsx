import * as React from 'react';

import { cn } from '@/shared/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        // MARHAB .inp: 40px, 1px strong border, radius 8, 15px regular.
        'border-input file:text-foreground placeholder:text-text-tertiary text-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-muted aria-invalid:border-danger-solid aria-invalid:ring-destructive/20 bg-card dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 text-body h-10 w-full min-w-0 rounded-md border px-3 py-1.5 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:font-normal focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
