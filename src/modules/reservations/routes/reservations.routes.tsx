import type { RouteObject } from 'react-router-dom';
import { ReservationsPage } from '@/modules/reservations/views/reservations-page';

export const reservationsRoutes: RouteObject[] = [
  { path: 'reservations', element: <ReservationsPage /> },
  // TODO: 'reservations/board', 'reservations/calendar', 'reservations/:id' (drawer)
];
