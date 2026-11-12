import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/shared/components/status-badge';
import {
  RESERVATION_STATUS_VARIANT,
  type ReservationStatus,
} from '@/shared/lib/reservation-status';

/** Reservation status pill — word + dot, never colour alone. */
export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      variant={RESERVATION_STATUS_VARIANT[status]}
      label={t(`reservationStatus.${status}`)}
    />
  );
}
