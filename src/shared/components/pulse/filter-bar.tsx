import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Pulse filter bar (pulse.css `.fb`): a horizontally scrolling pill track.
 * Starts with an ink "Filters" lead, then `FilterChip`s.
 */
export function FilterBar({
  label,
  leadLabel,
  children,
  className,
}: {
  /** Accessible name of the group. */
  label: string;
  /** Text of the ink lead chip; omit to hide it. */
  leadLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role='group'
      aria-label={label}
      className={cn(
        'bg-surface border-line flex max-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto rounded-full border p-1',
        className,
      )}
    >
      {leadLabel && (
        <span className='bg-ink text-surface inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold whitespace-nowrap'>
          <SlidersHorizontal aria-hidden className='size-3.5' />
          {leadLabel}
        </span>
      )}
      {children}
    </div>
  );
}

/** One chip in a `FilterBar`; `active` = filter applied (violet soft). */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    // Raw button on purpose: chips are styled by the track.
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold whitespace-nowrap transition-colors',
        active ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
