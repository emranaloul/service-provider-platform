export {
  AREAS,
  type Area,
  type Permission,
  type PermissionAction,
  type PermissionInput,
} from '@/shared/permissions/permission-types';
export {
  hasPermission,
  useHasPermission,
  usePermissionCheck,
  usePermissionFlagCheck,
  useServicePermission,
  useSpPermission,
  useSpPermissionCheck,
} from '@/shared/permissions/has-permission';
export type {
  AnyPermission,
  ServicePermission,
  SpPermission,
} from '@/shared/permissions/backend-flags';
export { PermissionGate } from '@/shared/permissions/permission-gate';
