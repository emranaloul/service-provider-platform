import { apiDelete } from '@/shared/api/http-client';

/** A `Delete` answer meaning "this record has dependents — confirm again" (§1.5). */
export const HAS_DEPENDENTS = -1;

export type DeleteResult = number | boolean;

export interface DeleteParams {
  /** Numeric for most entities; users have string ids. */
  id: number | string;
  /** Second call of the two-step protocol, after the user re-confirmed. */
  forceDelete?: boolean;
}

/**
 * `DELETE {path}?Id={id}[&forceDelete=true]`. The first call never forces;
 * `HAS_DEPENDENTS` asks the caller to confirm and call again with
 * `forceDelete`. Branch vaccines spell the key `ForceDelete` (`forceKey`).
 */
export function deleteById(
  path: string,
  { id, forceDelete }: DeleteParams,
  forceKey = 'forceDelete',
) {
  return apiDelete<DeleteResult>(path, {
    params: { Id: id, [forceKey]: forceDelete ? true : undefined },
  });
}

/** `MultipleDelete`: a JSON id array as the DELETE body. */
export function deleteMany(path: string, ids: readonly number[]) {
  return apiDelete<DeleteResult>(path, { body: ids });
}
