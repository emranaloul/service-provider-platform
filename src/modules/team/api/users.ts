import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError, toApiError } from '@/shared/api/api-error';
import { deleteById, type DeleteParams } from '@/shared/api/delete';
import { UserType } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import {
  apiGet,
  apiPost,
  apiPut,
  currentCulture,
} from '@/shared/api/http-client';
import type { Option } from '@/shared/api/lookups';
import type { PagedResponse } from '@/shared/api/types';
import type { ProviderUser } from '@/modules/team/api/types';
import {
  userPayload,
  type UserFormValues,
} from '@/modules/team/lib/user-payload';

/** Provider users (missing items §2), in the `Authenticate` service. */
const BASE = 'Authenticate/User';

/** The Provider role family for the role picker (§2.1). */
export const PROVIDER_ROLE_FAMILY = 'd9d25d30-d45e-441f-9ac2-59a76cbba655';

export interface UserListParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
}

export const userKeys = {
  all: ['providerUsers'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (p: UserListParams, providerId: number | null) =>
    [...userKeys.lists(), currentCulture(), providerId, p] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  roles: () => [...userKeys.all, 'roles', currentCulture()] as const,
};

/**
 * §2.2: `GroupId=3`, newest first. `ServiceProviderId` only when an admin
 * views a provider's users — provider users are scoped by their token.
 */
export const userListQuery = (
  p: UserListParams,
  viewer: UserType | null,
  serviceProviderId: number | null,
) =>
  queryOptions({
    queryKey: userKeys.list(
      p,
      viewer === UserType.Admin ? serviceProviderId : null,
    ),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<ProviderUser>>(`${BASE}/List?`, {
        signal,
        params: {
          pageNumber: p.pageNumber,
          pageSize: p.pageSize,
          search: p.search,
          GroupId: UserType.Provider,
          ServiceProviderId:
            viewer === UserType.Admin
              ? (serviceProviderId ?? undefined)
              : undefined,
          Orderby: 'CreatedOn',
          orderDirection: false,
        },
      }),
    placeholderData: keepPreviousData,
  });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: [...userKeys.detail(id), currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<ProviderUser>(`${BASE}/GetUserById`, {
        signal,
        params: { userId: id },
      }),
  });

export const providerRolesQuery = () =>
  queryOptions({
    queryKey: userKeys.roles(),
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<{ id: number; name: string }>>(
        'General/Role/List?',
        {
          signal,
          params: { AspNetRoleId: PROVIDER_ROLE_FAMILY, PageSize: 1000 },
        },
      ).then((page): Option[] =>
        (page?.data ?? []).map((r) => ({ id: r.id, name: r.name })),
      ),
    staleTime: 10 * 60_000,
  });

/**
 * "User already exists" (§2.4): a `600` carrying an `actionCode` and no
 * message. Ask to add the existing account, then retry with `forceAdd`.
 */
export function isUserExistsError(error: unknown): boolean {
  const e = error instanceof ApiError ? error : toApiError(error);
  return e.kind === 'api' && e.actionCode !== null && !e.message;
}

export function useSaveUser(serviceProviderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      values,
      user,
      forceAdd = false,
    }: {
      values: UserFormValues;
      user?: ProviderUser;
      forceAdd?: boolean;
    }): Promise<ProviderUser | number> => {
      const body = toFormData(
        userPayload(values, serviceProviderId, user, forceAdd),
      );
      return user
        ? apiPut<ProviderUser>(`${BASE}/Update`, body)
        : apiPost<number>(`${BASE}/Create`, body);
    },
    // The "exists" answer is handled by the form, not toasted.
    meta: { silentError: true },
    onSuccess: (_d, { user }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: userKeys.lists() }),
        user && qc.invalidateQueries({ queryKey: userKeys.detail(user.id) }),
      ]),
  });
}

/** Two-step delete (§1.5). User ids are strings. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: DeleteParams) => deleteById(`${BASE}/Delete`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  });
}

export function useResendSetPasswordLink() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiPost<string>(`${BASE}/ResendSetPasswordLink`, undefined, {
        params: { userId },
      }),
  });
}

/** Result of a bulk import: some rows can fail while others succeed. */
export interface UserImportResult {
  successCount: number;
  errors: string[];
}

/**
 * Bulk import of provider users from a spreadsheet (Missing Items §12.4).
 * The endpoint is misnamed `ServiceProviderUserExport`.
 * TODO(backend): the field is `ServiceProviderBranchId`, but the working
 * client fills it with the PROVIDER id on this screen. The portal does the
 * same until the backend confirms which id it expects.
 */
export function useImportUsers(serviceProviderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      apiPost<UserImportResult>(
        `${BASE}/ServiceProviderUserExport`,
        toFormData({ File: file, ServiceProviderBranchId: serviceProviderId }),
      ).then((r) => ({
        successCount: r?.successCount ?? 0,
        errors: r?.errors ?? [],
      })),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  });
}

// The branch picker (§2.6) lists the provider's branches with
// `branchListQuery({ serviceProviderId, … })` from the branches module.
