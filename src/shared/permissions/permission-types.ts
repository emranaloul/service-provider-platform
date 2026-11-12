/**
 * Areas the app gates. One per sidebar module; extend as modules are added.
 * TODO(backend): map these to the Service Provider API's access model.
 */
export const AREAS = [
  'today',
  'reservations',
  'ledgers',
  'team',
  'services',
  'branches',
  'profile',
] as const;
export type Area = (typeof AREAS)[number];

/** `view` = read; `edit` = create / update / delete. */
export type PermissionAction = 'view' | 'edit';
export type Permission = readonly [Area, PermissionAction];
/** One permission, or an array meaning any-of. */
export type PermissionInput = Permission | readonly Permission[];
