import { useCallback } from 'react';
import type {
  Permission,
  PermissionInput,
} from '@/shared/permissions/permission-types';

/**
 * The granted permissions of the current session.
 *
 * TODO(backend): read these from the signed-in user (e.g. a `GetByToken`
 * response) once the auth endpoints are known. Until then everything is
 * allowed so every screen and action is reachable during development.
 */
function useGrantedPermissions(): readonly Permission[] | 'all' {
  return 'all';
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
  const granted = useGrantedPermissions();
  return useCallback(
    (input?: PermissionInput) => hasPermission(granted, input),
    [granted],
  );
}

export function useHasPermission(input?: PermissionInput): boolean {
  return usePermissionCheck()(input);
}
