/** Helpers for the backend's bit-flag fields (weekdays, order statuses). */

/** True when `flag` is set in `mask`. */
export const hasFlag = (mask: number, flag: number): boolean =>
  (mask & flag) !== 0;

/** ORs flags into one mask; `[]` → `0`. */
export const combineFlags = (flags: readonly number[]): number =>
  flags.reduce((mask, flag) => mask | flag, 0);

/** The members of `all` that are set in `mask`, in `all`'s order. */
export const splitFlags = <T extends number>(
  mask: number,
  all: readonly T[],
): T[] => all.filter((flag) => hasFlag(mask, flag));
