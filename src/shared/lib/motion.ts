import { useReducedMotion } from 'motion/react';
import type { Transition } from 'motion/react';

/**
 * Shared motion tokens. Every animation in the app pulls its timing from here
 * so the whole product moves with one voice, and so reduced-motion is honoured
 * in a single place instead of being re-litigated per component with a
 * `motion-reduce:` variant.
 *
 * Note the deliberate exclusion: the dashboard's animation inventory is fixed
 * by `dashboard.md` §Z ("Nothing else moves") and is NOT driven from here —
 * only `omRise`, which that section already specifies, is shared.
 */

/**
 * The project's one entrance curve (a decelerating ease-out). Already the
 * de-facto standard in `count-up` and `motion-reveal` — named here so it stops
 * being copy-pasted as a bare tuple.
 */
export const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Sliding active-indicator spring, shared by `SegmentedTabs`, `FilterPills`
 * and the sidebar nav pill so all three feel like the same control. Slightly
 * over-damped: the pill should arrive and stop, not wobble.
 */
const PILL_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

/** Reduced-motion fallback — the end state, reached immediately. */
const INSTANT: Transition = { duration: 0 };

/**
 * Transition for a `layoutId`-driven active pill. Returns an instant
 * transition under `prefers-reduced-motion`, which is the correct degradation:
 * the pill still marks the active option, it just stops travelling.
 */
export function usePillTransition(): Transition {
  return useReducedMotion() ? INSTANT : PILL_SPRING;
}

/**
 * Per-child delay for a staggered list/row entrance, budgeted so the whole
 * group finishes in about `totalSeconds` no matter how many rows there are —
 * a 50-row table page must not take 50 × 0.03s to appear.
 *
 * Returns `0` under reduced motion, which collapses the stagger into a single
 * simultaneous fade rather than removing the entrance entirely.
 */
export function useStaggerStep(
  count: number,
  totalSeconds = 0.5,
  maxStep = 0.03,
): number {
  const reduced = useReducedMotion();
  if (reduced || count <= 1) return 0;
  return Math.min(maxStep, totalSeconds / count);
}

export { useReducedMotion };
