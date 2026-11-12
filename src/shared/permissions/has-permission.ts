import { useCallback } from 'react';
import {
  hasAnyAreaPermission,
  type AnyPermission,
  hasServicePermission,
  hasSpPermission,
  type RolePermission,
  type ServicePermission,
  type SpPermission,
} from '@/shared/permissions/backend-flags';
import { useCurrentUser } from '@/shared/session/current-user';
import {
  AREAS,
  type Area,
  type Permission,
  type PermissionInput,
} from '@/shared/permissions/permission-types';

/**
 * Which backend flag (doc §16, §17.2) grants each app area. `null` = open to
 * every signed-in user. `edit` implies `view` (see `hasPermission`).
 */
const AREA_FLAGS: Record<
  Area,
  { view: SpPermission | null; edit: SpPermission | null }
> = {
  today: { view: null, edit: null },
  reservations: { view: 'view:service-provider-orders', edit: null },
  ledgers: { view: 'view:service-provider-ledgers', edit: null },
  team: {
    view: 'view:service-provider-users',
    edit: 'update:service-provider-users',
  },
  services: { view: 'view:branch-services', edit: 'update:branch-services' },
  branches: {
    view: 'view:service-provider-branch',
    edit: 'update:service-provider-branch',
  },
  profile: {
    view: 'view:service-provider-overview',
    edit: 'update:service-provider-settings',
  },
};

/** The app-area permissions a user's backend flags grant. */
export function grantedAreas(
  rolePermissions: readonly RolePermission[],
): Permission[] {
  const has = (flag: SpPermission | null) =>
    flag === null || hasSpPermission(rolePermissions, flag);
  return AREAS.flatMap((area): Permission[] => {
    const { view, edit } = AREA_FLAGS[area];
    if (edit && has(edit)) return [[area, 'edit']];
    return has(view) ? [[area, 'view']] : [];
  });
}

function isList(input: PermissionInput): input is readonly Permission[] {
  return Array.isArray(input[0]);
}

export function hasPermission(
  granted: readonly Permission[] | 'all',
  input: PermissionInput | undefined,
): boolean {
  if (!input || granted === 'all') return true;
  const list = isList(input) ? input : [input as Permission];
  return list.some(([area, action]) =>
    granted.some(
      ([a, act]) => a === area && (act === action || act === 'edit'),
    ),
  );
}

export function usePermissionCheck() {
  const { rolePermissions } = useCurrentUser();
  return useCallback(
    (input?: PermissionInput) =>
      hasPermission(grantedAreas(rolePermissions), input),
    [rolePermissions],
  );
}

export function useHasPermission(input?: PermissionInput): boolean {
  return usePermissionCheck()(input);
}

/** Checker for the backend's `service-provider` flags (doc §16). */
export function useSpPermissionCheck() {
  const { rolePermissions } = useCurrentUser();
  return useCallback(
    (name: SpPermission) => hasSpPermission(rolePermissions, name),
    [rolePermissions],
  );
}

export function useSpPermission(name: SpPermission): boolean {
  return useSpPermissionCheck()(name);
}

/** Checker for a flag in any area (company order bits, order vaccines, …). */
export function usePermissionFlagCheck() {
  const { rolePermissions } = useCurrentUser();
  return useCallback(
    (name: AnyPermission) => hasAnyAreaPermission(rolePermissions, name),
    [rolePermissions],
  );
}

/** Checker for the backend's `service` area flags (e.g. `view:vaccine`). */
export function useServicePermission(name: ServicePermission): boolean {
  const { rolePermissions } = useCurrentUser();
  return hasServicePermission(rolePermissions, name);
}
