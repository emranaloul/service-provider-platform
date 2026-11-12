import { Navigate, type RouteObject } from 'react-router-dom';

/**
 * Providers do not manage the service catalogue — that is an admin feature
 * (A-Z §30, Blocked Items §4). What a branch offers and at what price is on
 * each branch's "Services & vaccines" tab, so `/services` goes to Branches.
 * If admins ever use this portal, a catalogue screen would go here.
 */
export const servicesRoutes: RouteObject[] = [
  { path: 'services', element: <Navigate to='/branches' replace /> },
];
