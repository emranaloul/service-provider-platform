import type * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/utils';

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot='collapsible-trigger'
      {...props}
    />
  );
}

/**
 * Height-animated on open/close. Radix publishes the measured content height
 * as `--radix-collapsible-content-height`, and tw-animate-css's
 * `collapsible-down`/`collapsible-up` keyframes already read it — so this
 * needs no keyframe of our own, only `overflow-hidden` so the content is
 * clipped while the height travels.
 *
 * `motion-reduce:animate-none` snaps to the end state, which is correct here:
 * the height change itself is layout, not decoration, so it must still happen.
 */
function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot='collapsible-content'
      className={cn(
        'data-open:animate-collapsible-down data-closed:animate-collapsible-up overflow-hidden motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
