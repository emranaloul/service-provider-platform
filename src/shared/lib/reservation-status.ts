import type { StatusBadgeVariant } from '@/shared/components/status-badge-variants';

/**
 * Reservation status model (design canvas README):
 *   Accepted (default) → Checked in → In progress → Completed
 *   side exits: Delayed, No show, Cancelled. No accept/decline step.
 * TODO(backend): map the API's status enum onto these keys.
 */
export const RESERVATION_STATUSES = [
  'accepted',
  'checkedIn',
  'inProgress',
  'completed',
  'delayed',
  'noShow',
  'cancelled',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_VARIANT: Record<
  ReservationStatus,
  StatusBadgeVariant
> = {
  accepted: 'line',
  checkedIn: 'accent',
  inProgress: 'solid',
  completed: 'up',
  delayed: 'warn',
  noShow: 'down',
  cancelled: 'flat',
};

/** The next valid step for a reservation (one primary action per row). */
export const NEXT_STATUS: Partial<
  Record<ReservationStatus, ReservationStatus>
> = {
  accepted: 'checkedIn',
  delayed: 'checkedIn',
  checkedIn: 'inProgress',
  inProgress: 'completed',
};
