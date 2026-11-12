import type { RouteObject } from 'react-router-dom';
import { OrderVerifyPage } from '@/modules/public/views/order-verify-page';

/** Pages anyone can open, signed in or not (QR verification). */
export const publicRoutes: RouteObject[] = [
  {
    path: 'public/orderscantoverify/:id/:langId?',
    element: <OrderVerifyPage />,
  },
];
