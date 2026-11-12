import type { RouteObject } from 'react-router-dom';
import { BranchesPage } from '@/modules/branches/views/branches-page';

export const branchesRoutes: RouteObject[] = [
  { path: 'branches', element: <BranchesPage /> },
];
