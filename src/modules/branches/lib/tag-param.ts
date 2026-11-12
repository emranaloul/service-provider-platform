/**
 * The branch list's tag filter lives in the URL as `?tags=3,7` (doc §8.1
 * `TagIds`, sent repeated). These helpers read and write that param.
 */

/** Positive integer ids from a comma-separated `tags` param, deduped, in order. */
export function parseTagParam(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids: number[] = [];
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (id > 0 && Number.isSafeInteger(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** The `tags` param for these ids, or `null` (removes the param) when none. */
export function formatTagParam(ids: readonly number[]): string | null {
  return ids.length > 0 ? ids.join(',') : null;
}

/** Adds or removes one id, keeping the order of the rest. */
export function toggleTagId(
  ids: readonly number[],
  id: number,
  checked: boolean,
): number[] {
  if (!checked) return ids.filter((x) => x !== id);
  return ids.includes(id) ? [...ids] : [...ids, id];
}
