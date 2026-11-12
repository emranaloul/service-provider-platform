import { useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { REVEAL_EASE, useReducedMotion } from '@/shared/lib/motion';
import { useUiLang } from '@/shared/hooks/use-ui-lang';

/**
 * Wizard step body: on a step change the new content fades in while sliding
 * 16px from the side it is travelling from — forward from the reading-end
 * edge, back from the start (mirrored in RTL). Reduced motion keeps the fade.
 */
export function StepTransition({
  step,
  className,
  children,
}: {
  step: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const rtl = useUiLang() === 'ar';
  // Previous step held in state and updated during render (React's
  // "storing information from previous renders" pattern) — no effect.
  const [prev, setPrev] = useState(step);
  const [forward, setForward] = useState(true);
  if (step !== prev) {
    setForward(step > prev);
    setPrev(step);
  }
  const offset = reduced ? 0 : (forward ? 16 : -16) * (rtl ? -1 : 1);
  return (
    <m.div
      key={step}
      className={className}
      initial={{ opacity: 0, transform: `translateX(${offset}px)` }}
      animate={{ opacity: 1, transform: 'translateX(0px)' }}
      transition={{ duration: reduced ? 0.15 : 0.25, ease: REVEAL_EASE }}
    >
      {children}
    </m.div>
  );
}
