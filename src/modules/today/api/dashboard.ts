import { queryOptions } from '@tanstack/react-query';
import { UserType } from '@/shared/api/enums';
import { apiGet, currentCulture } from '@/shared/api/http-client';

/**
 * The aggregated dashboard (missing items §9): one call, every section.
 * `WithPrice=true` is always sent — the cost / sell / profit figures need it.
 */
export interface ReservationCounts {
  newCount: number;
  acceptCount: number;
  cancelCount: number;
  rejectCount: number;
  checkInCount: number;
  delayedCount: number;
  inProgressCount: number;
  completeCount: number;
  noShowCount: number;
  totalCount: number;
  totalCost: number | null;
  totalSellPrice: number | null;
  profit: number | null;
}

interface FinancialBlock {
  reservationCount: number;
  totalCost: number;
  totalCostTax: number;
  totalSellPrice: number;
  totalSellPriceTax: number;
  profit: number;
}

export interface DashboardSummary {
  reservations: ReservationCounts | null;
  reservationsByStatusLog?: ReservationCounts | null;
  serviceProviderBranches: {
    activeServiceProviderBranches: number;
    inactiveServiceProviderBranches: number;
    totalCount: number;
  } | null;
  ledgers: {
    totalLedgersCount: number;
    totalClaimedReservations: number;
    totalCost: number;
    totalSellPrice: number;
    profit: number;
    ledgers: {
      id: number;
      claimedBy: string;
      claimedFrom: string;
      claimedTo: string;
      cost: number;
      sellPrice: number;
      claimedReservationsCount: number;
    }[];
  } | null;
  reservationFinancial: {
    totalReservationCount: number;
    totalCost: number;
    totalCostTax: number;
    totalSellPrice: number;
    totalSellPriceTax: number;
    profit: number;
    status: unknown;
    claimed?: FinancialBlock;
    notClaimed?: FinancialBlock;
  } | null;
}

export interface DashboardParams {
  /** `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  /** Only when the user filters by branch. */
  branchIds?: number[];
}

/**
 * Provider users default `ServiceProviderId` to their own provider; the
 * cancelled count is hidden from them, as the working client does.
 */
export const dashboardQuery = (
  p: DashboardParams,
  viewer: { groupId: UserType | null; serviceProviderId: number | null },
) =>
  queryOptions({
    queryKey: ['dashboard', currentCulture(), viewer.serviceProviderId, p],
    queryFn: ({ signal }) =>
      apiGet<DashboardSummary>('Dashboard/Dashboard/Summary', {
        signal,
        params: {
          From: p.from,
          To: p.to,
          ServiceProviderId: viewer.serviceProviderId ?? undefined,
          ServiceProviderBranchIds: p.branchIds,
          WithPrice: true,
          IncludeAddOns: true,
        },
      }).then((summary) =>
        viewer.groupId === UserType.Provider && summary.reservations
          ? {
              ...summary,
              reservations: { ...summary.reservations, cancelCount: 0 },
            }
          : summary,
      ),
  });

/** Sidebar badges from the same call (no badge endpoints exist). */
export const dashboardBadges = (s: DashboardSummary | undefined) => ({
  reservations: s?.reservations?.newCount ?? 0,
  claimable: s?.reservationFinancial?.notClaimed?.reservationCount ?? 0,
});
