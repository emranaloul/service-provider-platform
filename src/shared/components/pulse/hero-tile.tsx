import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export type HeroTileTone =
  'default' | 'accent' | 'up' | 'down' | 'warn' | 'muted';

const VALUE_TONE = {
  default: '',
  accent: 'text-hero-accent',
  up: 'text-hero-up',
  down: 'text-hero-down',
  warn: 'text-hero-warn',
  muted: 'text-hero-ink-2',
} as const satisfies Record<HeroTileTone, string>;

/**
 * KPI / saved-view tile that lives inside a `Hero` (pulse.css `.ht`).
 * Pass `onClick` to make it a selectable view (the Reservations saved views);
 * `active` fills it violet. Without `onClick` it is a static stat.
 */
export function HeroTile({
  label,
  value,
  caption,
  tone = 'default',
  active,
  onClick,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  tone?: HeroTileTone;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const shell = cn(
    'flex min-w-30 flex-col gap-2 rounded-2xl px-4.5 py-4 text-start transition-colors duration-200',
    active
      ? 'bg-hero-accent text-hero'
      : 'bg-hero-raised/65 text-hero-ink shadow-[inset_0_0_0_1px_var(--ov-hero-line)]',
    className,
  );
  const sub = cn('text-[12.5px]', active ? 'text-hero' : 'text-hero-ink-2');
  const body = (
    <>
      <span className={cn(sub, 'font-bold')}>{label}</span>
      <span className={cn('fig text-figure', !active && VALUE_TONE[tone])}>
        {value}
      </span>
      {caption && <span className={sub}>{caption}</span>}
    </>
  );
  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    // Raw button on purpose: a multi-line tile is not a shadcn Button shape.
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(shell, 'cursor-pointer')}
    >
      {body}
    </button>
  );
}
