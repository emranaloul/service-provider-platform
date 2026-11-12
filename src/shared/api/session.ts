import { tokenStore } from '@/shared/api/token-store';
import { queryClient } from '@/shared/lib/query-client';
import { useSessionStore } from '@/shared/session/session-store';

/** Set across the reload so the login page can say why the user is there. */
export const SESSION_EXPIRED_FLAG = 'sp-session-expired';

/**
 * Ends the session locally (auth doc §8.5): token, current user and every
 * cached response go. There is no logout endpoint.
 */
export function endSession() {
  tokenStore.clear();
  useSessionStore.getState().signOut();
  queryClient.clear();
}

/** Ends the session, then reloads the app on the login page (§8.5). */
export function logout({ expired = false }: { expired?: boolean } = {}) {
  endSession();
  if (expired) {
    try {
      sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
    } catch {
      // The message is a nicety; the logout itself already happened.
    }
  }
  window.location.assign('/auth/login');
}

/** Reads and clears the "your session expired" flag. */
export function takeSessionExpiredFlag(): boolean {
  try {
    const set = sessionStorage.getItem(SESSION_EXPIRED_FLAG) === '1';
    sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
    return set;
  } catch {
    return false;
  }
}
