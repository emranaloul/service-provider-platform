import type { en } from './en';

/** Same keys as `en`; extra keys allowed for Arabic plural forms (_zero/_two/_few/_many). */
type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
} & Record<string, unknown>;

export const ar: Shape<typeof en> = {
  hero: {
    eyebrow: 'اليوم',
    title: 'صباح الخير، {{name}}',
  },
  kpi: {
    arrivals: 'يصلون اليوم',
    inCenter: 'داخل المركز',
    delayed: 'متأخرة',
    unpaid: 'مطالبات غير مدفوعة',
  },
  arrivals: {
    title: 'يصلون اليوم',
    checkIn: 'تسجيل وصول',
  },
  attention: {
    title: 'تحتاج متابعة',
    unpaidClaims_one: 'مطالبة واحدة غير مدفوعة منذ أكثر من 90 يومًا',
    unpaidClaims_two: 'مطالبتان غير مدفوعتين منذ أكثر من 90 يومًا',
    unpaidClaims_few: '{{count}} مطالبات غير مدفوعة منذ أكثر من 90 يومًا',
    unpaidClaims_many: '{{count}} مطالبة غير مدفوعة منذ أكثر من 90 يومًا',
    unpaidClaims_other: '{{count}} مطالبة غير مدفوعة منذ أكثر من 90 يومًا',
    closingDay: 'يوم الإغلاق غير محدد',
    open: 'فتح',
  },
};
