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

/** Western digits with grouping: `1,284`. */
export const formatNumber = (n: number) => n.toLocaleString('en-US');

/** Whole calendar days from today to `iso` (negative = in the past). */
export function daysFromToday(iso: string, now = new Date()) {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
}
