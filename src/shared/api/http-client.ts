import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  ApiError,
  errorBodyOf,
  fromErrorBody,
  toApiError,
} from '@/shared/api/api-error';
import { cleanParams, type QueryParamValue } from '@/shared/api/params';
import { endSession } from '@/shared/api/session';
import {
  isExpiring,
  tokenStore,
  type TokenPair,
} from '@/shared/api/token-store';
import type { Result } from '@/shared/api/types';
import i18n from '@/shared/i18n';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Sent without a bearer and never refreshed (sign-in, refresh itself). */
    authless?: boolean;
    /** Set once the request was replayed after a refresh. */
    retried?: boolean;
  }
}

/**
 * Optional prefix every endpoint path is relative to (e.g. `ServiceProvider`),
 * under the configured base URL. Set `VITE_API_ROOT` in `.env`.
 */
export const API_ROOT: string = import.meta.env.VITE_API_ROOT ?? '';

/** Prefixes a relative endpoint path with `API_ROOT`. */
export const resolvePath = (path: string) =>
  !API_ROOT || path.startsWith(`${API_ROOT}/`) ? path : `${API_ROOT}/${path}`;

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL && import.meta.env.MODE !== 'test') {
  throw new Error(
    'VITE_API_BASE_URL is not set — copy .env.example to .env and fill it in.',
  );
}

export const http = axios.create({
  baseURL: baseURL ?? '',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  // HTTP 600 is the API's failure status: reject so the body reaches toApiError.
  validateStatus: (status) => status >= 200 && status < 300,
});

// ── Refresh: one in flight per tab, one at a time across tabs ──────────────

let inflight: Promise<TokenPair> | null = null;

async function withCrossTabLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('sp-token-refresh', run);
  }
  return run();
}

function latestOrEnd(): TokenPair {
  const latest = tokenStore.readLatest();
  if (!latest) {
    endSession();
    throw new ApiError({ kind: 'api', status: 401 });
  }
  return latest;
}

/** Must run inside the lock: the presented refresh token is revoked. */
async function refreshUnlocked(latest: TokenPair): Promise<TokenPair> {
  try {
    const { data } = await http.post<Result<TokenPair>>(
      resolvePath('Auth/RefreshToken'),
      { refreshToken: latest.refreshToken },
      { authless: true },
    );
    const pair = unwrap(data);
    tokenStore.set(pair);
    return pair;
  } catch (error) {
    const apiError = toApiError(error);
    // A rejected refresh token ends the session; a dropped connection does not.
    if (apiError.kind === 'api') endSession();
    throw apiError;
  }
}

async function exchange(staleAccessToken: string | null): Promise<TokenPair> {
  return withCrossTabLock(async () => {
    const latest = latestOrEnd();
    // Another tab (or an earlier refresh here) already rotated the pair.
    if (
      latest.accessToken !== staleAccessToken &&
      !isExpiring(latest.accessTokenExpiresAtUtc)
    ) {
      return latest;
    }
    return refreshUnlocked(latest);
  });
}

/**
 * Runs an operation that spends the refresh token (switch company, logout)
 * under the same lock as refresh, with a fresh pair. Send its request with
 * `authless` + `bearer` so the interceptor doesn't try to refresh inside it.
 */
export function withTokenLock<T>(run: (pair: TokenPair) => Promise<T>) {
  return withCrossTabLock(async () => {
    let pair = latestOrEnd();
    if (isExpiring(pair.accessTokenExpiresAtUtc)) {
      pair = await refreshUnlocked(pair);
    }
    return run(pair);
  });
}

/** Rotates the pair. Concurrent callers share one refresh request. */
export function refreshTokens(staleAccessToken: string | null) {
  inflight ??= exchange(staleAccessToken).finally(() => {
    inflight = null;
  });
  return inflight;
}

const bearerOf = (config: InternalAxiosRequestConfig): string | null => {
  const header = config.headers.get('Authorization');
  return typeof header === 'string' ? header.replace(/^Bearer /, '') : null;
};

http.interceptors.request.use(async (config) => {
  config.headers.set('Accept-Language', i18n.language === 'en' ? 'en' : 'ar');
  if (config.authless) return config;
  let pair = tokenStore.get();
  if (pair && isExpiring(pair.accessTokenExpiresAtUtc)) {
    pair = await refreshTokens(pair.accessToken);
  }
  if (pair) config.headers.set('Authorization', `Bearer ${pair.accessToken}`);
  return config;
});

http.interceptors.response.use(undefined, async (error: unknown) => {
  // Only an HTTP 401 means the access token was refused. An HTTP 600 is a
  // business failure and is never retried.
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config &&
    !error.config.authless
  ) {
    if (error.config.retried || !tokenStore.get()) {
      endSession();
      throw toApiError(error);
    }
    await refreshTokens(bearerOf(error.config));
    return http.request({ ...error.config, retried: true });
  }
  throw toApiError(error);
});

// ── Typed helpers ──────────────────────────────────────────────────────────

/** The payload of a `Result<T>`; a `Result` with `isFailure` throws. */
export function unwrap<T>(result: Result<T>): T {
  const body = result.isFailure ? errorBodyOf(result) : null;
  if (body) throw fromErrorBody(body, 200);
  return result.value;
}

interface RequestOptions {
  params?: Record<string, QueryParamValue>;
  signal?: AbortSignal;
  authless?: boolean;
  /** An explicit access token, for requests sent inside `withTokenLock`. */
  bearer?: string;
}

const configOf = ({
  params,
  signal,
  authless,
  bearer,
}: RequestOptions = {}) => ({
  params: cleanParams(params),
  signal,
  authless: authless || bearer !== undefined,
  headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
});

export async function apiGet<T>(path: string, options?: RequestOptions) {
  const { data } = await http.get<Result<T>>(
    resolvePath(path),
    configOf(options),
  );
  return unwrap(data);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
) {
  const { data } = await http.post<Result<T>>(
    resolvePath(path),
    body,
    configOf(options),
  );
  return unwrap(data);
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
) {
  const { data } = await http.put<Result<T>>(
    resolvePath(path),
    body,
    configOf(options),
  );
  return unwrap(data);
}

export async function apiDelete<T>(path: string, options?: RequestOptions) {
  const { data } = await http.delete<Result<T>>(
    resolvePath(path),
    configOf(options),
  );
  return unwrap(data);
}

/**
 * Fetches a file endpoint as a Blob. A failure (HTTP 600) arrives as a JSON
 * error inside a Blob, so it is accepted here and read back into an `ApiError`.
 */
export async function apiBlob(path: string, options?: RequestOptions) {
  const res = await http.get<Blob>(resolvePath(path), {
    ...configOf(options),
    responseType: 'blob',
    validateStatus: (s) => s === 200 || s === 600,
  });
  if (res.status === 600 || res.data.type.includes('json')) {
    const payload: unknown = JSON.parse(await res.data.text());
    const body = errorBodyOf(payload);
    if (body) throw fromErrorBody(body, res.status);
    unwrap(payload as Result<unknown>);
  }
  return res.data;
}

/** Downloads a file endpoint (e.g. a CSV export) and saves it in the browser. */
export async function apiDownload(
  path: string,
  fileName: string,
  options?: RequestOptions,
) {
  const blob = await apiBlob(path, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Opens a file endpoint inline in a new tab (it needs the bearer, so no plain link). */
export async function apiOpen(path: string, options?: RequestOptions) {
  // Opened first, synchronously, so popup blockers allow it.
  const tab = window.open('', '_blank');
  try {
    const blob = await apiBlob(path, options);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    // The tab has loaded it by then; free the memory later.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
