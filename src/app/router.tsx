import { Suspense } from 'react';
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import { AppLayout } from '@/modules/shell/_components/app-layout';
import { NotFoundPage } from '@/modules/shell/not-found-page';
import { RouteErrorPage } from '@/modules/shell/route-error-page';
import { PageSkeleton } from '@/shared/components/skeletons';
import { todayRoutes } from '@/modules/today/routes/today.routes';
import { reservationsRoutes } from '@/modules/reservations/routes/reservations.routes';
import { ledgersRoutes } from '@/modules/ledgers/routes/ledgers.routes';
import { teamRoutes } from '@/modules/team/routes/team.routes';
import { servicesRoutes } from '@/modules/services/routes/services.routes';
import { branchesRoutes } from '@/modules/branches/routes/branches.routes';
import { profileRoutes } from '@/modules/profile/routes/profile.routes';
import { authRoutes } from '@/modules/auth/routes/auth.routes';
import { publicRoutes } from '@/modules/public/routes/public.routes';
import {
  RequireAuth,
  SessionGate,
} from '@/modules/auth/_components/session-gate';

/*
 * `SessionGate` restores the stored session before anything renders (auth
 * doc §8.2). Private screens sit behind `RequireAuth`; `/auth/*` behind
 * `GuestOnly` (§8.6). `/public/*` (QR verification) is open to everyone,
 * signed in or not.
 */
const router = createBrowserRouter([
  {
    element: <SessionGate />,
    errorElement: <RouteErrorPage />,
    children: [
      ...authRoutes,
      {
        // The `public` strings load on demand; the card appears once they have.
        element: (
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        ),
        children: publicRoutes,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: (
              <Suspense fallback={<PageSkeleton />}>
                <AppLayout />
              </Suspense>
            ),
            children: [
              { index: true, element: <Navigate to='/today' replace /> },
              // A-Z §19.8.6 names `/dashboard` as the signed-in landing page;
              // this portal's dashboard is Today.
              { path: 'dashboard', element: <Navigate to='/today' replace /> },
              ...todayRoutes,
              ...reservationsRoutes,
              ...ledgersRoutes,
              ...teamRoutes,
              ...servicesRoutes,
              ...branchesRoutes,
              ...profileRoutes,
            ],
          },
          // Signed out, any unknown path also lands on login (§8.6).
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
