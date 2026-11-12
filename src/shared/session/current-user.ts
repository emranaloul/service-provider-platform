import type { UserType } from '@/shared/api/enums';
import type { RolePermission } from '@/shared/permissions/backend-flags';
import { useSessionStore } from '@/shared/session/session-store';
import type { SessionUser } from '@/shared/session/types';

/** The signed-in user, as far as the Service Provider screens need it. */
export interface CurrentUser {
  user: SessionUser | null;
  groupId: UserType | null;
  /** The provider a Provider user belongs to. */
  serviceProviderId: number | null;
  rolePermissions: readonly RolePermission[];
}

const NOBODY: CurrentUser = {
  user: null,
  groupId: null,
  serviceProviderId: null,
  rolePermissions: [],
};

export function useCurrentUser(): CurrentUser {
  const user = useSessionStore((s) => s.model?.user ?? null);
  if (!user) return NOBODY;
  return {
    user,
    groupId: user.groupId,
    serviceProviderId: user.serviceProviderId || null,
    rolePermissions: user.rolePermissions ?? [],
  };
}
