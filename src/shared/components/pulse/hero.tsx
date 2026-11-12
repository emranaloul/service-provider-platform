import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * The one dark "hero" block per page (pulse.css `.hero` + `.glow`).
 * Holds the page's headline figure and its selectable `HeroTile`s
 * (saved views / KPI tiles). Children inherit the hero palette.
 */
export function Hero({
  className,
  children,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'bg-hero text-hero-ink shadow-hero animate-enter relative isolate overflow-hidden rounded-3xl p-6 sm:p-8',
        className,
      )}
      {...props}
    >
      <div aria-hidden className='hero-glow absolute inset-0 -z-10' />
      {children}
    </section>
  );
}

/** Small violet label above the hero title (pulse.css `.ey`). */
export function HeroEyebrow({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-hero-accent flex items-center gap-2 text-xs font-bold [&_svg]:size-4',
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}

/** Hero title — Kufi, 28px. */
export function HeroTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 className={cn('hd text-display m-0 font-bold', className)} {...props} />
  );
}

/** Big light figure with a caption beside it (e.g. "5 bookings this week"). */
export function HeroFigure({
  value,
  caption,
  className,
}: {
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-2.5', className)}>
      <span className='fig text-figure-lg'>{value}</span>
      {caption && <span className='text-hero-ink-2'>{caption}</span>}
    </div>
  );
}
