import type { ReactNode } from 'react';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

interface PermissionGateProps {
  /** Required permission, or an array meaning any-of. Omit to always render. */
  permission?: PermissionInput;
  children: ReactNode;
  /** Rendered instead of `children` when not granted. Defaults to nothing. */
  fallback?: ReactNode;
}

/** Escape hatch for markup with no `permission` prop of its own. */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const allowed = useHasPermission(permission);
  return <>{allowed ? children : fallback}</>;
}
