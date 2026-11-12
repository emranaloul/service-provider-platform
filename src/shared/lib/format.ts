import { format } from 'date-fns';
import {
  dateFnsLocale,
  parseUtcDate,
} from '@/shared/components/layout/form/date-utils';
import type { Lang } from '@/shared/types/lang';

const MONTHS: Record<Lang, readonly string[]> = {
  en: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

/**
 * `2 Nov 2026` / `2 نوفمبر 2026`. Western digits and Gregorian dates in both
 * languages (design assumption). `—` for a missing date.
 */
export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  return `${+iso.slice(8, 10)} ${MONTHS[lang][+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
}

/** `2 Nov` without the year. */
export function formatDayMonth(iso: string, lang: Lang): string {
  return `${+iso.slice(8, 10)} ${MONTHS[lang][+iso.slice(5, 7) - 1]}`;
}

/**
 * A UTC timestamp from the API in the viewer's local time (doc §3.3):
 * `12 Nov 2026 · 09:30`. `—` when missing.
 */
export function formatLocalDateTime(
  iso: string | null | undefined,
  lang: Lang,
  withTime = true,
): string {
  if (!iso) return '—';
  const date = parseUtcDate(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, withTime ? 'd MMM yyyy · HH:mm' : 'd MMM yyyy', {
    locale: dateFnsLocale(lang),
  });
}

/** Money with two decimals and Western digits: `1,284.50`. */
export const formatMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Joins words with the list comma of the UI language (`، ` or `, `). */
export const joinList = (
  items: readonly (string | null | undefined)[],
  lang: Lang,
) => items.filter(Boolean).join(lang === 'ar' ? '، ' : ', ');

/** Western digits with grouping: `1,284`. */
export const formatNumber = (n: number) => n.toLocaleString('en-US');

/** Whole calendar days from today to `iso` (negative = in the past). */
export function daysFromToday(iso: string, now = new Date()) {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
}
