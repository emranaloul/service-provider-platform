import { Suspense } from 'react';
import {
  Navigate,
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

/*
 * TODO(auth): add the sign-in route and wrap AppLayout in a ProtectedRoute
 * once the auth endpoints are known (token store + refresh are already in
 * src/shared/api/).
 */
const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <AppLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Navigate to='/today' replace /> },
          ...todayRoutes,
          ...reservationsRoutes,
          ...ledgersRoutes,
          ...teamRoutes,
          ...servicesRoutes,
          ...branchesRoutes,
          ...profileRoutes,
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
