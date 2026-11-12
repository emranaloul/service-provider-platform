import { queryOptions } from '@tanstack/react-query';
import { toFormData } from '@/shared/api/form-data';
import { apiGet, apiPost, currentCulture } from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import type { Branch, Slot } from '@/modules/branches/api/types';

/**
 * Branch lookups used by booking flows (doc §12): company packages, wallet
 * reservations and public booking links.
 */
const BRANCH = 'Provider/ServiceProviderBranch';
const SLOT = 'Provider/ServiceProviderBranchSlot';

const bookingKeys = {
  all: ['booking'] as const,
  of: (name: string, p: unknown) =>
    [...bookingKeys.all, name, currentCulture(), p] as const,
};

// ── §12.1 Custom list ───────────────────────────────────────────────────────

export interface CustomListParams {
  companyPackageId?: number;
  companyPackageClassificationId?: number;
  cityId?: number;
  countryId?: number;
  vaccineIds?: number[];
  serviceGroupIds?: number[];
}

export interface ProviderWithBranches {
  id: number;
  name: string;
  branches: Branch[];
}

/** Groups branches under their provider: pick a provider, then a branch. */
export function groupBranchesByProvider(
  branches: readonly Branch[],
): ProviderWithBranches[] {
  const byId = new Map<number, ProviderWithBranches>();
  for (const b of branches) {
    const group = byId.get(b.serviceProviderId) ?? {
      id: b.serviceProviderId,
      name: b.serviceProvider,
      branches: [],
    };
    group.branches.push(b);
    byId.set(b.serviceProviderId, group);
  }
  return [...byId.values()];
}

export const customBranchListQuery = (p: CustomListParams) =>
  queryOptions({
    queryKey: bookingKeys.of('customList', p),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Branch>>(`${BRANCH}/CustomList?`, {
        signal,
        params: {
          CompanyPackageId: p.companyPackageId,
          CompanyPackageClassificationId: p.companyPackageClassificationId,
          CityId: p.cityId,
          CountryId: p.countryId,
          VaccineIds: p.vaccineIds,
          ServiceGroupIds: p.serviceGroupIds,
        },
      }).then((page) => groupBranchesByProvider(page?.data ?? [])),
  });

// ── §12.2 Filtered list ─────────────────────────────────────────────────────

export interface FilteredListParams {
  classificationId?: number;
  countryId?: number;
  cityId?: number;
}

/** Only runs once all three are known; handles both response shapes. */
export const filteredBranchListQuery = (p: FilteredListParams) =>
  queryOptions({
    queryKey: bookingKeys.of('filteredList', p),
    queryFn: () =>
      apiPost<Branch[] | { data: Branch[] } | null>(
        `${BRANCH}/FilteredList`,
        toFormData({
          ClassificationId: p.classificationId,
          CountryId: p.countryId,
          CityId: p.cityId,
        }),
      ).then((v) => (Array.isArray(v) ? v : (v?.data ?? []))),
    enabled: !!(p.classificationId && p.countryId && p.cityId),
  });

// ── §12.3 Map list ──────────────────────────────────────────────────────────

export interface BranchMarker {
  id: number;
  isActive: boolean;
  name: string;
  serviceProviderId: number;
  serviceProviderName: string;
  latitude: number;
  longitude: number;
  icon?: string;
}

export interface MapListParams {
  /** Required. The branch finder defaults to city 12 of country 14. */
  cityId: number;
  classificationId?: number;
  serviceGroupIds?: number[];
  vaccineIds?: number[];
}

export const DEFAULT_MAP_COUNTRY_ID = 14;
export const DEFAULT_MAP_CITY_ID = 12;

export const branchMapQuery = (p: MapListParams) =>
  queryOptions({
    queryKey: bookingKeys.of('mapList', p),
    queryFn: ({ signal }) =>
      apiGet<BranchMarker[] | null>(`${BRANCH}/MapList?`, {
        signal,
        params: {
          CityId: p.cityId,
          ClassificationId: p.classificationId,
          ServiceGroupIds: p.serviceGroupIds,
          // Backend spelling (§18.9).
          VaccinIds: p.vaccineIds,
        },
      }).then((list) => list ?? []),
  });

/** Client-side search on branch and provider name (§12.3) — no refetch. */
export const searchMarkers = (markers: readonly BranchMarker[], q: string) => {
  const term = q.trim().toLowerCase();
  if (!term) return [...markers];
  return markers.filter(
    (m) =>
      m.name.toLowerCase().includes(term) ||
      m.serviceProviderName.toLowerCase().includes(term),
  );
};

// ── §12.4 Slots for a company package on a date ─────────────────────────────

export interface PackageSlotParams {
  serviceProviderBranchId?: number;
  /** `YYYY-MM-DD`. */
  dateChosen?: string;
  companyPackageId?: number;
  companyPackageClassificationId?: number;
}

/** One `Slot` for the date's weekday; times are UTC. */
export const packageSlotsQuery = (p: PackageSlotParams) =>
  queryOptions({
    queryKey: bookingKeys.of('getSlots', p),
    queryFn: ({ signal }) =>
      apiGet<Slot | null>(`${SLOT}/GetSlots?`, {
        signal,
        params: {
          ServiceProviderBranchId: p.serviceProviderBranchId,
          DateChosen: p.dateChosen,
          CompanyPackageId: p.companyPackageId,
          CompanyPackageClassificationId: p.companyPackageClassificationId,
        },
      }),
  });

// ── §12.5 Weekly available slots ────────────────────────────────────────────

export interface AvailableSlotTime {
  slotTimeId: number;
  from: string;
  to: string;
  price: number;
  taxPrice: number;
  serviceProviderBranchServiceId: number | null;
  serviceId: number | null;
  serviceName: string | null;
  serviceGroupId: number | null;
  serviceGroupName: string | null;
  serviceProviderBranchVaccineId: number | null;
  vaccineId: number | null;
  vaccineName: string | null;
}

export interface WeeklyAvailableSlots {
  slotTimesGroupedByDay: {
    day: string;
    totalPrice: number;
    slotTimes: AvailableSlotTime[];
  }[];
}

/** Fetched once; booking flows then filter by the picked date's weekday. */
export const weeklyAvailableSlotsQuery = (p: {
  branchId: number;
  serviceGroupId?: number;
  vaccineIds?: number[];
}) =>
  queryOptions({
    queryKey: bookingKeys.of('weekly', p),
    queryFn: ({ signal }) =>
      apiGet<WeeklyAvailableSlots>(
        `${SLOT}/GetWeeklyAvailableTimeSlotsForBranch?`,
        {
          signal,
          params: {
            serviceProviderBranch: p.branchId,
            serviceGroupId: p.serviceGroupId,
            vaccineId: p.vaccineIds,
          },
        },
      ),
  });
