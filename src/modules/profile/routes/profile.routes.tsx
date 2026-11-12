import type { RouteObject } from 'react-router-dom';
import { ProfilePage } from '@/modules/profile/views/profile-page';

export const profileRoutes: RouteObject[] = [
  { path: 'profile', element: <ProfilePage /> },
];
