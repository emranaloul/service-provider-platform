import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Page heading block (App.dc.html dashboard header): optional maroon kicker
 * with the diamond mark, an h1, a muted summary, and actions on the end side.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4',
        className,
      )}
    >
      <div className='flex min-w-0 flex-col gap-0.5'>
        {kicker && (
          <span className='text-small text-maroon flex items-center gap-2 font-semibold'>
            <span aria-hidden className='bg-maroon size-1.75 rotate-45' />
            {kicker}
          </span>
        )}
        <h1 className='text-h1 font-semibold [html[lang=ar]_&]:leading-9'>
          {title}
        </h1>
        {description && <p className='text-ink-muted'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
    </div>
  );
}
