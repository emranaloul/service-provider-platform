import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

/** "Open …" link in a panel header. */
export function PanelLink({ to, children }: { to: string; children: string }) {
  return (
    <Button asChild size='sm' variant='ghost'>
      <Link to={to}>
        {children}
        <ArrowRight aria-hidden className='rtl-mirror' />
      </Link>
    </Button>
  );
}

/** Quiet empty state inside a panel: a section the API left out or zero rows. */
export function PanelEmpty({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <div className='text-ink-3 flex items-center gap-3 px-5 pt-2 pb-6'>
      <Icon aria-hidden className='size-4.5 flex-none' />
      <p className='text-small'>{children}</p>
    </div>
  );
}

/** Label / figure row of a stats list. */
export function StatRow({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line flex items-center justify-between gap-4 border-t py-3',
        className,
      )}
    >
      <dt className='text-ink-2'>{label}</dt>
      <dd className='num text-ink flex items-baseline gap-1.5 font-bold'>
        {value}
        {hint && <span className='text-ink-3 text-xs font-normal'>{hint}</span>}
      </dd>
    </div>
  );
}

/** A panel while its first load is in flight: header line + stat rows. */
export function PanelSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'bg-surface border-line shadow-card flex flex-col rounded-2xl border',
        className,
      )}
    >
      <div className='flex items-center gap-3 px-5 pt-5 pb-3'>
        <Skeleton className='size-9 rounded-md' />
        <div className='flex flex-1 flex-col gap-2'>
          <Skeleton className='h-4 w-36' />
          <Skeleton className='h-3 w-52 max-w-full' />
        </div>
      </div>
      <div className='flex flex-col px-5 pb-4'>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className='border-line flex items-center justify-between gap-4 border-t py-3.5'
          >
            <Skeleton className={cn('h-3', i % 2 ? 'w-1/3' : 'w-2/5')} />
            <Skeleton className='h-3.5 w-20' />
          </div>
        ))}
      </div>
    </div>
  );
}
