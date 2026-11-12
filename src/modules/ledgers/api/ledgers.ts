import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { LedgerStatus } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import {
  apiDownload,
  apiGet,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import type { Ledger, LedgerDetails } from '@/modules/ledgers/api/types';
import {
  claimableParams,
  claimPayload,
  type ClaimableParams,
  type ClaimInput,
} from '@/modules/ledgers/lib/claim';
import { orderKeys } from '@/modules/reservations/api/orders';
import type { Order } from '@/modules/reservations/api/types';

const BASE = 'Reservation/Reservation';

// ── §14 Financial — claiming ────────────────────────────────────────────────

export const financialKeys = {
  all: ['financial'] as const,
  claimable: (p: ClaimableParams, scope: Record<string, number>) =>
    [...financialKeys.all, 'claimable', currentCulture(), p, scope] as const,
};

/** Completed, unclaimed orders (`Reservation/List`, §14.1). */
export const claimableOrdersQuery = (
  p: ClaimableParams,
  scope: Record<string, number> = {},
) =>
  queryOptions({
    queryKey: financialKeys.claimable(p, scope),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Order>>(`${BASE}/List?`, {
        signal,
        params: claimableParams(p, scope),
      }),
    placeholderData: keepPreviousData,
  });

/**
 * Claims the selected orders and creates a ledger (§14.2). `context` is the
 * current list context, e.g. `{ ServiceProviderId: 4 }` or
 * `{ ServiceProviderBranchId: 12 }`. Afterwards, show the provider's ledgers
 * for the claimed period.
 */
export function useClaimOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      context,
    }: {
      input: ClaimInput;
      context: Record<string, number | undefined>;
    }) =>
      apiPut<unknown>(
        `${BASE}/ClaimReservations?`,
        toFormData(claimPayload(input)),
        { params: context },
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: financialKeys.all }),
        qc.invalidateQueries({ queryKey: ledgerKeys.all }),
        qc.invalidateQueries({ queryKey: orderKeys.all }),
      ]),
  });
}

// ── §15 Ledgers ─────────────────────────────────────────────────────────────

export interface LedgerListParams {
  pageNumber: number;
  pageSize: number;
  serviceProviderId?: number;
  from?: string;
  to?: string;
  status?: LedgerStatus;
}

export const ledgerKeys = {
  all: ['ledgers'] as const,
  lists: () => [...ledgerKeys.all, 'list'] as const,
  list: (p: LedgerListParams, scope: Record<string, number>) =>
    [...ledgerKeys.lists(), currentCulture(), p, scope] as const,
  detail: (id: number) => [...ledgerKeys.all, 'detail', id] as const,
};

/** Newest claim first (§15.3); company users add their branch scope. */
export const ledgerListQuery = (
  p: LedgerListParams,
  scope: Record<string, number> = {},
) =>
  queryOptions({
    queryKey: ledgerKeys.list(p, scope),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Ledger>>(`${BASE}/LedgerList?`, {
        signal,
        params: {
          orderBy: 'claimedDate',
          orderDirection: false,
          pageNumber: p.pageNumber,
          pageSize: p.pageSize,
          ServiceProviderId: p.serviceProviderId,
          from: p.from,
          to: p.to,
          status: p.status,
          ...scope,
        },
      }),
    placeholderData: keepPreviousData,
  });

/**
 * A ledger opened by link when it is not on the current list page (Blocked
 * Items §3, option 2). `LedgerDetailsGetById` has no status, period, totals
 * or admin note, so the list row is looked up instead: filtered as tightly
 * as possible (provider, the link's `from` / `to`) and also sent `Id`, which
 * the backend may or may not honour. `null` when the row is not found.
 * TODO(backend): return those fields from `LedgerDetailsGetById` instead.
 */
export const ledgerRowQuery = (
  id: number,
  p: { serviceProviderId?: number; from?: string; to?: string },
  scope: Record<string, number> = {},
) =>
  queryOptions({
    queryKey: [...ledgerKeys.detail(id), 'row', p, scope],
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Ledger>>(`${BASE}/LedgerList?`, {
        signal,
        params: {
          Id: id,
          orderBy: 'claimedDate',
          orderDirection: false,
          pageNumber: 1,
          pageSize: 100,
          ServiceProviderId: p.serviceProviderId,
          from: p.from,
          to: p.to,
          ...scope,
        },
      }).then((page) => page?.data?.find((l) => l.id === id) ?? null),
    enabled: id > 0,
  });

/** The report: totals by service, service group and vaccine. */
export const ledgerDetailsQuery = (id: number) =>
  queryOptions({
    queryKey: [...ledgerKeys.detail(id), currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<LedgerDetails>(`${BASE}/LedgerDetailsGetById`, {
        signal,
        params: { Id: id },
      }),
  });

function useInvalidateLedger() {
  const qc = useQueryClient();
  return (id: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ledgerKeys.lists() }),
      qc.invalidateQueries({ queryKey: ledgerKeys.detail(id) }),
    ]);
}

/** Anyone who can view ledgers may add files. */
export function useAddLedgerAttachments() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) =>
      apiPut<unknown>(
        `${BASE}/UpdateLedgerAttachment`,
        toFormData({ Attachments: files }),
        { params: { id } },
      ),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

/** Admin users only (`groupId = 1`) — gate on the user type, not a flag. */
export function useUpdateLedgerStatus() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: LedgerStatus }) =>
      apiPut<unknown>(`${BASE}/UpdateLedgerStatus`, undefined, {
        params: { Id: id, Status: status },
      }),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

/** Needs `update:service-provider-ledgers-admin-note`. */
export function useSetLedgerAdminNote() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      apiPut<unknown>(`${BASE}/UpdateLedgerAdminNote`, undefined, {
        // axios URL-encodes the value.
        params: { Id: id, AdminNote: note },
      }),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

/** Binary responses, saved as files (§15.3). */
export const exportLedgerToExcel = (id: number) =>
  apiDownload(`${BASE}/ExportLedgerToExcel`, `ledger-${id}.xlsx`, {
    params: { LedgerId: id },
  });

export const downloadLedgerAttachments = (id: number) =>
  apiDownload(
    `${BASE}/LedgerDownloadAttachments`,
    `ledger-${id}-attachments.zip`,
    {
      params: { id },
    },
  );
