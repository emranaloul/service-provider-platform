/**
 * The Today page's branch filter lives in the URL as `?branches=3,7`
 * (A-Z §29: `ServiceProviderBranchIds`, sent only when the user filters by
 * branch). Ids are kept sorted so the same choice is always the same URL and
 * the same query key.
 */

const cleanIds = (ids: Iterable<number>): number[] =>
  [
    ...new Set([...ids].filter((id) => Number.isSafeInteger(id) && id > 0)),
  ].sort((a, b) => a - b);

/** Positive integer ids from a comma-separated `branches` param, deduped and sorted. */
export function parseBranchParam(value: string | null | undefined): number[] {
  if (!value) return [];
  return cleanIds(
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => /^\d+$/.test(part))
      .map(Number),
  );
}

/** The `branches` param for these ids, or `null` (removes the param) when none. */
export function formatBranchParam(ids: readonly number[]): string | null {
  const clean = cleanIds(ids);
  return clean.length > 0 ? clean.join(',') : null;
}

/** Adds or removes one id. */
export function toggleBranchId(
  ids: readonly number[],
  id: number,
  checked: boolean,
): number[] {
  return cleanIds(checked ? [...ids, id] : ids.filter((x) => x !== id));
}
