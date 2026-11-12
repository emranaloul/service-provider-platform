import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarClock, CalendarX } from 'lucide-react';
import { parseUtcDate } from '@/shared/components/layout/form/date-utils';
import { ListError } from '@/shared/components/list-error';
import { IconTile, Panel, PanelHeader, Tag } from '@/shared/components/pulse';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import type { Order } from '@/modules/reservations/api/types';
import { PanelEmpty, PanelLink } from '@/modules/today/_components/panel-bits';

/** Local `HH:mm` of an appointment (the API sends UTC). */
const timeOf = (iso: string) => {
  const d = parseUtcDate(iso);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'HH:mm');
};

/** Today's reservations; a row opens it in the reservations drawer. */
export function AppointmentsPanel({
  orders,
  loading,
  error,
  onRetry,
  note,
}: {
  orders: readonly Order[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** One line under the header, e.g. why the list ignores the branch filter. */
  note?: string;
}) {
  const { t } = useTranslation('today');
  const navigate = useNavigate();

  return (
    <Panel className='animate-enter' aria-busy={loading}>
      <PanelHeader
        icon={
          <IconTile tone='accent'>
            <CalendarClock />
          </IconTile>
        }
        title={t('appointments.title')}
        description={t('appointments.description')}
        actions={
          <PanelLink to='/reservations'>{t('appointments.viewAll')}</PanelLink>
        }
      />
      {note && <p className='text-ink-3 px-5 pb-2 text-xs'>{note}</p>}
      {error ? (
        <div className='px-5 pb-5'>
          <ListError error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <ul aria-hidden className='flex flex-col px-5 pb-4'>
          {Array.from({ length: 4 }, (_, i) => (
            <li
              key={i}
              className='border-line flex items-center gap-3 border-t py-3'
            >
              <Skeleton className='h-5 w-12' />
              <div className='flex flex-1 flex-col gap-2'>
                <Skeleton className={i % 2 ? 'h-3.5 w-1/3' : 'h-3.5 w-2/5'} />
                <Skeleton className='h-2.5 w-1/4' />
              </div>
              <Skeleton className='h-6 w-20 rounded-full' />
            </li>
          ))}
        </ul>
      ) : !orders?.length ? (
        <PanelEmpty icon={CalendarX}>{t('appointments.empty')}</PanelEmpty>
      ) : (
        <ul className='flex flex-col px-3 pb-3'>
          {orders.map((o) => (
            <li key={o.id} className='border-line border-t first:border-t-0'>
              <Button
                variant='ghost'
                onClick={() =>
                  navigate(`/reservations?order=${encodeURIComponent(o.id)}`)
                }
                className='h-auto w-full justify-start gap-3 rounded-xl px-2 py-3 text-start font-normal'
              >
                <span className='num text-ink w-12 flex-none text-base font-extrabold'>
                  {timeOf(o.dateChosen)}
                </span>
                <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='text-ink truncate font-bold'>
                    {o.ownerName}
                  </span>
                  <span className='flex min-w-0 flex-wrap items-center gap-1.5'>
                    {o.serviceProviderBranchName && (
                      <Tag>{o.serviceProviderBranchName}</Tag>
                    )}
                    {o.companyName && (
                      <span className='text-ink-3 truncate text-xs'>
                        {o.companyName}
                      </span>
                    )}
                  </span>
                </span>
                <ReservationStatusBadge status={statusKeyOf(o.status)} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
