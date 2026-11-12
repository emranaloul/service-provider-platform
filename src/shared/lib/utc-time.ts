/**
 * Slot times are stored as UTC time-of-day (`TimeSpan`); the UI edits local
 * `HH:mm` (doc §3.3). Conversions use the offset of `ref` (default: today).
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** `"05:00:00"` / `"5:00"` → `"05:00"`. Empty input stays empty. */
export function normalizeTime(value: string | null | undefined): string {
  if (!value) return '';
  const [h = '0', m = '0'] = value.split(':');
  return `${pad(Number(h))}:${pad(Number(m))}`;
}

/** Local `"HH:mm"` → UTC `"HH:mm"`. */
export function localTimeToUtc(local: string, ref: Date = new Date()): string {
  const [h, m] = normalizeTime(local).split(':').map(Number);
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), h, m);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** UTC `"HH:mm[:ss]"` → local `"HH:mm"`. */
export function utcTimeToLocal(utc: string, ref: Date = new Date()): string {
  const [h, m] = normalizeTime(utc).split(':').map(Number);
  const d = new Date(
    Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate(), h, m),
  );
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
