/**
 * The stored session (auth doc §8.1): `{ token, expiration }` in
 * localStorage. Only the token lives here; the current user is in memory
 * (`session-store.ts`) and is re-fetched on every app start.
 */
export interface StoredAuth {
  token: string;
  /** ISO time after which the session is over. */
  expiration: string;
}

export const AUTH_STORAGE_KEY: string =
  import.meta.env.VITE_AUTH_LOCAL_STORAGE_KEY || 'sp-auth';

/** Client-chosen session lifetime (§8.1). */
export const SESSION_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

/** The JWT's own `exp` in ms, or `null` when the token can't be read. */
export function jwtExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Session end: 3 days from now, or the token's own expiry when that comes
 * first — the client-only 3 days could outlive the JWT (quirk 3).
 */
export function sessionExpiration(token: string, now = Date.now()): string {
  const jwt = jwtExpiry(token);
  const end = Math.min(now + SESSION_LIFETIME_MS, jwt ?? Infinity);
  return new Date(end).toISOString();
}

export const isExpired = (auth: StoredAuth, now = Date.now()): boolean => {
  const at = Date.parse(auth.expiration);
  return Number.isNaN(at) || now >= at;
};

function readStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw) as Partial<StoredAuth>;
    return auth.token && auth.expiration ? (auth as StoredAuth) : null;
  } catch {
    return null;
  }
}

let current: StoredAuth | null = readStorage();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

// Another tab signed in or out — follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY && event.key !== null) return;
    current = readStorage();
    emit();
  });
}

export const tokenStore = {
  get: (): StoredAuth | null => current,
  /** Saves a freshly verified token with its session expiry. */
  set(token: string) {
    current = { token, expiration: sessionExpiration(token) };
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Storage blocked: the session lives for this tab only.
    }
    emit();
  },
  clear() {
    current = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Nothing persisted.
    }
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
