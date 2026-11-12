import { useSyncExternalStore } from 'react';

/** `AuthTokenResponse` — the pair every sign-in, refresh and company switch returns. */
export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}

const STORAGE_KEY = 'sp-auth';

function readStorage(): TokenPair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const pair = JSON.parse(raw) as Partial<TokenPair>;
    return pair.accessToken && pair.refreshToken ? (pair as TokenPair) : null;
  } catch {
    return null;
  }
}

let current: TokenPair | null = readStorage();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

// Another tab rotated the pair or signed out — follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    current = readStorage();
    emit();
  });
}

export const tokenStore = {
  get: (): TokenPair | null => current,
  /** Re-reads storage: another tab may have rotated the pair since `get()`. */
  readLatest: (): TokenPair | null => {
    current = readStorage();
    return current;
  },
  set(pair: TokenPair) {
    current = pair;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
    } catch {
      // Storage blocked: the session lives for this tab only.
    }
    emit();
  },
  clear() {
    current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
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

const hasTokens = () => current !== null;

export function useHasTokens(): boolean {
  return useSyncExternalStore(tokenStore.subscribe, hasTokens, hasTokens);
}

/** True when `isoUtc` is in the past or within `skewMs` of now. */
export function isExpiring(isoUtc: string, skewMs = 30_000): boolean {
  const at = Date.parse(isoUtc);
  return Number.isNaN(at) || at - Date.now() <= skewMs;
}
