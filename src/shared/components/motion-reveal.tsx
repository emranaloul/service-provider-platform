import * as React from 'react';
import { m, type Variants } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import {
  REVEAL_EASE,
  useStaggerStep,
  useReducedMotion,
} from '@/shared/lib/motion';

// Trigger a little before the element is fully on screen, and only once.
const VIEWPORT = { once: true, margin: '0px 0px -60px 0px' };

const itemVariants: Variants = {
  hidden: { opacity: 0, transform: 'translateY(14px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.35, ease: REVEAL_EASE },
  },
};

// Reduced motion keeps the fade but drops the travel and the stagger, so the
// group still reads as "this just arrived" without anything sliding.
const reducedItemVariants: Variants = {
  hidden: { opacity: 0, transform: 'translateY(0px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.2 },
  },
};

// Wrap a group of RevealItem siblings to stagger their entrance animation.
// The stagger step is budgeted by `useStaggerStep` (same mechanism as
// `DataTable`'s row entrance) rather than a fixed value, so a large grid
// (e.g. a stat-tile panel with 20+ tiles) still finishes revealing in about
// half a second instead of stretching out linearly with the item count.
function RevealGroup({
  className,
  style,
  step,
  inView,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Play when scrolled into view (once) instead of on mount. */
  inView?: boolean;
  /** A fixed per-item delay (seconds) for a deliberate card-by-card cascade. */
  step?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const budgeted = useStaggerStep(React.Children.count(children));
  const staggerStep = reduced ? 0 : (step ?? budgeted);
  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: staggerStep,
        delayChildren: reduced ? 0 : 0.03,
      },
    },
  };
  return (
    <m.div
      className={className}
      style={style}
      variants={containerVariants}
      initial='hidden'
      {...(inView
        ? { whileInView: 'show', viewport: VIEWPORT }
        : { animate: 'show' })}
    >
      {children}
    </m.div>
  );
}

function RevealItem({
  className,
  style,
  inView,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Standalone: reveal itself when scrolled into view (once). */
  inView?: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <m.div
      className={cn(className)}
      style={style}
      variants={reduced ? reducedItemVariants : itemVariants}
      {...(inView && {
        initial: 'hidden',
        whileInView: 'show',
        viewport: VIEWPORT,
      })}
    >
      {children}
    </m.div>
  );
}

export { RevealGroup, RevealItem };
