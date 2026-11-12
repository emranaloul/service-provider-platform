import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { deleteById, type DeleteParams } from '@/shared/api/delete';
import { toFormData } from '@/shared/api/form-data';
import { apiGet, apiPost, apiPut } from '@/shared/api/http-client';
import { lookupKeys } from '@/shared/api/lookups';
import type { PagedResponse } from '@/shared/api/types';

/**
 * Provider tags (missing items §3): `General/Tags` with `ServiceProviderId`.
 * Not translated. These are the tags the provider and branch forms pick
 * (`Tags[i].tagsId`) and the branch list filters by (`TagIds`).
 */
const BASE = 'General/Tags';

export interface ProviderTag {
  id: number;
  name: string;
  type: number;
  serviceProviderId: number | string | null;
  companyId: number | null;
}

export const tagKeys = {
  all: ['providerTags'] as const,
  list: (providerId: number, page: number, pageSize: number) =>
    [...tagKeys.all, providerId, page, pageSize] as const,
};

export const providerTagsQuery = (
  serviceProviderId: number,
  pageNumber = 1,
  pageSize = 10,
) =>
  queryOptions({
    queryKey: tagKeys.list(serviceProviderId, pageNumber, pageSize),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<ProviderTag>>(`${BASE}/List?`, {
        signal,
        params: { pageNumber, pageSize, ServiceProviderId: serviceProviderId },
      }),
    placeholderData: keepPreviousData,
  });

/** One tag (Missing Items §3: `General/Tags/GetById?Id=`). */
export const providerTagQuery = (id: number) =>
  queryOptions({
    queryKey: [...tagKeys.all, 'detail', id] as const,
    queryFn: ({ signal }) =>
      apiGet<ProviderTag>(`${BASE}/GetById`, { signal, params: { Id: id } }),
    enabled: id > 0,
  });

function useInvalidateTags() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: tagKeys.all }),
      // The tag pickers in the provider / branch forms.
      qc.invalidateQueries({ queryKey: lookupKeys.all }),
    ]);
}

/** Create (no `tag`) or rename. A tag belongs to a provider OR a company. */
export function useSaveProviderTag(serviceProviderId: number) {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: ({ name, tag }: { name: string; tag?: ProviderTag }) => {
      const body = toFormData({
        id: tag?.id ?? 0,
        Name: name.trim(),
        ServiceProviderId: serviceProviderId,
      });
      return tag
        ? apiPut<ProviderTag>(`${BASE}/Update`, body)
        : apiPost<ProviderTag>(`${BASE}/Create`, body);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProviderTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(`${BASE}/Delete`, p),
    onSuccess: invalidate,
  });
}
