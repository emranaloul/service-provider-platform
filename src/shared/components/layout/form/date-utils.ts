import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Lang } from '@/shared/types/lang';

/** date-fns locale for the active app language (drives the RTL Arabic calendar). */
export function dateFnsLocale(lang: Lang): Locale {
  return lang === 'ar' ? ar : enUS;
}

/**
 * Parse a backend `*Utc` timestamp as UTC even when it arrives without a `Z`/
 * offset suffix (raw `new Date(str)` treats an offset-less ISO string as
 * local time, silently skipping the UTC→local conversion).
 */
export function parseUtcDate(value: string): Date {
  return new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

/** Localized long date, optionally with `HH:mm` time (guide's datetime case). */
export function formatDate(date: Date, lang: Lang, withTime = false): string {
  return format(date, withTime ? 'PPP p' : 'PPP', {
    locale: dateFnsLocale(lang),
  });
}

/** `Date` → `"yyyy-MM-dd"` (no time component) for a date-only backend field. */
export function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Today's `"yyyy-MM-dd"` in the academy's time zone (Riyadh, UTC+3) — the
 * date the API compares run and session dates against, which differs from
 * the browser's date around midnight outside Saudi Arabia.
 */
export function academyToday(): string {
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(
    new Date(),
  );
}

/** `"yyyy-MM-dd"` → local-midnight `Date` (inverse of `toDateOnly`; `new Date(str)` would read it as UTC). */
export function fromDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** `Date` → `"HH:mm"` for an `<input type="time">`. */
export function toTimeValue(date?: Date | null): string {
  if (!date) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Apply a `"HH:mm"` string to a date, keeping the day. Falls back to today when
 * a time is picked before a day (mirrors the guide's datetime behavior).
 */
export function withTimeApplied(
  date: Date | null | undefined,
  time: string,
): Date | null {
  if (!time) return date ?? null;
  const [h, m] = time.split(':').map(Number);
  const base = date ? new Date(date) : new Date();
  base.setHours(h ?? 0, m ?? 0, 0, 0);
  return base;
}
