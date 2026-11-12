import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * An empty card with an icon, a title, a hint and an optional action — the
 * Schedules list's "no schedules yet" / "no match", a run with no
 * reservations.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    // theme.md §4.16: icon 24px, title 15/800 navy, text 13 #8a93b8, gap 8,
    // padding 36px 20px.
    <div
      className={cn(
        'flex flex-col items-center gap-2 px-5 py-9 text-center',
        className,
      )}
    >
      <Icon aria-hidden className='text-muted-foreground size-6' />
      <p className='text-foreground text-[15px] font-extrabold'>{title}</p>
      {hint && <p className='text-muted-foreground text-[13px]'>{hint}</p>}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
}
