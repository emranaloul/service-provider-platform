import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

/**
 * Toggle per theme.md §4.10: a 40×22 track (#dde2f1 off, green #2e9e6b on)
 * with a 16px white knob 3px from the edge. `sm` keeps the old compact size.
 */
function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      data-size={size}
      className={cn(
        'peer group/switch focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-success-solid data-unchecked:bg-border dark:data-unchecked:bg-input/80 relative inline-flex shrink-0 items-center rounded-full border border-transparent px-0.5 transition-colors outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:h-5.5 data-[size=default]:w-10 data-[size=sm]:h-3.5 data-[size=sm]:w-6',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className='pointer-events-none block rounded-full bg-white ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-2.5 group-data-[size=default]/switch:data-checked:translate-x-4.5 group-data-[size=sm]/switch:data-checked:translate-x-2.5 data-unchecked:translate-x-0 rtl:group-data-[size=default]/switch:data-checked:-translate-x-4.5 rtl:group-data-[size=sm]/switch:data-checked:-translate-x-2.5'
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
