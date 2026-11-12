import { OrderStatus } from '@/shared/api/enums';
import type { StatusBadgeVariant } from '@/shared/components/status-badge-variants';

/**
 * Reservation status keys, mapped from the backend's `OrderStatus` bits
 * (doc §2.3). Providers act from Accepted on: they cannot Accept or Reject;
 * their status change offers Check-in and In progress (Missing Items §11.8).
 */
export const RESERVATION_STATUSES = [
  'new',
  'accepted',
  'checkedIn',
  'inProgress',
  'completed',
  'delayed',
  'noShow',
  'cancelled',
  'rejected',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const STATUS_KEY: Record<OrderStatus, ReservationStatus> = {
  [OrderStatus.New]: 'new',
  [OrderStatus.Accept]: 'accepted',
  [OrderStatus.Cancel]: 'cancelled',
  [OrderStatus.Reject]: 'rejected',
  [OrderStatus.CheckIn]: 'checkedIn',
  [OrderStatus.InProgress]: 'inProgress',
  [OrderStatus.Complete]: 'completed',
  [OrderStatus.NoShow]: 'noShow',
  [OrderStatus.Delayed]: 'delayed',
};

/** Unknown values fall back to `new` rather than crashing a row. */
export const statusKeyOf = (status: number): ReservationStatus =>
  STATUS_KEY[status as OrderStatus] ?? 'new';

export const RESERVATION_STATUS_VARIANT: Record<
  ReservationStatus,
  StatusBadgeVariant
> = {
  new: 'accent',
  accepted: 'line',
  checkedIn: 'accent',
  inProgress: 'solid',
  completed: 'up',
  delayed: 'warn',
  noShow: 'down',
  cancelled: 'flat',
  rejected: 'down',
};
