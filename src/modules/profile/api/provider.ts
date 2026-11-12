import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { deleteById, deleteMany, type DeleteParams } from '@/shared/api/delete';
import type { AttachmentCategory } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import type {
  ProviderAttachment,
  ServiceProvider,
} from '@/modules/profile/api/types';
import {
  providerPayload,
  type ProviderFormValues,
} from '@/modules/profile/lib/provider-payload';

const BASE = 'Provider/ServiceProvider';

/** Provider list filters (doc §6.1). */
export interface ProviderListParams {
  pageNumber: number;
  pageSize: number;
  status?: boolean;
  categoryId?: number;
  isAvailable?: boolean;
  tagIds?: number[];
  serviceTypeId?: number;
  classificationId?: number;
  search?: string;
}

export const providerKeys = {
  all: ['providers'] as const,
  lists: () => [...providerKeys.all, 'list'] as const,
  list: (p: ProviderListParams) =>
    [...providerKeys.lists(), currentCulture(), p] as const,
  detail: (id: number) => [...providerKeys.all, 'detail', id] as const,
  attachments: (id: number) =>
    [...providerKeys.all, 'attachments', id] as const,
};

export const providerListQuery = (p: ProviderListParams) =>
  queryOptions({
    queryKey: providerKeys.list(p),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<ServiceProvider>>(`${BASE}/List?`, {
        signal,
        params: {
          PageNumber: p.pageNumber,
          PageSize: p.pageSize,
          status: p.status,
          CategoryId: p.categoryId,
          isAvailable: p.isAvailable,
          TagIds: p.tagIds,
          ServiceTypeId: p.serviceTypeId,
          ServiceProviderClassificationId: p.classificationId,
          Search: p.search,
        },
      }),
    placeholderData: keepPreviousData,
  });

export const providerQuery = (id: number) =>
  queryOptions({
    queryKey: [...providerKeys.detail(id), currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<ServiceProvider>(`${BASE}/GetById`, { signal, params: { id } }),
  });

/** Create when `provider` is absent, otherwise update (§6.3, §6.4). */
export function useSaveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      values,
      provider,
    }: {
      values: ProviderFormValues;
      provider?: ServiceProvider;
    }) => {
      const body = toFormData(providerPayload(values, provider));
      return provider
        ? apiPut<ServiceProvider>(`${BASE}/Update`, body)
        : apiPost<ServiceProvider>(`${BASE}/Create`, body);
    },
    onSuccess: (saved, { provider }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: providerKeys.lists() }),
        provider &&
          qc.invalidateQueries({ queryKey: providerKeys.detail(provider.id) }),
        // Create uploads the four file lists as attachments (§6.5).
        !provider &&
          saved &&
          qc.invalidateQueries({
            queryKey: providerKeys.attachments(saved.id),
          }),
      ]),
  });
}

/**
 * Standard two-step delete (§1.5). The old client forced on the first call;
 * that is not copied (§6.7, §18.1).
 */
export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(`${BASE}/Delete`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: providerKeys.lists() }),
  });
}

/** Defined by the backend; the old client never called it. */
export function useDeleteProviders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => deleteMany(`${BASE}/MultipleDelete`, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: providerKeys.lists() }),
  });
}

/**
 * Deletes the icon or the legacy attachment (§6.6): form-data in the DELETE
 * body, one flag per call. Confirm with the user first.
 */
export function useDeleteProviderImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, which }: { id: number; which: 'icon' | 'attachment' }) =>
      apiDelete<unknown>(`${BASE}/DeleteImage/DeleteImage?`, {
        body: toFormData({
          Id: id,
          IsDeletedIcon: which === 'icon',
          IsDeletedAttachment: which === 'attachment',
        }),
      }),
    onSuccess: (_d, { id }) =>
      qc.invalidateQueries({ queryKey: providerKeys.detail(id) }),
  });
}

// ── Attachments (§7) ────────────────────────────────────────────────────────

/** All four categories when `category` is omitted; `null` → `[]`. */
export const providerAttachmentsQuery = (
  serviceProviderId: number,
  category?: AttachmentCategory,
) =>
  queryOptions({
    queryKey: [
      ...providerKeys.attachments(serviceProviderId),
      category ?? 'all',
    ],
    queryFn: ({ signal }) =>
      apiGet<ProviderAttachment[] | null>(`${BASE}/ListAttachments`, {
        signal,
        params: { serviceProviderId, category },
      }).then((list) => list ?? []),
  });

/** Groups a mixed attachment list by its category folder. */
export function groupAttachments(list: readonly ProviderAttachment[]) {
  const groups = new Map<AttachmentCategory, ProviderAttachment[]>();
  for (const a of list)
    groups.set(a.category, [...(groups.get(a.category) ?? []), a]);
  return groups;
}

/** Uploads several files into one category; zero files is a no-op (§7.3). */
export function useUploadProviderAttachments(serviceProviderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      category,
      files,
    }: {
      category: AttachmentCategory;
      files: File[];
    }) => {
      if (files.length === 0) return [];
      return apiPost<ProviderAttachment[]>(
        `${BASE}/UploadAttachment`,
        toFormData({ files }),
        { params: { serviceProviderId, category } },
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: providerKeys.attachments(serviceProviderId),
      }),
  });
}

/** Confirm first, naming `originalFileName` (§7.3). */
export function useDeleteProviderAttachment(serviceProviderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      apiDelete<number>(`${BASE}/DeleteAttachment`, {
        params: { id: attachmentId },
      }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: providerKeys.attachments(serviceProviderId),
      }),
  });
}
