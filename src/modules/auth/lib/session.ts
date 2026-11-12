import { endSession, SESSION_EXPIRED_FLAG } from '@/shared/api/session';
import { isExpired, tokenStore } from '@/shared/api/token-store';
import { useSessionStore } from '@/shared/session/session-store';
import { getUserByToken } from '@/modules/auth/api/auth';

/** Log out after this long without mouse, key or click activity (§8.4). */
export const INACTIVITY_MS = 120 * 60 * 1000;

/** Loads the user behind the stored token and marks the session signed in. */
export async function loadCurrentUser() {
  const model = await getUserByToken();
  useSessionStore.getState().signIn(model);
  return model;
}

let restoring: Promise<void> | null = null;

/**
 * App start (§8.2): a stored token is turned back into a current user, and
 * any failure — expired, revoked, offline — ends the session. Runs once even
 * under StrictMode's double effects.
 */
export function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    const auth = tokenStore.get();
    if (!auth) return endSession();
    if (isExpired(auth)) {
      endSession();
      try {
        sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
      } catch {
        // Only the message is lost.
      }
      return;
    }
    try {
      await loadCurrentUser();
    } catch {
      endSession();
    }
  })();
  return restoring;
}
