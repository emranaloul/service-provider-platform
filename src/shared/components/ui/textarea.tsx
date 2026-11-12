import * as React from 'react';

import { cn } from '@/shared/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'border-input placeholder:text-text-tertiary text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-danger-solid aria-invalid:ring-destructive/20 bg-card dark:bg-input/30 text-body field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
