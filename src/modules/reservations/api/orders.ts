import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toFormData } from '@/shared/api/form-data';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import { LOOKUP_PATHS } from '@/shared/api/lookups';
import type { QueryParamValue } from '@/shared/api/params';
import type { PagedResponse } from '@/shared/api/types';
import { UserType } from '@/shared/api/enums';
import type {
  Order,
  ReservationDetails,
  ServiceQuestion,
} from '@/modules/reservations/api/types';
import {
  changeStatusPayload,
  completePayload,
  PROVIDER_EXCLUDED_STATUS,
  type ChangeStatusInput,
  type CompleteInput,
  type OrderQuestion,
} from '@/modules/reservations/lib/order-rules';

const BASE = 'Reservation/Reservation';

/** Order list filters (doc §13.2). */
export interface OrderListParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  phone?: string;
  reservationDate?: string;
  companyId?: number;
  companyBranchId?: number;
  /**
   * `ShortcutList` never received a branch filter in the working client;
   * `Reservation/List` does take it (Missing Items §12.6). Setting it switches
   * the list to `List` — see `orderListPath`.
   */
  serviceProviderBranchId?: number;
  companyPackageId?: number;
  status?: number;
  /** Sum of the excluded status bits. */
  excludedStatus?: number;
  serviceProviderId?: number;
  from?: string;
  to?: string;
  identityNumber?: string;
  isFit?: boolean;
  cityId?: number;
  requestChannel?: number;
  requestFunding?: number;
}

/**
 * The provider list query (§13.2), newest first. Provider users are scoped
 * by their token: no `ServiceProviderId`, and Cancel + NoShow are excluded
 * unless the filter set `ExcludedStatus` itself.
 */
export function orderListParams(
  p: OrderListParams,
  groupId: UserType | null,
): Record<string, QueryParamValue> {
  const provider = groupId === UserType.Provider;
  return {
    CompanyId: p.companyId,
    ServiceProviderId: provider ? undefined : p.serviceProviderId,
    ExcludedStatus:
      p.excludedStatus ?? (provider ? PROVIDER_EXCLUDED_STATUS : undefined),
    OrderDirection: false,
    OrderBy: 'CreatedAt',
    pageNumber: p.pageNumber,
    pageSize: p.pageSize,
    search: p.search,
    phone: p.phone,
    ReservationDate: p.reservationDate,
    CompanyBranchId: p.companyBranchId,
    serviceProviderBranchId: p.serviceProviderBranchId,
    CompanyPackageId: p.companyPackageId,
    Status: p.status,
    from: p.from,
    to: p.to,
    IdentityNumber: p.identityNumber,
    isFit: p.isFit,
    CityId: p.cityId,
    RequestChannel: p.requestChannel,
    RequestFunding: p.requestFunding,
  };
}

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (p: OrderListParams, groupId: UserType | null) =>
    [...orderKeys.lists(), currentCulture(), groupId, p] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  questions: (serviceIds: readonly number[]) =>
    [...orderKeys.all, 'questions', currentCulture(), serviceIds] as const,
};

/**
 * Provider view: `ShortcutList` (§13.1); `List` when a branch is filtered,
 * because only `List` is known to honour `serviceProviderBranchId`.
 */
export const orderListPath = (
  p: Pick<OrderListParams, 'serviceProviderBranchId'>,
) => (p.serviceProviderBranchId ? `${BASE}/List?` : `${BASE}/ShortcutList?`);

export const orderListQuery = (p: OrderListParams, groupId: UserType | null) =>
  queryOptions({
    queryKey: orderKeys.list(p, groupId),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Order>>(orderListPath(p), {
        signal,
        params: orderListParams(p, groupId),
      }),
    placeholderData: keepPreviousData,
  });

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: [...orderKeys.detail(id), currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<ReservationDetails>(`${BASE}/GetById`, {
        signal,
        params: { Id: id },
      }),
  });

/** Questions for the services on an order (§13.4). */
export const serviceQuestionsQuery = (serviceIds: readonly number[]) =>
  queryOptions({
    queryKey: orderKeys.questions(serviceIds),
    queryFn: ({ signal }) =>
      apiGet<ServiceQuestion[] | null>(LOOKUP_PATHS.serviceQuestions, {
        signal,
        params: { ServiceIds: [...serviceIds] },
      }).then((list) => list ?? []),
    enabled: serviceIds.length > 0,
  });

function useInvalidateOrder() {
  const qc = useQueryClient();
  return (id: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: orderKeys.lists() }),
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) }),
    ]);
}

/**
 * "Update result" on a completed order (Missing Items §12.3): fit / unfit
 * and, for `packageType = 3` (Both), Enroll / Unenroll chosen by the user.
 * JSON body. Price updates (type 2) are not offered: their fields are not
 * specified.
 */
export interface UpdateResultInput {
  reservationId: string;
  isFit: boolean;
  /** `EnrollmentType`; send `None` (3) unless the package is Both. */
  enrollmentType: number;
}

export const updateResultBody = (v: UpdateResultInput) => ({
  reservationId: v.reservationId,
  reservationUpdateType: 1, // 1 = Fit, 2 = Price, 4 = Both
  isFit: v.isFit,
  enrollmentType: v.enrollmentType,
});

/**
 * "Update price" on a completed order (Blocked Items §2): same endpoint,
 * `reservationUpdateType: 2`. The order's current `isFit` is resent so the
 * fit result is not overwritten. Type 4 (Both) is never sent.
 */
export interface UpdatePriceInput {
  reservationId: string;
  /** The order's current fit result, unchanged. */
  isFit: boolean;
  cost: number;
  sellPrice: number;
}

export const updatePriceBody = (v: UpdatePriceInput) => ({
  reservationId: v.reservationId,
  reservationUpdateType: 2, // 2 = Price
  isFit: v.isFit,
  cost: v.cost,
  sellPrice: v.sellPrice,
});

export function useUpdateOrderPrice() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: (v: UpdatePriceInput) =>
      apiPut<unknown>(`${BASE}/UpdatePricingAndFit`, updatePriceBody(v)),
    onSuccess: (_d, v) => invalidate(v.reservationId),
  });
}

export function useUpdateOrderResult() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: (v: UpdateResultInput) =>
      apiPut<unknown>(`${BASE}/UpdatePricingAndFit`, updateResultBody(v)),
    onSuccess: (_d, v) => invalidate(v.reservationId),
  });
}

/** CheckIn / InProgress, or Cancel / Reject with their reason (§13.4). */
export function useChangeOrderStatus() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: (v: ChangeStatusInput) =>
      apiPut<unknown>(
        `${BASE}/UpdateStatus`,
        toFormData(changeStatusPayload(v)),
      ),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

/** Complete with answers, fit flag and result files (§13.4). */
export function useCompleteOrder() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: ({
      input,
      questions,
    }: {
      input: CompleteInput;
      questions: readonly OrderQuestion[];
    }) =>
      apiPut<unknown>(
        `${BASE}/UpdateStatusToComplete`,
        toFormData(completePayload(input, questions)),
      ),
    onSuccess: (_d, { input }) => invalidate(input.id),
  });
}

/** Edit a completed order: add result files. */
export function useAddOrderAttachments() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      apiPost<unknown>(
        `${BASE}/AddAttachment`,
        toFormData({ Id: id, ResultAttachments: files }),
      ),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

/** Edit a completed order: remove one result file by its path. */
export function useDeleteOrderAttachment() {
  const invalidate = useInvalidateOrder();
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) =>
      apiDelete<unknown>(`${BASE}/DeleteAttachment`, {
        params: { Id: id, attachment: path },
      }),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}
