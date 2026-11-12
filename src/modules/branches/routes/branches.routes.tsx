import type { RouteObject } from 'react-router-dom';
import { BranchesPage } from '@/modules/branches/views/branches-page';
import { BranchPage } from '@/modules/branches/views/branch-page';

export const branchesRoutes: RouteObject[] = [
  { path: 'branches', element: <BranchesPage /> },
  { path: 'branches/:id', element: <BranchPage /> },
];
