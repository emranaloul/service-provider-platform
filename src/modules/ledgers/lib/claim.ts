import { UserType } from '@/shared/api/enums';
import type { FormValue } from '@/shared/api/form-data';
import type { QueryParamValue } from '@/shared/api/params';
import type { Order } from '@/modules/reservations/api/types';

/**
 * Company users' list requests carry their company branches as
 * `CompanyBranchIds[0]=…&CompanyBranchIds[1]=…` (doc §14.1, auth §9).
 * Provider users are not scoped on the client — the token scopes them.
 */
export function companyBranchScope(
  groupId: UserType | null,
  companyBranchIds: readonly number[],
): Record<string, number> {
  if (groupId !== UserType.Company && groupId !== UserType.CompanyMember) {
    return {};
  }
  return Object.fromEntries(
    companyBranchIds.map((id, i) => [`CompanyBranchIds[${i}]`, id]),
  );
}

/** Claimable-order filters (§14.1). */
export interface ClaimableParams {
  pageNumber: number;
  pageSize: number;
  serviceProviderId?: number;
  serviceProviderBranchId?: number;
  serviceGroupIds?: number[];
  serviceIds?: number[];
  ownerId?: string;
  /** UTC date. */
  from?: string;
  to?: string;
  search?: string;
}

/** Only completed, unclaimed orders can be claimed (§14.3). */
export const claimableParams = (
  p: ClaimableParams,
  scope: Record<string, number>,
): Record<string, QueryParamValue> => ({
  isClaimedByProvider: false,
  Status: 64,
  ServiceProviderId: p.serviceProviderId,
  pageNumber: p.pageNumber,
  pageSize: p.pageSize,
  serviceProviderBranchId: p.serviceProviderBranchId,
  ServiceGroupIds: p.serviceGroupIds,
  ServiceIds: p.serviceIds,
  OwnerId: p.ownerId,
  From: p.from,
  To: p.to,
  Search: p.search,
  ...scope,
});

/** Claim summary (§14.3): cost, sell price and the covered period. */
export function claimSummary(
  orders: readonly Pick<Order, 'cost' | 'sellPrice' | 'dateChosen'>[],
) {
  const times = orders
    .map((o) => Date.parse(o.dateChosen))
    .filter(Number.isFinite);
  return {
    cost: orders.reduce((sum, o) => sum + o.cost, 0),
    sellPrice: orders.reduce((sum, o) => sum + o.sellPrice, 0),
    from: times.length ? new Date(Math.min(...times)).toISOString() : null,
    to: times.length ? new Date(Math.max(...times)).toISOString() : null,
  };
}

/** "Cost with tax" shown in the claim list (§14.3). */
export const costWithTax = (o: Pick<Order, 'cost' | 'costTax'>) =>
  o.cost + o.costTax;

export interface ClaimInput {
  orders: readonly Pick<Order, 'id' | 'cost' | 'sellPrice' | 'dateChosen'>[];
  /** Required. */
  note: string;
  files: File[];
}

/** Claim body (§14.2); ids are sent indexed, `Ids[0]`, `Ids[1]`, … */
export function claimPayload(v: ClaimInput): Record<string, FormValue> {
  const { from, to } = claimSummary(v.orders);
  return {
    ...Object.fromEntries(v.orders.map((o, i) => [`Ids[${i}]`, o.id])),
    ClaimedFrom: from,
    ClaimedTo: to,
    Note: v.note.trim(),
    ClaimedAttachments: v.files,
  };
}
