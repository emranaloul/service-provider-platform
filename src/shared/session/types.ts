import type { UserType } from '@/shared/api/enums';
import type { RolePermission } from '@/shared/permissions/backend-flags';

/** `IUser` (auth doc §9) — the fields this portal reads are typed strictly. */
export interface SessionUser {
  id: number;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNo?: string;
  mobileNumber?: string;
  /** Relative media path. */
  img?: string | null;
  language?: 'en' | 'ar';
  isActive: boolean;
  groupId: UserType;
  roleId: number;
  roleName: string;
  isManagement?: boolean;
  rolePermissions: (RolePermission & { id?: number; roleId?: number })[] | null;
  serviceProviderId: number | null;
  serviceProviderName: string | null;
  userServiceProviderBranches:
    | {
        id: number;
        serviceProviderBranchId: number;
        serviceProviderBranchName: string;
        serviceProviderName: string;
      }[]
    | null;
  companyId?: number | null;
  userCompanyBranches?:
    | {
        id: number;
        companyBranchId: number;
        companyBranchName: string;
        companyName: string;
      }[]
    | null;
}

/** `UserModel` returned by `getUserByToken` (§6). */
export interface UserModel {
  user: SessionUser;
  roles?: string[];
  auth?: { token: string; expiration?: string };
}
