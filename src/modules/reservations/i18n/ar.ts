import type { en } from './en';

/** Same keys as `en`; extra keys allowed for Arabic plural forms (_zero/_two/_few/_many). */
type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
} & Record<string, unknown>;

export const ar: Shape<typeof en> = {
  subtitle: 'كل الفروع',
  hero: {
    eyebrow: 'العروض المحفوظة',
    title: 'الحجوزات',
    caption: 'حجوزات في هذا العرض',
  },
  views: {
    label: 'طريقة العرض',
    table: 'جدول',
    board: 'لوحة',
    calendar: 'تقويم',
  },
  savedViews: {
    today: 'اليوم',
    upcoming: 'القادمة',
    attention: 'تحتاج متابعة',
    all: 'الكل',
  },
  columns: {
    id: 'الحجز',
    name: 'الاسم',
    branch: 'الفرع',
    service: 'الخدمة',
    date: 'التاريخ',
    status: 'الحالة',
    amount: 'المبلغ',
  },
  next: {
    checkedIn: 'تسجيل وصول',
    inProgress: 'بدء الفحص',
    completed: 'تسجيل النتيجة',
  },
  sar: 'ر.س',
  vatIncl: 'شامل ضريبة 15٪',
};
