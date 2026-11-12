import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * A section card (theme.md §3.2): white, radius 16, padding `22px 24px`,
 * 16px between header and body. Header: title 15.5px/800 navy with a
 * 12.5px #8a93b8 sub-line 3px under it, and actions on the end side.
 *
 * `icon` is accepted for existing callers but not drawn — the theme's
 * section cards carry no icon tile.
 */
export function PageCard({
  title,
  hint,
  actions,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'bg-card shadow-card flex flex-col gap-4 rounded-2xl px-5 py-5 sm:px-6 sm:py-5.5',
        className,
      )}
    >
      <header className='flex flex-wrap items-center justify-between gap-3.5'>
        <div className='flex min-w-0 flex-col gap-0.75'>
          <h2 className='text-foreground text-[15.5px] font-extrabold'>
            {title}
          </h2>
          {hint && (
            <p className='text-muted-foreground text-[12.5px]'>{hint}</p>
          )}
        </div>
        {actions && (
          <div className='flex flex-wrap items-center gap-2'>{actions}</div>
        )}
      </header>
      {children}
    </section>
  );
}
