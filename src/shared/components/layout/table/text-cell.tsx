import * as React from 'react';

import { cn } from '@/shared/lib/utils';

type TextCellVariant = 'strong' | 'muted' | 'faint';

const VARIANT_CLASS: Record<TextCellVariant, string> = {
  // Navy title text (prototype #1e2364 = --foreground).
  strong: 'text-sm font-bold text-foreground',
  // Secondary body text (prototype #5b6486).
  muted: 'text-[13px] text-text-secondary',
  // De-emphasized text (prototype label #8a93b8 = --muted-foreground).
  faint: 'text-[13px] text-muted-foreground',
};

interface TextCellProps extends React.ComponentProps<'span'> {
  variant?: TextCellVariant;
  /** Tabular-numeric rendering for figures/dates (adds the `num` utility). */
  mono?: boolean;
}

/**
 * Default text cell (guide §4.5 `CustomCell`, non-expanding case). Consolidates
 * the `<span className='text-sm font-bold text-foreground'>` / `text-text-secondary`
 * spans that table columns currently hand-roll.
 */
export function TextCell({
  variant = 'muted',
  mono,
  className,
  ...props
}: TextCellProps) {
  return (
    <span
      className={cn(VARIANT_CLASS[variant], mono && 'num', className)}
      {...props}
    />
  );
}
