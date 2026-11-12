import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { endSession, logout } from '@/shared/api/session';
import { isExpired, tokenStore } from '@/shared/api/token-store';
import { useSessionStore } from '@/shared/session/session-store';
import { INACTIVITY_MS, restoreSession } from '@/modules/auth/lib/session';

/** Splash while the stored session is restored (§8.2). */
function Splash() {
  const { t } = useTranslation();
  return (
    <div
      aria-busy
      className='bg-canvas grid min-h-dvh place-items-center'
      role='status'
    >
      <span
        aria-hidden
        className='hd bg-brand text-on-brand grid size-14 animate-pulse place-items-center rounded-xl text-2xl font-bold motion-reduce:animate-none'
      >
        {t('appName').charAt(0)}
      </span>
      <span className='sr-only'>{t('common.loading')}</span>
    </div>
  );
}

/**
 * Root of every route: restores the session once, then keeps it honest —
 * expiry on window focus (§8.3), the 120-minute inactivity logout (§8.4),
 * and a sign-out in another tab.
 */
export function SessionGate() {
  const status = useSessionStore((s) => s.status);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (status !== 'signedIn') return;

    const checkExpiry = () => {
      const auth = tokenStore.get();
      if (!auth || isExpired(auth)) logout({ expired: true });
    };

    let timer = window.setTimeout(
      () => logout({ expired: true }),
      INACTIVITY_MS,
    );
    const onActivity = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => logout({ expired: true }), INACTIVITY_MS);
    };
    const activity = ['mousemove', 'keydown', 'click'] as const;
    activity.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    window.addEventListener('focus', checkExpiry);
    // Signed out in another tab: follow it here.
    const unsubscribe = tokenStore.subscribe(() => {
      if (!tokenStore.get()) endSession();
    });

    return () => {
      window.clearTimeout(timer);
      activity.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('focus', checkExpiry);
      unsubscribe();
    };
  }, [status]);

  if (status === 'restoring') return <Splash />;
  return <Outlet />;
}

/**
 * Private routes (§8.6): without a current user, go to login and keep any
 * `?identifier=` so the username is prefilled.
 */
export function RequireAuth() {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();
  if (status === 'signedIn') return <Outlet />;
  const identifier = new URLSearchParams(location.search).get('identifier');
  const search = identifier
    ? `?identifier=${encodeURIComponent(identifier)}`
    : '';
  return <Navigate to={`/auth/login${search}`} replace />;
}

/** `/auth/*` for signed-out users only; signed-in users go home (§8.6). */
export function GuestOnly() {
  const status = useSessionStore((s) => s.status);
  return status === 'signedIn' ? <Navigate to='/today' replace /> : <Outlet />;
}

/** `/logout` route: client-side logout, then the login page (§8.5). */
export function LogoutRoute() {
  useEffect(() => logout(), []);
  return <Splash />;
}
