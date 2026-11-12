import { z } from 'zod';
import type { TFunction } from 'i18next';
import { LangId } from '@/shared/api/enums';
import type { FormValue } from '@/shared/api/form-data';
import { diffCollection, translationsPayload } from '@/shared/api/payload';
import { translationFor } from '@/shared/lib/translation';
import type { Branch } from '@/modules/branches/api/types';

/** doc §3.4 email rule. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Phone: digits with an optional leading `+` (spaces ignored). The old client
 * accepted integers only, which rejects `+966…` and leading zeros (§18.6).
 */
export const PHONE_RE = /^\+?\d{6,15}$/;

const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));

export function branchFormSchema(t: TFunction<'branches'>) {
  const required = t('validation.required');
  const text = () => z.string().trim().min(1, required);
  return z
    .object({
      nameEn: text(),
      addressEn: text(),
      nameAr: z.string().trim(),
      addressAr: z.string().trim(),
      firstName: text(),
      lastName: text(),
      email: z.string().trim().regex(EMAIL_RE, t('validation.email')),
      phone: z
        .string()
        .transform((v) => v.replace(/\s+/g, ''))
        .pipe(z.string().regex(PHONE_RE, t('validation.phone'))),
      countryId: z.string().min(1, required),
      cityId: z.string().min(1, required),
      latitude: z.string().refine(isNumber, t('validation.number')),
      longitude: z.string().refine(isNumber, t('validation.number')),
      classificationId: z.string().min(1, required),
      /** Only when the branch is not created from inside a provider. */
      serviceProviderId: z.string(),
      tagIds: z.array(z.string()),
      status: z.boolean(),
      logo: z.instanceof(File).nullable(),
    })
    .superRefine((v, ctx) => {
      // Arabic address is required once an Arabic name is given (§8.5).
      if (v.nameAr && !v.addressAr) {
        ctx.addIssue({
          code: 'custom',
          path: ['addressAr'],
          message: required,
        });
      }
      if (!v.serviceProviderId) {
        ctx.addIssue({
          code: 'custom',
          path: ['serviceProviderId'],
          message: t('validation.noProvider'),
        });
      }
    });
}

export type BranchFormInput = z.input<ReturnType<typeof branchFormSchema>>;
export type BranchFormValues = z.output<ReturnType<typeof branchFormSchema>>;

export function branchFormDefaults(
  branch: Branch | undefined,
  serviceProviderId: number | null,
): BranchFormInput {
  const en = translationFor(branch?.translations, LangId.En);
  const ar = translationFor(branch?.translations, LangId.Ar);
  const id = (n: number | null | undefined) => (n ? String(n) : '');
  return {
    nameEn: en?.name ?? '',
    addressEn: en?.address ?? '',
    nameAr: ar?.name ?? '',
    addressAr: ar?.address ?? '',
    firstName: branch?.firstName ?? '',
    lastName: branch?.lastName ?? '',
    email: branch?.email ?? '',
    phone: branch?.phone ?? '',
    countryId: id(branch?.countryId),
    cityId: id(branch?.cityId),
    latitude: branch ? String(branch.latitude) : '',
    longitude: branch ? String(branch.longitude) : '',
    classificationId: id(branch?.serviceProviderClassificationId),
    serviceProviderId: id(branch?.serviceProviderId ?? serviceProviderId),
    tagIds: (branch?.tags ?? []).map((tag) => String(tag.tagId)),
    status: branch?.status ?? true,
    logo: null,
  };
}

/** Create (§8.3) or update (§8.4) body; `branch` set means update. */
export function branchPayload(
  v: BranchFormValues,
  branch?: Branch,
): Record<string, FormValue> {
  const branchId = branch?.id ?? 0;
  const translations = translationsPayload(
    [
      { langId: LangId.En, fields: { name: v.nameEn, address: v.addressEn } },
      { langId: LangId.Ar, fields: { name: v.nameAr, address: v.addressAr } },
    ],
    'name',
    branch
      ? {
          existing: branch.translations ?? [],
          parentKey: 'serviceProviderBranchId',
          parentId: branchId,
        }
      : undefined,
  );

  const tags = diffCollection(
    (branch?.tags ?? []).map((tag) => ({ id: tag.id, key: tag.tagId })),
    v.tagIds.map(Number),
  ).map((d) => ({
    id: d.id,
    serviceProviderBranchId: branchId,
    tagsId: d.key,
    isDeleted: d.isDeleted,
  }));

  return {
    Id: branchId,
    Email: v.email,
    Phone: v.phone,
    FirstName: v.firstName,
    LastName: v.lastName,
    Latitude: Number(v.latitude),
    Longitude: Number(v.longitude),
    CountryId: Number(v.countryId),
    CityId: Number(v.cityId),
    Status: v.status,
    // Sent only when a new file is chosen; leaving it out keeps the old logo.
    Logo: v.logo,
    ServiceProviderId: Number(v.serviceProviderId),
    ServiceProviderClassificationId: Number(v.classificationId),
    Tags: tags,
    Translations: translations,
  };
}
