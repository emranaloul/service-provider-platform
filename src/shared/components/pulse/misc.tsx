import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

const ICON_TONE = {
  default: 'bg-sunken text-ink-2',
  accent: 'bg-brand-soft text-brand',
  up: 'bg-up-soft text-up',
  down: 'bg-down-soft text-down',
  warn: 'bg-warn-soft text-warn',
} as const;

/** 36px rounded icon square (pulse.css `.it`), e.g. before a list row. */
export function IconTile({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof ICON_TONE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 flex-none place-items-center rounded-md [&_svg]:size-4.5',
        ICON_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Neutral, non-status tag (pulse.css `.tg`): a branch name, a category. */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-sunken text-ink-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Initials avatar (topbar account button, team rows). */
export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'num bg-brand-soft text-brand grid size-10 place-items-center rounded-full text-[13px] font-semibold',
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Keyboard hint chip (e.g. `Ctrl K` in the search trigger). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      dir='ltr'
      className='num border-line rounded-sm border px-1.5 py-0.5 text-[11px]'
    >
      {children}
    </kbd>
  );
}
