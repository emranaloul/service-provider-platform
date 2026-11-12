/**
 * Backend permission model (doc §16, auth doc §9): per-area bit flags. The
 * signed-in user carries `rolePermissions: { type, permission }[]`, where
 * `permission` can exceed 2^53 — always compare as BigInt. Anything unknown
 * fails closed.
 */

export const PermissionArea = {
  Company: 1,
  Service: 2,
  ServiceProvider: 4,
  GeneralSettings: 8,
  Client: 16,
  Sidebar: 32,
  Academy: 64,
  Dashboard: 128,
  SidebarReports: 256,
  SidebarNotifications: 512,
  SidebarService: 1024,
  CompanyExtended: 2048,
  SidebarMobileApp: 4096,
  GeneralSettingsExtended: 8192,
  SidebarExternal: 16384,
} as const;
export type PermissionArea =
  (typeof PermissionArea)[keyof typeof PermissionArea];

/** `service-provider` area (type 4). */
export const SP = {
  'view:service-provider-category': 1n,
  'create:service-provider-category': 2n,
  'update:service-provider-category': 4n,
  'delete:service-provider-category': 8n,
  'view:service-provider-classification': 16n,
  'create:service-provider-classification': 32n,
  'update:service-provider-classification': 64n,
  'delete:service-provider-classification': 128n,
  'view:service-provider': 256n,
  'create:service-provider': 512n,
  'update:service-provider': 1024n,
  'delete:service-provider': 2048n,
  'view:service-provider-branch': 4096n,
  'create:service-provider-branch': 8192n,
  'update:service-provider-branch': 16384n,
  'delete:service-provider-branch': 32768n,
  'view:branch-services': 65536n,
  'create:branch-services': 131072n,
  'update:branch-services': 262144n,
  'delete:branch-services': 524288n,
  'view:service-provider-users': 1048576n,
  'create:service-provider-users': 2097152n,
  'update:service-provider-users': 4194304n,
  'delete:service-provider-users': 8388608n,
  'view:service-provider-financial': 16777216n,
  'view:service-provider-branch-slots': 33554432n,
  'view:service-provider-overview': 67108864n,
  'update:service-provider-overview': 134217728n,
  'create:service-provider-overview': 268435456n,
  'view:service-provider-settings': 536870912n,
  'update:service-provider-settings': 1073741824n,
  'create:service-provider-settings': 2147483648n,
  'view:service-provider-orders': 4294967296n,
  'view:service-provider-ledgers': 8589934592n,
  'delete-attachment:service-provider-orders': 17179869184n,
  'view:branch-vaccines': 34359738368n,
  'create:branch-vaccines': 68719476736n,
  'update:branch-vaccines': 137438953472n,
  'delete:branch-vaccines': 274877906944n,
  'view:service-provider-branch-vaccine-slots': 549755813888n,
  'update:service-provider-branch-vaccine-slots': 1099511627776n,
  'update:service-provider-ledgers-admin-note': 2199023255552n,
  'view:service-provider-attachments': 4398046511104n,
  'upload:service-provider-attachments': 8796093022208n,
  'delete:service-provider-attachments': 17592186044416n,
} as const;
export type SpPermission = keyof typeof SP;

/** `service` area (type 2) — only the flags this portal checks. */
export const SERVICE = {
  'view:vaccine': 4096n,
  'create:vaccine': 8192n,
  'update:vaccine': 16384n,
  'delete:vaccine': 32768n,
} as const;
export type ServicePermission = keyof typeof SERVICE;

/** `company` area (type 1) — the order bits this portal checks. */
export const COMPANY = {
  /** The working client gates the profile FAQs tab with it (Missing Items §12.1). */
  'view:company': 1n,
  /** "Update result" on a completed order (Missing Items §12.3). */
  'update:company-update-result': 68719476736n, // 2^36
  /** "Update price" on a completed order (Blocked Items §2). */
  'update:company-update-price': 137438953472n, // 2^37
  'view:company-orders': 4294967296n, // 2^32
  'view-details:company-orders': 8589934592n, // 2^33
  'complete:company-orders': 17179869184n, // 2^34
  'change-status:company-orders': 34359738368n, // 2^35
  'cancel:company-orders': 4503599627370496n, // 2^52
} as const;
export type CompanyPermission = keyof typeof COMPANY;

/** `company-extended` area (type 2048). */
export const COMPANY_EXTENDED = {
  'view:order-vaccines': 8n,
  'update:order-vaccines': 16n,
} as const;
export type CompanyExtendedPermission = keyof typeof COMPANY_EXTENDED;

/** Every flag this portal checks, as `area name` → its area + bit. */
export const FLAGS = {
  ...Object.fromEntries(
    Object.entries(SP).map(([k, v]) => [
      k,
      [PermissionArea.ServiceProvider, v],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(SERVICE).map(([k, v]) => [k, [PermissionArea.Service, v]]),
  ),
  ...Object.fromEntries(
    Object.entries(COMPANY).map(([k, v]) => [k, [PermissionArea.Company, v]]),
  ),
  ...Object.fromEntries(
    Object.entries(COMPANY_EXTENDED).map(([k, v]) => [
      k,
      [PermissionArea.CompanyExtended, v],
    ]),
  ),
} as unknown as Record<AnyPermission, readonly [PermissionArea, bigint]>;
export type AnyPermission =
  | SpPermission
  | ServicePermission
  | CompanyPermission
  | CompanyExtendedPermission;

export interface RolePermission {
  type: number;
  /** Sent as a number or a string; may exceed `Number.MAX_SAFE_INTEGER`. */
  permission: number | string;
}

const toBigInt = (value: number | string): bigint => {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
};

/** True when every bit of `required` is granted in `area`. */
export function hasFlagPermission(
  granted: readonly RolePermission[],
  area: PermissionArea,
  required: bigint,
): boolean {
  return granted.some(
    (r) => r.type === area && (toBigInt(r.permission) & required) === required,
  );
}

/** Shorthand for the `service-provider` area. */
export const hasSpPermission = (
  granted: readonly RolePermission[],
  name: SpPermission,
) => hasFlagPermission(granted, PermissionArea.ServiceProvider, SP[name]);

/** Shorthand for the `service` area. */
export const hasServicePermission = (
  granted: readonly RolePermission[],
  name: ServicePermission,
) => hasFlagPermission(granted, PermissionArea.Service, SERVICE[name]);

/** Any known flag, in whichever area it lives. Unknown names fail closed. */
export function hasAnyAreaPermission(
  granted: readonly RolePermission[],
  name: AnyPermission,
): boolean {
  const flag = FLAGS[name] as (typeof FLAGS)[AnyPermission] | undefined;
  return flag ? hasFlagPermission(granted, flag[0], flag[1]) : false;
}
