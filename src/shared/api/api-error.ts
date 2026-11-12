import axios from 'axios';
import { ActionOutcome } from '@/shared/api/enums';
import type { ApiErrorBody } from '@/shared/api/types';
import i18n from '@/shared/i18n';

export type ApiErrorKind = 'api' | 'network' | 'canceled';

/** One error shape for every failed request, whatever the backend sent. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly actionCode: number | null;
  readonly data: Record<string, unknown> | null;

  constructor(init: {
    kind: ApiErrorKind;
    status?: number | null;
    message?: string | null;
    code?: string | null;
    actionCode?: number | null;
    data?: Record<string, unknown> | null;
  }) {
    super(init.message ?? '');
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.actionCode = init.actionCode ?? null;
    this.data = init.data ?? null;
  }

  get isForbidden() {
    return this.actionCode === ActionOutcome.Forbidden || this.status === 403;
  }

  get isNotFound() {
    return this.actionCode === ActionOutcome.NotFound || this.status === 404;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads a bare `Error` body or a `Result` whose `isFailure` is set. */
export function errorBodyOf(payload: unknown): ApiErrorBody | null {
  if (!isRecord(payload)) return null;
  if (payload.isFailure === true && isRecord(payload.error)) {
    return {
      actionCode: payload.actionCode as ApiErrorBody['actionCode'],
      ...payload.error,
    };
  }
  // A 600 can carry only an `actionCode` (e.g. "user already exists").
  if (
    'code' in payload ||
    'message' in payload ||
    ('actionCode' in payload && !('value' in payload))
  ) {
    return payload as ApiErrorBody;
  }
  return null;
}

export function fromErrorBody(
  body: ApiErrorBody,
  status: number | null,
): ApiError {
  return new ApiError({
    kind: 'api',
    status,
    code: body.code,
    message: body.message,
    actionCode: body.actionCode,
    data: body.data,
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error)) return new ApiError({ kind: 'canceled' });
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({ kind: 'network', message: error.message });
    }
    const body = errorBodyOf(error.response.data);
    if (body) return fromErrorBody(body, error.response.status);
    return new ApiError({ kind: 'api', status: error.response.status });
  }
  return new ApiError({
    kind: 'api',
    message: error instanceof Error ? error.message : null,
  });
}

/** The backend's localized message, or a generic one when it sent none. */
export function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  // HTTP 600 is the business-error channel: its message is shown as-is (§1.4).
  if (apiError.message) return apiError.message;
  if (apiError.kind === 'network') return i18n.t('common.networkError');
  const byStatus: Record<number, string> = {
    400: 'common.badRequest',
    401: 'common.unauthorized',
    403: 'common.forbidden',
    404: 'common.notFoundError',
    500: 'common.serverError',
  };
  const key = apiError.status ? byStatus[apiError.status] : undefined;
  return i18n.t(key ?? 'common.error');
}
