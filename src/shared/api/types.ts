import type { ActionOutcome } from '@/shared/api/enums';

/** `Domain.Shared.Error` — the body of every HTTP 600, also nested in `Result.error`. */
export interface ApiErrorBody {
  code?: string | null;
  message?: string | null;
  actionCode?: ActionOutcome | null;
  data?: Record<string, unknown> | null;
}

/** `Domain.Shared.Result<T>` — every HTTP 200 envelope; the payload is `value`. */
export interface Result<T> {
  isSuccess: boolean;
  isFailure: boolean;
  error?: ApiErrorBody | null;
  actionCode?: ActionOutcome | null;
  value: T;
}

/** `Domain.Shared.PagedResponse<T>`. */
export interface PagedResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface PageParams {
  pageNumber: number;
  pageSize: number;
}

/** A lookup item: an id and its name in the request language. */
export interface LookupItem {
  id: number;
  name: string | null;
}
