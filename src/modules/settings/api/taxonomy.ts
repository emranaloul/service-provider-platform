import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { deleteById, deleteMany, type DeleteParams } from '@/shared/api/delete';
import { LangId } from '@/shared/api/enums';
import { toFormData, type FormValue } from '@/shared/api/form-data';
import {
  apiGet,
  apiPost,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import { lookupKeys } from '@/shared/api/lookups';
import { translationsPayload } from '@/shared/api/payload';
import type { PagedResponse } from '@/shared/api/types';

/**
 * Service Provider Category (doc §4) and Classification (§5): identical
 * lookups apart from the base path (the classification path keeps the
 * backend's `Classfication` typo) and the translation FK key.
 */
export type TaxonomyKind = 'category' | 'classification';

const BASE: Record<TaxonomyKind, string> = {
  category: 'Provider/ServiceProviderCategory',
  classification: 'Provider/ServiceProviderClassfication',
};
const FK: Record<TaxonomyKind, string> = {
  category: 'ServiceProviderCategoryID',
  classification: 'ServiceProviderClassificationID',
};

export interface TaxonomyTranslation {
  id: number;
  langId: number;
  name: string;
  description: string;
}

export interface TaxonomyItem {
  id: number;
  /** Ordering; lower first. Default for new records: 100. */
  rank: number;
  status: boolean;
  translations: TaxonomyTranslation[] | null;
}

export interface TaxonomyListParams {
  pageNumber: number;
  pageSize: number;
  status?: boolean;
  rank?: number;
}

export interface TaxonomyFormValues {
  rank: number;
  status: boolean;
  nameEn: string;
  descriptionEn: string;
  nameAr: string;
  descriptionAr: string;
}

export const DEFAULT_RANK = 100;

/**
 * §4.5: English name required; another language's name becomes required
 * when its description is filled. Returns the fields in error.
 */
export function taxonomyErrors(
  v: TaxonomyFormValues,
): (keyof TaxonomyFormValues)[] {
  const errors: (keyof TaxonomyFormValues)[] = [];
  if (!v.nameEn.trim()) errors.push('nameEn');
  if (v.descriptionAr.trim() && !v.nameAr.trim()) errors.push('nameAr');
  if (!Number.isFinite(v.rank)) errors.push('rank');
  return errors;
}

/** Create (§4.3) or update (§4.4) body. */
export function taxonomyPayload(
  kind: TaxonomyKind,
  v: TaxonomyFormValues,
  existing?: TaxonomyItem,
): Record<string, FormValue> {
  return {
    ...(existing ? { Id: existing.id } : {}),
    Rank: v.rank,
    Status: v.status,
    Translations: translationsPayload(
      [
        {
          langId: LangId.En,
          fields: { Name: v.nameEn, Description: v.descriptionEn },
        },
        {
          langId: LangId.Ar,
          fields: { Name: v.nameAr, Description: v.descriptionAr },
        },
      ],
      'Name',
      existing
        ? {
            existing: existing.translations ?? [],
            parentKey: FK[kind],
            parentId: existing.id,
          }
        : undefined,
    ),
  };
}

export const taxonomyKeys = {
  all: (kind: TaxonomyKind) => ['taxonomy', kind] as const,
  list: (kind: TaxonomyKind, p: TaxonomyListParams) =>
    [...taxonomyKeys.all(kind), 'list', currentCulture(), p] as const,
  detail: (kind: TaxonomyKind, id: number) =>
    [...taxonomyKeys.all(kind), 'detail', id] as const,
};

export const taxonomyListQuery = (kind: TaxonomyKind, p: TaxonomyListParams) =>
  queryOptions({
    queryKey: taxonomyKeys.list(kind, p),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<TaxonomyItem>>(`${BASE[kind]}/List?`, {
        signal,
        params: {
          pageNumber: p.pageNumber,
          pageSize: p.pageSize,
          status: p.status,
          rank: p.rank,
        },
      }),
    placeholderData: keepPreviousData,
  });

export const taxonomyQuery = (kind: TaxonomyKind, id: number) =>
  queryOptions({
    queryKey: taxonomyKeys.detail(kind, id),
    queryFn: ({ signal }) =>
      apiGet<TaxonomyItem>(`${BASE[kind]}/GetById`, {
        signal,
        params: { id },
      }),
  });

function useInvalidate(kind: TaxonomyKind) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: taxonomyKeys.all(kind) }),
      // The pickers (e.g. classifications in the branch form) read these too.
      qc.invalidateQueries({ queryKey: lookupKeys.all }),
    ]);
}

export function useSaveTaxonomy(kind: TaxonomyKind) {
  const invalidate = useInvalidate(kind);
  return useMutation({
    mutationFn: ({
      values,
      existing,
    }: {
      values: TaxonomyFormValues;
      existing?: TaxonomyItem;
    }) => {
      const body = toFormData(taxonomyPayload(kind, values, existing));
      return existing
        ? apiPut<TaxonomyItem>(`${BASE[kind]}/Update`, body)
        : apiPost<TaxonomyItem>(`${BASE[kind]}/Create`, body);
    },
    onSuccess: invalidate,
  });
}

/** Standard two-step delete (§1.5). */
export function useDeleteTaxonomy(kind: TaxonomyKind) {
  const invalidate = useInvalidate(kind);
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(`${BASE[kind]}/Delete`, p),
    onSuccess: invalidate,
  });
}

export function useDeleteTaxonomies(kind: TaxonomyKind) {
  const invalidate = useInvalidate(kind);
  return useMutation({
    mutationFn: (ids: number[]) =>
      deleteMany(`${BASE[kind]}/MultipleDelete`, ids),
    onSuccess: invalidate,
  });
}
