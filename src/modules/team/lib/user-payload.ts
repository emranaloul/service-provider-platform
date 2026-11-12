import { UserType } from '@/shared/api/enums';
import type { FormValue } from '@/shared/api/form-data';
import { diffCollection } from '@/shared/api/payload';
import { fromDateOnly } from '@/shared/components/layout/form/date-utils';
import type { ProviderUser } from '@/modules/team/api/types';

/** Values of the provider-user form (missing items §2.4–§2.6). */
export interface UserFormValues {
  /** Must be an email for provider users. */
  userName: string;
  email: string;
  phoneNo: string;
  firstName: string;
  lastName: string;
  address: string;
  postCode: string;
  countryId: number | null;
  cityId: number | null;
  nationalityId: number | null;
  identityNumber: string;
  /** `YYYY-MM-DD` or `''`. */
  dateOfBirth: string;
  isActive: boolean;
  roleId: number | null;
  branchIds: number[];
  tagIds: number[];
  img: File | null;
}

export type UserField = keyof UserFormValues;
export type UserRule =
  | 'required'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'branches'
  | 'futureDate'
  | 'digits';

const NAME_RE = /^[A-Za-z؀-ۿ\s'-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d+$/;
const HAS_ALNUM_RE = /[A-Za-z0-9؀-ۿ٠-٩]/;

/** §2.6 validation; returns the failing rule per field. */
export function userErrors(
  v: UserFormValues,
  today: string,
): Partial<Record<UserField, UserRule>> {
  const e: Partial<Record<UserField, UserRule>> = {};
  for (const field of ['firstName', 'lastName'] as const) {
    const value = v[field].trim();
    if (!value) e[field] = 'required';
    else if (!NAME_RE.test(value)) e[field] = 'name';
  }
  if (!v.userName.trim()) e.userName = 'required';
  else if (!EMAIL_RE.test(v.userName.trim())) e.userName = 'email';
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'email';
  const phone = v.phoneNo.replace(/\s+/g, '');
  if (!phone) e.phoneNo = 'required';
  else if (!PHONE_RE.test(phone)) e.phoneNo = 'phone';
  if (!v.address.trim()) e.address = 'required';
  else if (!HAS_ALNUM_RE.test(v.address)) e.address = 'address';
  if (!v.countryId) e.countryId = 'required';
  if (!v.cityId) e.cityId = 'required';
  if (!v.roleId) e.roleId = 'required';
  if (v.branchIds.length === 0) e.branchIds = 'branches';
  if (v.dateOfBirth && v.dateOfBirth > today) e.dateOfBirth = 'futureDate';
  if (v.identityNumber.trim() && !/^\d+$/.test(v.identityNumber.trim())) {
    e.identityNumber = 'digits';
  }
  return e;
}

/** `YYYY-MM-DD` → the UTC timestamp of that local day, as the API takes it. */
const utcDate = (value: string) =>
  value ? fromDateOnly(value).toISOString() : '';

/**
 * Create (§2.4) or update (§2.5) body. Provider users carry the provider id
 * in `CompanyId` — that is what the backend accepts today (§2.4 note).
 * `forceAdd` is only set on the confirmed retry of the "already exists" flow.
 */
export function userPayload(
  v: UserFormValues,
  serviceProviderId: number,
  user?: ProviderUser,
  forceAdd = false,
): Record<string, FormValue> {
  const id = user?.id ?? 0;
  const branches = diffCollection(
    (user?.userServiceProviderBranches ?? []).map((b) => ({
      id: b.id,
      key: b.serviceProviderBranchId,
    })),
    v.branchIds,
  ).map((d) => ({
    id: d.id,
    userId: id,
    serviceProviderBranchId: d.key,
    isDeleted: d.isDeleted,
  }));
  const tags = diffCollection(
    (user?.userTags ?? []).map((t) => ({ id: t.id, key: t.tagId })),
    v.tagIds,
  ).map((d) =>
    user
      ? { id: d.id, tagsId: d.key, UserId: id, isDeleted: d.isDeleted }
      : { id: 0, UserId: 0, tagsId: d.key },
  );

  return {
    Id: id,
    UserName: v.userName.trim(),
    Email: v.email.trim() || undefined,
    PhoneNo: v.phoneNo.replace(/\s+/g, ''),
    FirstName: v.firstName.trim(),
    LastName: v.lastName.trim(),
    CountryID: v.countryId,
    CityID: v.cityId,
    NationalityId: v.nationalityId,
    IdentityNumber: v.identityNumber.trim() || undefined,
    GroupId: UserType.Provider,
    CompanyId: serviceProviderId,
    Address: v.address.trim(),
    // Update always sends these, empty when unset.
    PostCode: user ? v.postCode.trim() : v.postCode.trim() || undefined,
    DateOfBirth: user
      ? utcDate(v.dateOfBirth)
      : utcDate(v.dateOfBirth) || undefined,
    Img: v.img,
    IsActive: v.isActive,
    RoleId: v.roleId,
    AllCompanyBranchesAccess: false,
    UserServiceProviderBranchRequest: branches,
    UserTagsRequest: tags,
    ForceAdd: forceAdd ? true : undefined,
  };
}
