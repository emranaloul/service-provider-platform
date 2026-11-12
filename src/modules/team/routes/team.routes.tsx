import type { RouteObject } from 'react-router-dom';
import { TeamPage } from '@/modules/team/views/team-page';

export const teamRoutes: RouteObject[] = [
  { path: 'team', element: <TeamPage /> },
];
