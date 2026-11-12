import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';
import type {
  OrderGroupService,
  OrderService,
} from '@/modules/reservations/api/types';

/**
 * The public QR verification page (missing items §8): read-only, no sign-in.
 * There is no scan-to-check-in endpoint — a "Check-in (QR)" button reads the
 * link (`parseOrderScanLink`), opens the order and uses the normal status
 * change (`Status=16`).
 */
export interface PublicOrder {
  id?: string;
  dateChosen: string;
  companyName: string;
  ownerName: string;
  ownerPhone: string;
  serviceProviderName: string;
  serviceProviderBranchId?: number;
  serviceProviderBranchName?: string;
  serviceProviderBranchPhone?: string;
  serviceProviderBranchAddress?: string;
  latitude: number;
  longitude: number;
  reservationServices: {
    services: OrderService[];
    groupServices: OrderGroupService[];
  } | null;
}

export const publicOrderQuery = (reservationId: string) =>
  queryOptions({
    queryKey: ['publicOrder', reservationId],
    queryFn: ({ signal }) =>
      apiGet<PublicOrder>('Reservation/Reservation/publicGetById', {
        signal,
        authless: true,
        params: { Id: reservationId },
      }),
  });

/**
 * Reservation id and language from a scanned
 * `{origin}/public/orderscantoverify/{id}/{langId}` link, or `null`.
 */
export function parseOrderScanLink(
  text: string,
): { reservationId: string; langId: number | null } | null {
  const match = /\/public\/orderscantoverify\/([^/?#]+)(?:\/(\d+))?/i.exec(
    text.trim(),
  );
  if (!match) return null;
  return {
    reservationId: decodeURIComponent(match[1]),
    langId: match[2] ? Number(match[2]) : null,
  };
}

/** Maps link for the branch location. */
export const mapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;
