import axios from 'axios';
import {
  ApiError,
  errorBodyOf,
  fromErrorBody,
  toApiError,
} from '@/shared/api/api-error';
import { cleanParams, type QueryParamValue } from '@/shared/api/params';
import { endSession, logout } from '@/shared/api/session';
import { isExpired, tokenStore } from '@/shared/api/token-store';
import type { Result } from '@/shared/api/types';
import i18n from '@/shared/i18n';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Sent without the stored session token and skips the expiry check:
     * sign-in, OTP, or a request carrying its own `bearer`.
     */
    authless?: boolean;
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
  // No default Content-Type: axios sets JSON for plain objects/arrays and lets
  // the browser set the multipart boundary for FormData. A JSON default would
  // make axios serialise every FormData body (all create/update calls) to JSON.
  headers: { Accept: 'application/json' },
  // Arrays as repeated keys: `TagIds=3&TagIds=7`, not `TagIds[]=3` (§1.6).
  paramsSerializer: { indexes: null },
  // HTTP 600 is the API's failure status: reject so the body reaches toApiError.
  validateStatus: (status) => status >= 200 && status < 300,
});

/** The UI language the backend localises names into (`culture` query param). */
export const currentCulture = (): 'en' | 'ar' =>
  i18n.language === 'en' ? 'en' : 'ar';

http.interceptors.request.use((config) => {
  const culture = currentCulture();
  config.headers.set('Accept-Language', culture);
  // Every request carries `culture` (doc §1.1).
  config.params = { ...(config.params as object | undefined), culture };
  if (config.authless) return config;

  const auth = tokenStore.get();
  // An expired session logs out and the request is never sent (auth §8.3).
  if (auth && isExpired(auth)) {
    logout({ expired: true });
    throw new ApiError({ kind: 'canceled' });
  }
  if (auth) config.headers.set('Authorization', `Bearer ${auth.token}`);
  return config;
});

http.interceptors.response.use(undefined, (error: unknown) => {
  // A 401 on a request sent with the session token means the token is no
  // longer accepted: there is no refresh, so the session ends (auth §6). A
  // 401 on sign-in / OTP is just "invalid credentials" and is left alone.
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    !error.config?.authless &&
    tokenStore.get()
  ) {
    endSession();
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
  /**
   * An explicit token instead of the session's, e.g. the in-memory OTP token
   * of the forgot-password flow (auth §7.3).
   */
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

/**
 * `body` goes in the DELETE request body: a JSON id array for `MultipleDelete`,
 * or a `FormData` (e.g. the provider `DeleteImage` flags).
 */
export async function apiDelete<T>(
  path: string,
  options?: RequestOptions & { body?: unknown },
) {
  const { data } = await http.delete<Result<T>>(resolvePath(path), {
    ...configOf(options),
    data: options?.body,
  });
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
