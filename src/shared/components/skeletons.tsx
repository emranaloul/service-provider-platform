import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

/*
 * Loading placeholders shaped like the content they stand in for. They sit in
 * the normal flow (not an overlay) and are hidden from assistive tech; the
 * container that owns them marks itself `aria-busy`.
 */

const LINE_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-1/3'] as const;

/** A stack (or grid) of card-shaped rows: pickers, lesson rows, room cards. */
export function CardListSkeleton({
  count = 3,
  itemClassName,
  className,
  avatar = false,
}: {
  count?: number;
  /** Height/shape of each card, e.g. `h-16`. */
  itemClassName?: string;
  /** Layout of the list, e.g. a grid (defaults to a vertical stack). */
  className?: string;
  /** Leading circle, for rows that start with an avatar. */
  avatar?: boolean;
}) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            'border-border-subtle flex h-16 items-center gap-3 rounded-xl border px-4',
            itemClassName,
          )}
        >
          {avatar && <Skeleton className='size-8 shrink-0 rounded-full' />}
          <div className='flex min-w-0 flex-1 flex-col gap-2'>
            <Skeleton
              className={cn('h-3.5', LINE_WIDTHS[i % LINE_WIDTHS.length])}
            />
            <Skeleton
              className={cn('h-2.5', LINE_WIDTHS[(i + 2) % LINE_WIDTHS.length])}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Label/value lines: a totals card, a short meter list. */
export function LinesSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-3.5', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='flex items-center justify-between gap-4'>
          <Skeleton
            className={cn('h-3', LINE_WIDTHS[i % LINE_WIDTHS.length])}
          />
          <Skeleton className='h-3 w-16' />
        </div>
      ))}
    </div>
  );
}

/** Vertical bars of a small chart. */
export function BarsSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const heights = [
    'h-14',
    'h-20',
    'h-10',
    'h-24',
    'h-16',
    'h-28',
    'h-12',
    'h-20',
  ];
  return (
    <div aria-hidden className={cn('flex h-36 items-end gap-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('flex-1 rounded-t-lg', heights[i % heights.length])}
        />
      ))}
    </div>
  );
}

/** A grid of seat-sized blocks. */
export function SeatsSkeleton({
  rows = 4,
  perRow = 5,
  className,
}: {
  rows?: number;
  perRow?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn('flex flex-col items-center gap-2.5', className)}
    >
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className='flex gap-3'>
          {Array.from({ length: perRow }, (_, s) => (
            <Skeleton
              key={s}
              className='h-18 w-21 rounded-t-2xl rounded-b-[10px]'
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A month-style grid of day cells. */
export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      <div className='grid grid-cols-7 gap-2'>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className='h-3 w-2/3' />
        ))}
      </div>
      <div className='grid grid-cols-7 gap-2'>
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className='h-20 rounded-lg' />
        ))}
      </div>
    </div>
  );
}

/** A card with a title line and a few content lines. */
function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card shadow-card flex flex-col gap-4 rounded-2xl px-5.5 py-5',
        className,
      )}
    >
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-3 w-64 max-w-full' />
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', LINE_WIDTHS[i % LINE_WIDTHS.length])}
        />
      ))}
    </div>
  );
}

/**
 * A whole details screen: header, a row of figure tiles, then a wide main
 * column beside a narrower side column.
 */
export function PageSkeleton({
  tiles = 4,
  side = true,
  className,
}: {
  tiles?: number;
  /** Draw the narrower side column. */
  side?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-4.5', className)}>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-6 w-72 max-w-full' />
        <Skeleton className='h-3.5 w-96 max-w-full' />
      </div>
      {tiles > 0 && (
        <div className='grid grid-cols-2 gap-4.5 lg:grid-cols-4'>
          {Array.from({ length: tiles }, (_, i) => (
            <div
              key={i}
              className='bg-card shadow-card flex flex-col gap-3 rounded-2xl px-5 py-4.5'
            >
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-6 w-16' />
            </div>
          ))}
        </div>
      )}
      <div
        className={cn(
          'grid grid-cols-1 items-start gap-4.5',
          side && 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]',
        )}
      >
        <div className='flex flex-col gap-4.5'>
          <CardSkeleton lines={5} />
          <CardSkeleton lines={3} />
        </div>
        {side && <CardSkeleton lines={6} />}
      </div>
    </div>
  );
}

/** A full-page form: stacked cards of two-column field pairs. */
export function FormSkeleton({
  sections = 3,
  className,
}: {
  sections?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-4.5', className)}>
      {Array.from({ length: sections }, (_, s) => (
        <div
          key={s}
          className='bg-card shadow-card flex flex-col gap-4.5 rounded-2xl px-5.5 py-5'
        >
          <div className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-36' />
            <Skeleton className='h-3 w-60 max-w-full' />
          </div>
          <div className='grid grid-cols-1 gap-x-6 gap-y-4.5 md:grid-cols-2'>
            {Array.from({ length: 4 }, (_, f) => (
              <div key={f} className='flex flex-col gap-2'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-11 w-full rounded-[10px]' />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Label + input pairs, for a dialog form waiting on its record. */
export function FieldsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-4.5 py-2', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='flex flex-col gap-2'>
          <Skeleton className='h-3 w-28' />
          <Skeleton className='h-11 w-full rounded-[10px]' />
        </div>
      ))}
    </div>
  );
}
