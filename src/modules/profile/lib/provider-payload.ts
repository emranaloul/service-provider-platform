import {
  ATTACHMENT_CREATE_FIELD,
  LangId,
  type AttachmentCategory,
  type WeekDay,
} from '@/shared/api/enums';
import type { FormValue } from '@/shared/api/form-data';
import {
  dateOnlyKey,
  diffChanged,
  diffCollection,
  translationsPayload,
} from '@/shared/api/payload';
import { combineFlags } from '@/shared/lib/bit-flags';
import type { ServiceProvider } from '@/modules/profile/api/types';

/** Values of the provider create / edit form (doc §6.3–§6.5). */
export interface ProviderFormValues {
  nameEn: string;
  nameAr: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  companyName: string;
  crNumber: string;
  vatNumber: string;
  bankDetails: string;
  status: boolean;
  categoryId: number;
  /** Recurring weekly closing days. */
  closingDays: WeekDay[];
  /** One-off closing dates, `YYYY-MM-DD`. */
  closingDates: string[];
  /** Required when the closing dates change (§6.5). */
  reason: string;
  tagIds: number[];
  /** New file only; `null` keeps the existing one. */
  icon: File | null;
  attachment: File | null;
  /** Create only: uploaded as provider attachments (§6.5, §7). */
  files?: Partial<Record<AttachmentCategory, File[]>>;
}

const existingDates = (p: ServiceProvider | undefined) =>
  (p?.dates ?? []).map((d) => ({ id: d.id, key: dateOnlyKey(d.closingDate) }));

/**
 * §6.5 Reason: on create, required when any one-off date is set; on update,
 * when the set of dates changed (dates matched on the full day, §18.2).
 */
export function providerReasonRequired(
  v: Pick<ProviderFormValues, 'closingDates'>,
  provider?: ServiceProvider,
): boolean {
  if (!provider) return v.closingDates.length > 0;
  return diffChanged(diffCollection(existingDates(provider), v.closingDates));
}

/** Create (§6.3) or update (§6.4) body; `provider` set means update. */
export function providerPayload(
  v: ProviderFormValues,
  provider?: ServiceProvider,
): Record<string, FormValue> {
  const id = provider?.id ?? 0;
  const tags = diffCollection(
    (provider?.tags ?? []).map((t) => ({ id: t.id, key: t.tagId })),
    v.tagIds,
  ).map((d) =>
    provider
      ? {
          Id: d.id,
          tagsId: d.key,
          serviceProviderId: id,
          isDeleted: d.isDeleted,
        }
      : { id: 0, serviceProviderId: 0, tagsId: d.key, isDeleted: false },
  );

  const dates = diffCollection(existingDates(provider), v.closingDates);
  const scheduleOffs = provider
    ? dates.map((d) => ({
        id: d.id,
        serviceProviderId: id,
        isDeleted: d.isDeleted,
        closingDate: d.key,
      }))
    : dates.map((d) => ({ closingDate: d.key }));

  const files: Record<string, File[]> = {};
  if (!provider) {
    for (const [category, list] of Object.entries(v.files ?? {})) {
      const field =
        ATTACHMENT_CREATE_FIELD[Number(category) as AttachmentCategory];
      if (field && list?.length) files[field] = list;
    }
  }

  return {
    Id: id,
    Email: v.email,
    Phone: v.phone,
    FirstName: v.firstName,
    LastName: v.lastName,
    CrNumber: v.crNumber,
    VatNumber: v.vatNumber,
    BankDetails: v.bankDetails,
    CompanyName: v.companyName,
    Status: v.status,
    ...(provider ? { StatusChanged: v.status !== provider.status } : {}),
    CategoryId: v.categoryId,
    ClosingDay: combineFlags(v.closingDays),
    Icon: v.icon,
    Attachment: v.attachment,
    ...files,
    Tags: tags,
    ScheduleOffs: scheduleOffs,
    Reason: providerReasonRequired(v, provider)
      ? { Reason: v.reason.trim() }
      : undefined,
    Translations: translationsPayload(
      [
        { langId: LangId.En, fields: { Name: v.nameEn } },
        { langId: LangId.Ar, fields: { Name: v.nameAr } },
      ],
      'Name',
      provider
        ? {
            existing: provider.translations ?? [],
            parentKey: 'serviceProviderId',
            parentId: id,
          }
        : undefined,
    ),
  };
}
