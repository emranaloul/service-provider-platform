import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot='label'
      className={cn(
        // theme.md §4.6 field label: 12.5px/700 #5b6486.
        'text-text-secondary flex items-center gap-2 text-[12.5px] leading-none font-bold select-none group-data-disabled:pointer-events-none group-data-disabled:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
