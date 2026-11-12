type Scalar = string | number | boolean;
export type QueryParamValue = Scalar | readonly Scalar[] | null | undefined;

/**
 * Drops only absent values (`undefined`, `null`, blank strings, empty
 * arrays) from a query. `false` and `0` are real filter values and are
 * always sent. Arrays are sent as repeated keys (`TagIds=3&TagIds=7`,
 * doc §1.6) — see `paramsSerializer` in `http-client.ts`.
 */
export function cleanParams(
  params: Record<string, QueryParamValue> | undefined,
): Record<string, Scalar | Scalar[]> | undefined {
  if (!params) return undefined;
  const out: Record<string, Scalar | Scalar[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const items = value.filter(
        (v) => !(typeof v === 'string' && v.trim() === ''),
      );
      if (items.length) out[key] = items;
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = typeof value === 'string' ? value.trim() : (value as Scalar);
  }
  return out;
}
