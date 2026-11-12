import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Pulse surface card (pulse.css `.pn`): surface ground, hairline border,
 * 24px radius, soft card shadow. The default container for page content.
 */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'bg-surface border-line shadow-card rounded-2xl border',
        className,
      )}
      {...props}
    />
  );
}

/** Title row inside a `Panel`: heading + optional description and actions. */
export function PanelHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-center gap-3 px-5 pt-5 pb-3',
        className,
      )}
    >
      {icon}
      <div className='flex min-w-0 flex-1 flex-col'>
        <h2 className='hd text-h2 font-bold'>{title}</h2>
        {description && <p className='text-small text-ink-2'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
    </header>
  );
}
