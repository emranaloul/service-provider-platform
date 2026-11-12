import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import { AnimatedValue } from '@/shared/components/animated-value';

export type KpiTone = 'default' | 'green' | 'amber' | 'red' | 'blue';

const VALUE_TONE = {
  default: 'text-foreground',
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-danger',
  blue: 'text-info',
} as const satisfies Record<KpiTone, string>;

const DOT_TONE = {
  default: 'bg-text-tertiary',
  green: 'bg-success-solid',
  amber: 'bg-warning-solid',
  red: 'bg-danger-solid',
  blue: 'bg-info-solid',
} as const satisfies Record<KpiTone, string>;

/**
 * A KPI card (design §1.4): label, big number, and a sub-line with an
 * optional tone dot. Clickable when `onClick` is given (the calendar's
 * status tiles), pressed while `active`.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  hintTone,
  onClick,
  active,
  compact,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  /** Colours the sub-line's dot; no dot when omitted. */
  hintTone?: KpiTone;
  onClick?: () => void;
  active?: boolean;
  /** A smaller value (22px) for dense strips such as Reservation details. */
  compact?: boolean;
  /** First load: skeleton bars in place of the number and sub-line. */
  loading?: boolean;
}) {
  // theme.md §3.3: label 12.5/700 #8a93b8 · value 28/800 lh 1.1 · sub-line
  // 12/600 #5b6486 led by a 7px tone dot; radius 14, padding 18px 20px, gap 8.
  const body = (
    <>
      <span className='text-muted-foreground text-[12.5px] font-bold'>
        {label}
      </span>
      {loading ? (
        <>
          <Skeleton className={cn('my-1 w-14', compact ? 'h-5.5' : 'h-7')} />
          {hint !== undefined && <Skeleton className='h-3 w-32' />}
        </>
      ) : (
        <>
          <span
            className={cn(
              'num leading-[1.1] font-extrabold whitespace-nowrap',
              compact ? 'text-[22px]' : 'text-[28px]',
              VALUE_TONE[tone],
            )}
          >
            <AnimatedValue value={value} />
          </span>
          {hint && (
            <span className='text-text-secondary flex items-center gap-1.5 text-xs font-semibold whitespace-normal'>
              {hintTone && (
                <span
                  aria-hidden
                  className={cn(
                    'size-1.75 shrink-0 rounded-full',
                    DOT_TONE[hintTone],
                  )}
                />
              )}
              {hint}
            </span>
          )}
        </>
      )}
    </>
  );
  const shell =
    'bg-card flex flex-col items-start gap-2 rounded-[14px] px-5 py-4.5 text-start shadow-card';

  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <Button
      type='button'
      variant='ghost'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        shell,
        'hover:bg-card h-auto justify-start border-2',
        active ? 'border-action' : 'border-transparent',
      )}
    >
      {body}
    </Button>
  );
}
