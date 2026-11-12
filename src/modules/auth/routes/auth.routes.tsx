import { Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import {
  GuestOnly,
  LogoutRoute,
} from '@/modules/auth/_components/session-gate';
import { ForgotPasswordPage } from '@/modules/auth/views/forgot-password-page';
import { LoginPage } from '@/modules/auth/views/login-page';
import { ResetPasswordPage } from '@/modules/auth/views/reset-password-page';

/** Signed-out screens (auth doc §8.6), plus `/logout` for everyone. */
export const authRoutes: RouteObject[] = [
  {
    path: 'auth',
    // The `auth` strings load on demand; the card appears once they have.
    element: (
      <Suspense fallback={null}>
        <GuestOnly />
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to='login' replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      {
        path: 'forgot-password-form/:userName',
        element: <ResetPasswordPage />,
      },
    ],
  },
  { path: 'logout', element: <LogoutRoute /> },
];
