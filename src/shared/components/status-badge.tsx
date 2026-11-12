import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  STATUS_BADGE_VARIANTS,
  type StatusBadgeVariant,
} from '@/shared/components/status-badge-variants';

export type { StatusBadgeVariant };

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  label: string;
  /**
   * Replaces the variant's dot, for a state whose meaning is carried by a
   * mark rather than a colour — a lock on a confidential value, say. Purely
   * decorative: `label` still says the same thing in words.
   */
  icon?: LucideIcon;
  /**
   * `false` for a plain tag (theme.md §4.2: "Template", "On-Site",
   * "Calculated", promo text) — a status badge leads with a 7px dot.
   */
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  variant = 'flat',
  label,
  icon: Icon,
  dot = true,
  className,
}: StatusBadgeProps) {
  const v = STATUS_BADGE_VARIANTS[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-xs font-bold whitespace-nowrap',
        v.chip,
        className,
      )}
    >
      {Icon ? (
        <Icon aria-hidden className='size-3.5 shrink-0' />
      ) : (
        dot &&
        v.dot && (
          <span className={cn('size-1.5 shrink-0 rounded-full', v.dot)} />
        )
      )}
      {label}
    </span>
  );
}
