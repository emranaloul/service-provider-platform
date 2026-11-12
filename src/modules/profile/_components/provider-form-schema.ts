import { z } from 'zod';
import type { TFunction } from 'i18next';
import { LangId, type WeekDay, WEEK_DAYS } from '@/shared/api/enums';
import { dateOnlyKey } from '@/shared/api/payload';
import {
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { splitFlags } from '@/shared/lib/bit-flags';
import { translationFor } from '@/shared/lib/translation';
import type { ServiceProvider } from '@/modules/profile/api/types';
import {
  providerReasonRequired,
  type ProviderFormValues,
} from '@/modules/profile/lib/provider-payload';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Phone and VAT are patterns, not integers: the old client's integer rule
 * rejects `+966…` and leading zeros (doc §18.6).
 */
const PHONE_RE = /^\+?\d{6,15}$/;
const DIGITS_RE = /^\d+$/;
const noSpaces = (v: string) => v.replace(/\s+/g, '');

/** Settings form (doc §6.4, §6.5); `provider` is the record being edited. */
export function providerFormSchema(
  t: TFunction<'profile'>,
  provider: ServiceProvider,
) {
  const required = t('validation.required');
  const text = () => z.string().trim().min(1, required);
  return z
    .object({
      nameEn: text(),
      nameAr: z.string().trim(),
      email: z.string().trim().regex(EMAIL_RE, t('validation.email')),
      phone: z
        .string()
        .transform(noSpaces)
        .pipe(z.string().regex(PHONE_RE, t('validation.phone'))),
      firstName: text(),
      lastName: text(),
      companyName: text(),
      crNumber: text(),
      vatNumber: z
        .string()
        .transform(noSpaces)
        .pipe(
          z
            .string()
            // A-Z §3.4 / §6.5: VAT uses the "integer" rule, which is
            // required. Kept as digits (not a number) so leading zeros stay.
            .min(1, required)
            .refine((v) => DIGITS_RE.test(v), t('validation.vat')),
        ),
      bankDetails: text(),
      categoryId: z.string().min(1, required),
      status: z.boolean(),
      closingDays: z.array(z.string()),
      closingDates: z.array(z.date()),
      reason: z.string().trim(),
      tagIds: z.array(z.string()),
      icon: z.instanceof(File).nullable(),
      attachment: z.instanceof(File).nullable(),
    })
    .superRefine((v, ctx) => {
      const closingDates = v.closingDates.map(toDateOnly);
      if (providerReasonRequired({ closingDates }, provider) && !v.reason) {
        ctx.addIssue({
          code: 'custom',
          path: ['reason'],
          message: t('validation.reason'),
        });
      }
    });
}

export type ProviderFormInput = z.input<ReturnType<typeof providerFormSchema>>;
export type ProviderFormOutput = z.output<
  ReturnType<typeof providerFormSchema>
>;

export function providerFormDefaults(p: ServiceProvider): ProviderFormInput {
  return {
    nameEn: translationFor(p.translations, LangId.En)?.name ?? '',
    nameAr: translationFor(p.translations, LangId.Ar)?.name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    companyName: p.companyName ?? '',
    crNumber: p.crNumber ?? '',
    vatNumber: p.vatNumber ?? '',
    bankDetails: p.bankDetails ?? '',
    categoryId: p.categoryId ? String(p.categoryId) : '',
    status: p.status,
    closingDays: splitFlags(p.closingDay, WEEK_DAYS).map(String),
    closingDates: (p.dates ?? []).map((d) =>
      fromDateOnly(dateOnlyKey(d.closingDate)),
    ),
    reason: '',
    tagIds: (p.tags ?? []).map((tag) => String(tag.tagId)),
    icon: null,
    attachment: null,
  };
}

/** Form output → the API layer's `ProviderFormValues`. */
export function toProviderValues(v: ProviderFormOutput): ProviderFormValues {
  return {
    nameEn: v.nameEn,
    nameAr: v.nameAr,
    email: v.email,
    phone: v.phone,
    firstName: v.firstName,
    lastName: v.lastName,
    companyName: v.companyName,
    crNumber: v.crNumber,
    vatNumber: v.vatNumber,
    bankDetails: v.bankDetails,
    status: v.status,
    categoryId: Number(v.categoryId),
    closingDays: v.closingDays
      .map(Number)
      .filter((d): d is WeekDay => WEEK_DAYS.includes(d as WeekDay)),
    closingDates: v.closingDates.map(toDateOnly),
    reason: v.reason,
    tagIds: v.tagIds.map(Number),
    icon: v.icon,
    attachment: v.attachment,
  };
}
