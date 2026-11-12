import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** A titled, bordered group inside an Academy form — the job form's boxed-group look. */
export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border-border-subtle flex flex-col gap-4 rounded-xl border p-4',
        className,
      )}
    >
      {title && (
        // theme.md §1.2 text-label font-bold: 11px/700, .04em, uppercase, #aab1cf.
        <h3 className='text-text-tertiary text-[11px] font-bold tracking-[.04em] uppercase'>
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
