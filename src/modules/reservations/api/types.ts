import type { OrderStatus } from '@/shared/api/enums';

/** A service on a reservation (doc §13.3). */
export interface OrderService {
  reservationServiceId: number;
  id: number;
  serviceName: string;
  from: string;
  to: string;
  sellPrice?: number;
  costPrice?: number;
  totalPrice?: number;
}

export interface OrderGroupService {
  reservationServiceId: number;
  serviceGroupId: number;
  serviceGroupName: string;
  from: string;
  to: string;
  sellPrice: number;
  costPrice: number;
  services: OrderService[];
}

export interface OrderVaccine {
  id: number;
  vaccineId: number;
  vaccineName?: string;
  slotTimeId: number;
  from?: string;
  to?: string;
  cost?: number;
  sellPrice?: number;
  serviceProviderBranchVaccineId?: number;
}

/** List item of `ShortcutList` / `List` (doc §13.3). */
export interface Order {
  /** Reservation id — a string. */
  id: string;
  status: OrderStatus;
  /** Appointment date, UTC. */
  dateChosen: string;
  createdAt: string;
  acceptedDate?: string;
  serviceProviderBranchId: number;
  serviceProviderBranchName: string;
  serviceProviderBranchPhone: string;
  serviceProviderBranchLogo: string;
  latitude: number;
  longitude: number;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  identityNumber: string | null;
  createdByName: string;
  companyName: string;
  companyBranchId: number;
  companyBranchName: string;
  companyPackageCode: string;
  companyPackageRequestUserId: string;
  packageType: number;
  enrollmentType: number;
  /** Legacy — not displayed; use `requestFlow.channel` / `requestChannel`. */
  channel: number;
  fundingType: number | null;
  requestFlow?: {
    channel?: number | null;
    funding?: number | null;
    /** `RequestServiceFlags` bitmask. */
    services?: number | null;
  } | null;
  requestFunding?: number | null;
  requestChannel?: number | null;
  cost: number;
  costTax: number;
  sellPrice: number;
  sellPriceTax: number;
  /** Medical result: fit / unfit. */
  isFit: boolean;
  /** Already included in a ledger. */
  isClaimedByProvider: boolean;
  note: string | null;
  adminNotes: string | null;
  cancelationReason: string;
  rejectionReason: string;
  attachments: string[] | null;
  reservationServices: {
    id: number;
    services: OrderService[];
    groupServices: OrderGroupService[];
  } | null;
  reservationVaccines?: OrderVaccine[] | null;
  reservationQuestionAnswers?:
    { id: string; question: string; answer: string }[] | null;
  statusLogs:
    | {
        id: number;
        status: OrderStatus;
        createdBy: string;
        createdAt: string;
        reservationId: string;
      }[]
    | null;
}

/** `GetById` (doc §13.3). Its fit flag is spelled `isfit`. */
export interface ReservationDetails extends Omit<Order, 'isFit'> {
  isfit: boolean;
  qualityCheck?: unknown;
  cityId?: number;
  attachment?: string | null;
  fullPathAttachments?: string[] | null;
  govPlatLogs?: unknown[] | null;
}

/** An item of `Service/Service/QuestionsList` (doc §13.4). */
export interface ServiceQuestion {
  questionId: number;
  question: string;
  isRequired: boolean;
  serviceId: number;
}
