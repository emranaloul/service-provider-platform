/** `User` (missing items §2.3) — the provider-user fields. */
export interface ProviderUser {
  id: string;
  userName: string;
  email: string;
  phoneNo: string;
  firstName: string;
  lastName: string;
  address: string;
  postCode: string;
  /** Relative media path. */
  img: string | null;
  isActive: boolean;
  dateOfBirth: string | null;
  identityNumber: string | null;
  nationalityId: number | null;
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
  /** 3 = Provider. */
  groupId: number;
  roleId: number;
  roleName: string;
  serviceProviderId: number;
  serviceProviderName: string;
  userServiceProviderBranches:
    | {
        id: number;
        serviceProviderBranchId: number;
        serviceProviderBranchName: string;
        serviceProviderName: string;
      }[]
    | null;
  userTags: { id: number; tagId: number; tagName: string }[] | null;
}
