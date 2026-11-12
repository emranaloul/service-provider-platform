export type QueryParamValue = string | number | boolean | null | undefined;

/**
 * Drops only absent values (`undefined`, `null`, blank strings) from a query.
 * `false` and `0` are real filter values and are always sent.
 */
export function cleanParams(
  params: Record<string, QueryParamValue> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}
