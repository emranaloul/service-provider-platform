/**
 * Multipart bodies in ASP.NET model-binding notation (doc §1.2).
 *
 * - nested object      → `Reason.Reason`
 * - array of objects   → `Translations[0].langId` (indexes are compacted:
 *                        skipped entries never leave holes)
 * - array of scalars   → the key repeated: `slotTimeIds`, `slotTimeIds`, …
 * - array of files     → the key repeated: `ProposalFiles`, `ProposalFiles`, …
 * - boolean            → `"true"` / `"false"`
 * - `null`/`undefined` → omitted (so optional files keep the server's copy)
 *
 * Dates are not accepted: format them first (`toDateOnly`, ISO string, …) so
 * every call site decides between date-only and UTC timestamp explicitly.
 */
export type FormScalar = string | number | boolean | Blob;
export type FormValue =
  | FormScalar
  | null
  | undefined
  | readonly FormValue[]
  | { readonly [key: string]: FormValue };

const isScalar = (v: FormValue): v is FormScalar =>
  typeof v === 'string' ||
  typeof v === 'number' ||
  typeof v === 'boolean' ||
  v instanceof Blob;

function appendScalar(fd: FormData, key: string, value: FormScalar) {
  if (value instanceof Blob) {
    fd.append(key, value, value instanceof File ? value.name : undefined);
  } else {
    fd.append(key, String(value));
  }
}

function append(fd: FormData, key: string, value: FormValue) {
  if (value === null || value === undefined) return;
  if (isScalar(value)) {
    appendScalar(fd, key, value);
    return;
  }
  if (Array.isArray(value)) {
    let index = 0;
    for (const item of value as readonly FormValue[]) {
      if (item === null || item === undefined) continue;
      if (isScalar(item)) appendScalar(fd, key, item);
      else append(fd, `${key}[${index++}]`, item);
    }
    return;
  }
  for (const [child, v] of Object.entries(value)) {
    append(fd, key ? `${key}.${child}` : child, v);
  }
}

/** Builds a `FormData` body from a (possibly nested) object. */
export function toFormData(values: Record<string, FormValue>): FormData {
  const fd = new FormData();
  append(fd, '', values);
  return fd;
}
