import type { RouteObject } from 'react-router-dom';
import { ServicesPage } from '@/modules/services/views/services-page';

export const servicesRoutes: RouteObject[] = [
  { path: 'services', element: <ServicesPage /> },
];
