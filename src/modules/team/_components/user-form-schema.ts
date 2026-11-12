import { z } from 'zod';
import type { TFunction } from 'i18next';
import {
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import type { ProviderUser } from '@/modules/team/api/types';
import {
  userErrors,
  type UserFormValues,
} from '@/modules/team/lib/user-payload';

const toId = (v: string) => (v ? Number(v) || null : null);

/** Select / checkbox fields hold strings and the date picker a `Date`. */
function toValues(v: UserFormInput): UserFormValues {
  return {
    userName: v.userName,
    email: v.email,
    phoneNo: v.phoneNo,
    firstName: v.firstName,
    lastName: v.lastName,
    address: v.address,
    postCode: v.postCode,
    countryId: toId(v.countryId),
    cityId: toId(v.cityId),
    nationalityId: toId(v.nationalityId),
    identityNumber: v.identityNumber,
    dateOfBirth: v.dateOfBirth ? toDateOnly(v.dateOfBirth) : '',
    isActive: v.isActive,
    roleId: toId(v.roleId),
    branchIds: v.branchIds.map(Number),
    tagIds: v.tagIds.map(Number),
    img: v.img,
  };
}

const shape = z.object({
  userName: z.string(),
  email: z.string(),
  phoneNo: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  postCode: z.string(),
  countryId: z.string(),
  cityId: z.string(),
  nationalityId: z.string(),
  identityNumber: z.string(),
  dateOfBirth: z.date().nullable(),
  isActive: z.boolean(),
  roleId: z.string(),
  branchIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  img: z.instanceof(File).nullable(),
});

export type UserFormInput = z.input<typeof shape>;

/** The §2.6 rules from `userErrors`, with translated messages. */
export function userFormSchema(t: TFunction<'team'>) {
  return shape
    .superRefine((input, ctx) => {
      const errors = userErrors(toValues(input), toDateOnly(new Date()));
      for (const [field, rule] of Object.entries(errors)) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: t(`validation.${rule}`),
        });
      }
    })
    .transform(toValues);
}

/**
 * A date of birth is a calendar date, not an instant: read its `YYYY-MM-DD`
 * part as a local date so no time-zone shift can move it a day.
 */
export function dateOfBirthFromApi(
  value: string | null | undefined,
): Date | null {
  const day = value?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = fromDateOnly(day);
  return Number.isNaN(d.getTime()) || toDateOnly(d) !== day ? null : d;
}

const id = (n: number | null | undefined) => (n ? String(n) : '');

export function userFormDefaults(
  user: ProviderUser | undefined,
): UserFormInput {
  return {
    userName: user?.userName ?? '',
    email: user?.email ?? '',
    phoneNo: user?.phoneNo ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    address: user?.address ?? '',
    postCode: user?.postCode ?? '',
    countryId: id(user?.countryId),
    cityId: id(user?.cityId),
    nationalityId: id(user?.nationalityId),
    identityNumber: user?.identityNumber ?? '',
    dateOfBirth: dateOfBirthFromApi(user?.dateOfBirth),
    isActive: user?.isActive ?? true,
    roleId: id(user?.roleId),
    branchIds: (user?.userServiceProviderBranches ?? []).map((b) =>
      String(b.serviceProviderBranchId),
    ),
    tagIds: (user?.userTags ?? []).map((tag) => String(tag.tagId)),
    img: null,
  };
}
