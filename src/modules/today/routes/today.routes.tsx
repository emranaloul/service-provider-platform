import type { RouteObject } from 'react-router-dom';
import { TodayPage } from '@/modules/today/views/today-page';

export const todayRoutes: RouteObject[] = [
  { path: 'today', element: <TodayPage /> },
];
