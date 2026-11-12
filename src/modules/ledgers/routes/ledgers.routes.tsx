import type { RouteObject } from 'react-router-dom';
import { LedgersPage } from '@/modules/ledgers/views/ledgers-page';

export const ledgersRoutes: RouteObject[] = [
  { path: 'ledgers', element: <LedgersPage /> },
];
