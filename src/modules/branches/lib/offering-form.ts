import { z } from 'zod';
import type { TFunction } from 'i18next';
import type { FormValue } from '@/shared/api/form-data';
import { dateOnlyKey, diffChanged, diffCollection } from '@/shared/api/payload';
import {
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import type {
  BranchService,
  BranchVaccine,
} from '@/modules/branches/api/types';

/**
 * One form for everything a branch offers (doc §10, §11): a single service,
 * a service group, or a vaccine. Money accepts decimals on create and update
 * alike, and the price ≥ cost rules are checked on both (§18.3, §18.4).
 */
export const OFFERING_KINDS = ['service', 'group', 'vaccine'] as const;
export type OfferingKind = (typeof OFFERING_KINDS)[number];

const isMoney = (v: string) =>
  v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;

export function offeringFormSchema(
  t: TFunction<'branches'>,
  /** `YYYY-MM-DD` unavailable dates the server returned (update only). */
  originalOffDates: readonly string[] | null,
) {
  const required = t('validation.required');
  const money = () => z.string().refine(isMoney, t('validation.money'));
  return z
    .object({
      kind: z.enum(OFFERING_KINDS),
      itemId: z.string().min(1, required),
      cost: money(),
      b2cPrice: money(),
      b2cDiscount: z.string(),
      b2bPrice: z.string(),
      offDates: z.array(z.date()),
      reason: z.string().trim(),
      /** Slot time ids to link a new vaccine to (§11.3, optional). */
      slotTimeIds: z.array(z.string()),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });
      const cost = Number(v.cost);
      if (isMoney(v.b2cPrice) && Number(v.b2cPrice) < cost) {
        issue('b2cPrice', t('validation.priceBelowCost'));
      }
      if (v.kind === 'vaccine') {
        if (!isMoney(v.b2bPrice)) issue('b2bPrice', t('validation.money'));
        else if (Number(v.b2bPrice) < cost) {
          issue('b2bPrice', t('validation.priceBelowCost'));
        }
        return;
      }
      if (!isMoney(v.b2cDiscount)) issue('b2cDiscount', t('validation.money'));
      const keys = v.offDates.map(toDateOnly);
      const changed =
        originalOffDates === null
          ? keys.length > 0
          : diffChanged(
              diffCollection(
                originalOffDates.map((key, i) => ({ id: i + 1, key })),
                keys,
              ),
            );
      if (changed && !v.reason) issue('reason', t('validation.reason'));
    });
}

export type OfferingFormInput = z.input<ReturnType<typeof offeringFormSchema>>;
export type OfferingFormValues = z.output<
  ReturnType<typeof offeringFormSchema>
>;

export const offDateKeys = (s: BranchService | undefined): string[] =>
  (s?.scheduleOffs ?? [])
    .filter((o) => !o.isDeleted)
    .map((o) => dateOnlyKey(o.date));

export function serviceFormDefaults(s: BranchService): OfferingFormInput {
  const isGroup = !!s.services?.serviceGroupId;
  return {
    kind: isGroup ? 'group' : 'service',
    itemId: String(
      (isGroup ? s.services?.serviceGroupId : s.services?.serviceId) ?? '',
    ),
    cost: String(s.cost),
    b2cPrice: String(s.b2CPrice),
    b2cDiscount: String(s.b2CDiscount ?? 0),
    b2bPrice: '0',
    offDates: offDateKeys(s).map(fromDateOnly),
    reason: '',
    slotTimeIds: [],
  };
}

export function vaccineFormDefaults(v: BranchVaccine): OfferingFormInput {
  return {
    kind: 'vaccine',
    itemId: String(v.vaccineId),
    cost: String(v.cost),
    b2cPrice: String(v.b2CPrice),
    b2cDiscount: '0',
    b2bPrice: String(v.b2BPrice),
    offDates: [],
    reason: '',
    slotTimeIds: [],
  };
}

export const EMPTY_OFFERING: OfferingFormInput = {
  kind: 'service',
  itemId: '',
  cost: '',
  b2cPrice: '',
  b2cDiscount: '0',
  b2bPrice: '',
  offDates: [],
  reason: '',
  slotTimeIds: [],
};

const reasonOf = (v: OfferingFormValues) =>
  v.reason ? { Reason: v.reason } : undefined;

/**
 * Branch service create (§10.3). A group is sent as every service it holds,
 * each tagged with the group id (`groupServiceIds`).
 */
export function branchServiceCreatePayload(
  v: OfferingFormValues,
  branchId: number,
  groupServiceIds: readonly number[] = [],
): Record<string, FormValue> {
  const itemId = Number(v.itemId);
  const services =
    v.kind === 'group'
      ? groupServiceIds.map((serviceId) => ({ serviceId, groupedId: itemId }))
      : [{ serviceId: itemId }];
  return {
    ServiceProviderBranchId: branchId,
    Cost: Number(v.cost),
    B2CPrice: Number(v.b2cPrice),
    // B2B pricing is not used for branch services (§10.4).
    B2BPrice: 0,
    B2CDiscount: Number(v.b2cDiscount),
    Reason: reasonOf(v),
    Services: services,
    ScheduleOffs: v.offDates.map((d) => ({ date: toDateOnly(d) })),
  };
}

/** Branch service update (§10.5, with the fixes from §18.7 and §18.8). */
export function branchServiceUpdatePayload(
  v: OfferingFormValues,
  s: BranchService,
): Record<string, FormValue> {
  const link = s.services;
  const service = {
    id: link?.id ?? 0,
    serviceProviderBranchServiceId: s.id,
    isDeleted: false,
    ...(link?.serviceGroupId
      ? { groupedId: link.serviceGroupId }
      : { serviceId: link?.serviceId ?? Number(v.itemId) }),
  };
  const offs = diffCollection(
    (s.scheduleOffs ?? [])
      .filter((o) => !o.isDeleted)
      .map((o) => ({ id: o.id, key: dateOnlyKey(o.date) })),
    v.offDates.map(toDateOnly),
  ).map((d) => ({
    id: d.id,
    serviceProviderBranchServiceId: s.id,
    date: d.key,
    isDeleted: d.isDeleted,
  }));
  return {
    Id: s.id,
    ServiceProviderBranchId: s.serviceProviderBranchId,
    Cost: Number(v.cost),
    B2CPrice: Number(v.b2cPrice),
    B2BPrice: 0,
    B2CDiscount: Number(v.b2cDiscount),
    Services: [service],
    ScheduleOffs: offs,
    Reason: diffChanged(offs) ? reasonOf(v) : undefined,
  };
}

/**
 * Branch vaccine create (§11.3). `SlotTimeIds` is optional: the vaccine can
 * be linked to slot times here, or later from the weekly schedule (§9.7).
 */
export function vaccineCreatePayload(
  v: OfferingFormValues,
  branchId: number,
  slotTimeIds: readonly number[] = [],
): Record<string, FormValue> {
  return {
    ServiceProviderBranchId: branchId,
    VaccineId: Number(v.itemId),
    Cost: Number(v.cost),
    B2CPrice: Number(v.b2cPrice),
    B2BPrice: Number(v.b2bPrice),
    SlotTimeIds: slotTimeIds,
  };
}

/** Branch vaccine update (§11.5): the vaccine and branch are always resent as-is. */
export function vaccineUpdatePayload(
  v: OfferingFormValues,
  vaccine: BranchVaccine,
): Record<string, FormValue> {
  return {
    id: vaccine.id,
    serviceProviderBranchId: vaccine.serviceProviderBranchId,
    vaccineId: vaccine.vaccineId,
    cost: Number(v.cost),
    b2CPrice: Number(v.b2cPrice),
    b2BPrice: Number(v.b2bPrice),
  };
}
