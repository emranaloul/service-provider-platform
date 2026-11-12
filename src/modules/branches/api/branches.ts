import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { deleteById, deleteMany, type DeleteParams } from '@/shared/api/delete';
import { toFormData, type FormValue } from '@/shared/api/form-data';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import {
  BRANCH_PATHS,
  BRANCH_SERVICE_PATHS,
  BRANCH_VACCINE_PATHS,
  SLOT_PATHS,
} from '@/modules/branches/api/paths';
import type {
  Branch,
  BranchService,
  BranchVaccine,
  Slot,
} from '@/modules/branches/api/types';
import {
  setSchedulePayload,
  vaccineLinkChanges,
  type EditorDay,
  type ScheduleOrigin,
} from '@/modules/branches/lib/slot-schedule';

/** Branch list filters (doc §8.1). */
export interface BranchListParams {
  pageNumber: number;
  pageSize: number;
  serviceProviderId?: number;
  status?: boolean;
  classificationId?: number;
  countryId?: number;
  cityId?: number;
  /** Sent as repeated `TagIds` (§1.6). */
  tagIds?: number[];
}

export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (p: BranchListParams) =>
    [...branchKeys.lists(), currentCulture(), p] as const,
  detail: (id: number) => [...branchKeys.all, 'detail', id] as const,
  slots: (id: number) => [...branchKeys.all, 'slots', id] as const,
  services: (id: number) =>
    [...branchKeys.all, 'services', id, currentCulture()] as const,
  vaccines: (id: number) =>
    [...branchKeys.all, 'vaccines', id, currentCulture()] as const,
};

/** Child lists of one branch are read whole: they are short and feed pickers. */
const WHOLE = { PageNumber: 1, PageSize: 1000 };

export const branchListQuery = (p: BranchListParams) =>
  queryOptions({
    queryKey: branchKeys.list(p),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Branch>>(BRANCH_PATHS.list, {
        signal,
        params: {
          PageNumber: p.pageNumber,
          PageSize: p.pageSize,
          ServiceProviderId: p.serviceProviderId,
          status: p.status,
          serviceProviderClassificationId: p.classificationId,
          countryId: p.countryId,
          cityId: p.cityId,
          TagIds: p.tagIds?.length ? p.tagIds : undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });

export const branchQuery = (id: number) =>
  queryOptions({
    queryKey: [...branchKeys.detail(id), currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<Branch>(BRANCH_PATHS.getById, { signal, params: { id } }),
  });

export const fetchSlots = (branchId: number, signal?: AbortSignal) =>
  apiGet<PagedResponse<Slot>>(SLOT_PATHS.list, {
    signal,
    params: { PageSize: 1000, ServiceProviderBranchId: branchId },
  }).then((page) => page?.data ?? []);

export const slotsQuery = (branchId: number) =>
  queryOptions({
    queryKey: branchKeys.slots(branchId),
    queryFn: ({ signal }) => fetchSlots(branchId, signal),
  });

export const branchServicesQuery = (branchId: number) =>
  queryOptions({
    queryKey: branchKeys.services(branchId),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<BranchService>>(BRANCH_SERVICE_PATHS.list, {
        signal,
        params: { ...WHOLE, ServiceProviderBranchId: branchId },
      }).then((page) => page?.data ?? []),
  });

export const branchVaccinesQuery = (branchId: number, enabled = true) =>
  queryOptions({
    queryKey: branchKeys.vaccines(branchId),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<BranchVaccine>>(BRANCH_VACCINE_PATHS.list, {
        signal,
        params: { ...WHOLE, ServiceProviderBranchId: branchId },
      }).then((page) => page?.data ?? []),
    enabled,
  });

// ── Mutations ───────────────────────────────────────────────────────────────

/** Create when `id` is 0/absent, otherwise update. */
export function useSaveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: number;
      body: Record<string, FormValue>;
    }) =>
      id
        ? apiPut<Branch>(BRANCH_PATHS.update, toFormData(body))
        : apiPost<Branch>(BRANCH_PATHS.create, toFormData(body)),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: branchKeys.lists() });
      if (id) void qc.invalidateQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(BRANCH_PATHS.delete, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.lists() }),
  });
}

export function useDeleteBranches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => deleteMany(BRANCH_PATHS.multipleDelete, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.lists() }),
  });
}

/** Invalidates everything the offerings of a branch feed. */
function useInvalidateOfferings(branchId: number) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: branchKeys.services(branchId) }),
      qc.invalidateQueries({ queryKey: branchKeys.vaccines(branchId) }),
      qc.invalidateQueries({ queryKey: branchKeys.slots(branchId) }),
    ]);
}

export function useSaveBranchService(branchId: number) {
  const invalidate = useInvalidateOfferings(branchId);
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: number;
      body: Record<string, FormValue>;
    }) =>
      id
        ? apiPut<BranchService>(BRANCH_SERVICE_PATHS.update, toFormData(body))
        : apiPost<BranchService>(BRANCH_SERVICE_PATHS.create, toFormData(body)),
    onSuccess: invalidate,
  });
}

export function useDeleteBranchService(branchId: number) {
  const invalidate = useInvalidateOfferings(branchId);
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(BRANCH_SERVICE_PATHS.delete, p),
    onSuccess: invalidate,
  });
}

export function useSaveBranchVaccine(branchId: number) {
  const invalidate = useInvalidateOfferings(branchId);
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: number;
      body: Record<string, FormValue>;
    }) =>
      id
        ? apiPut<BranchVaccine>(BRANCH_VACCINE_PATHS.update, toFormData(body))
        : apiPost<BranchVaccine>(BRANCH_VACCINE_PATHS.create, toFormData(body)),
    onSuccess: invalidate,
  });
}

export function useDeleteBranchVaccine(branchId: number) {
  const invalidate = useInvalidateOfferings(branchId);
  return useMutation({
    // Branch vaccines spell the flag `ForceDelete` (§1.5).
    mutationFn: (p: DeleteParams) =>
      deleteById(BRANCH_VACCINE_PATHS.delete, p, 'ForceDelete'),
    onSuccess: invalidate,
  });
}

/** Removes a whole weekday from the schedule (`…/Slot/Delete`). */
export function useDeleteSlot(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(SLOT_PATHS.delete, p),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: branchKeys.slots(branchId) }),
  });
}

/** Deletes a saved slot time immediately, without waiting for Save (§9.6). */
export function useDeleteSlotTime(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotTimeId: number) =>
      apiDelete<unknown>(SLOT_PATHS.deleteSlotTime, {
        params: { Id: slotTimeId, forceDelete: true },
      }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: branchKeys.slots(branchId) }),
        qc.invalidateQueries({ queryKey: branchKeys.vaccines(branchId) }),
      ]),
  });
}

/**
 * Saves the whole week (§9.5), then — when allowed — applies the vaccine
 * links (§9.7): refetch to resolve new slot-time ids, diff, and send every
 * add / remove call in parallel.
 */
export function useSaveSchedule(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      days,
      origin,
      linkVaccines,
    }: {
      days: EditorDay[];
      origin: ScheduleOrigin;
      linkVaccines: boolean;
    }) => {
      const ref = new Date();
      await apiPut<unknown>(
        SLOT_PATHS.set,
        toFormData(setSchedulePayload(days, origin, branchId, ref)),
      );
      if (!linkVaccines) return { unresolved: 0 };

      const saved = await fetchSlots(branchId);
      const changes = vaccineLinkChanges(days, origin, saved, ref);
      await Promise.all([
        ...[...changes.add].map(([vaccineId, slotTimeIds]) =>
          apiPost<unknown>(
            BRANCH_VACCINE_PATHS.addSlotTimes,
            toFormData({
              serviceProviderBranchVaccineId: vaccineId,
              slotTimeIds,
            }),
          ),
        ),
        ...changes.remove.map((linkId) =>
          apiDelete<unknown>(BRANCH_VACCINE_PATHS.deleteSlotTime, {
            params: { Id: linkId },
          }),
        ),
      ]);
      return { unresolved: changes.unresolved };
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: branchKeys.slots(branchId) }),
        qc.invalidateQueries({ queryKey: branchKeys.vaccines(branchId) }),
      ]),
  });
}
