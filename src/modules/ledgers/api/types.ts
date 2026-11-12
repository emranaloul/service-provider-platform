import type { LedgerStatus } from '@/shared/api/enums';

/** `Ledger` list item (doc §15.2). */
export interface Ledger {
  id: number;
  serviceProviderName: string;
  claimedBy: string;
  claimedDate: string;
  claimedFrom: string;
  claimedTo: string;
  total: number;
  tax: number;
  status: LedgerStatus;
  /** The provider's note from the claim. */
  note: string;
  /** The platform admin's note. */
  adminNote: string | null;
  attachment: string;
  ledgerOrders:
    | {
        id: number;
        reservationId: string;
        orderId: number;
        serviceProviderLedgerId: number;
      }[]
    | null;
}

interface LedgerLine {
  count: number;
  cost: number;
  sellPrice: number;
}

/** The ledger report (doc §15.2). */
export interface LedgerDetails {
  id: number;
  claimedBy: string;
  claimedDate: string;
  note: string;
  attachment: string;
  cost: number;
  reservationIds: { orderId: number; reservationId: string }[];
  servicesCount: number;
  services: (LedgerLine & { serviceId: number; serviceName: string })[];
  serviceGroupsCount: number;
  serviceGroups: (LedgerLine & {
    serviceGroupId: number;
    serviceGroupName: string;
    servicesCount: number;
    services: (LedgerLine & { serviceId: number; serviceName: string })[];
  })[];
  vaccinesCount: number;
  vaccines: (LedgerLine & { vaccineId: number; vaccineName: string })[];
}
