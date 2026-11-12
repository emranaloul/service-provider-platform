import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';
import { cn } from '@/shared/lib/utils';
import { REVEAL_EASE, useReducedMotion } from '@/shared/lib/motion';

// Ticks a numeric value up from 0 on mount — value/format take numbers, not
// strings, so callers own their own thousands-separator/suffix formatting.
//
// Under `prefers-reduced-motion` the final value is rendered immediately: a
// number counting itself up is pure decoration, so the correct degradation is
// to skip the tick entirely rather than shorten it.
function CountUp({
  value,
  duration = 1.1,
  delay = 0,
  format = (n: number) => Math.round(n).toLocaleString('en-US'),
  className,
  as: Tag = 'span',
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
  className?: string;
  as?: 'span' | 'tspan';
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  // Tracks the in-flight value outside of state so a `value` change mid-tween
  // (e.g. a filter change while an earlier count-up is still running)
  // retargets from wherever the animation currently sits instead of
  // restarting from 0 — the same "don't snap back to zero" rule that applies
  // to any interruptible transition.
  const displayRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(displayRef.current, value, {
      duration,
      delay,
      ease: REVEAL_EASE,
      onUpdate: (v) => {
        displayRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, delay, reduced]);

  // `value` is read straight through under reduced motion rather than pushed
  // into state from the effect — a synchronous `setState` in an effect is a
  // cascading render the React Compiler rejects outright.
  return (
    <Tag className={cn('num', className)}>
      {format(reduced ? value : display)}
    </Tag>
  );
}

export { CountUp };
