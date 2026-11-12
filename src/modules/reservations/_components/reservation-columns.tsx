import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Button } from '@/shared/components/ui/button';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { NEXT_STATUS } from '@/shared/lib/reservation-status';
import { Tag } from '@/shared/components/pulse';
import { formatDate } from '@/shared/lib/format';
import type { Lang } from '@/shared/types/lang';
import type { Reservation } from '@/modules/reservations/lib/mock-reservations';

/** Column factory for the reservations table (rule: ColumnDefs live in `_components`). */
export function reservationColumns(
  t: TFunction<'reservations'>,
  lang: Lang,
): ColumnDef<Reservation>[] {
  return [
    {
      id: 'id',
      header: t('columns.id'),
      cell: ({ row }) => (
        <span className='num text-ink-2'>#{row.original.id}</span>
      ),
    },
    {
      id: 'name',
      header: t('columns.name'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-bold'>{row.original.name}</span>
          <span dir='ltr' className='num text-ink-3 text-xs'>
            {row.original.mobile}
          </span>
        </div>
      ),
    },
    {
      id: 'branch',
      header: t('columns.branch'),
      cell: ({ row }) => <Tag>{row.original.branch}</Tag>,
    },
    { id: 'service', header: t('columns.service'), accessorKey: 'service' },
    {
      id: 'date',
      header: t('columns.date'),
      cell: ({ row }) => (
        <span className='num'>{formatDate(row.original.date, lang)}</span>
      ),
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: ({ row }) => (
        <ReservationStatusBadge status={row.original.status} />
      ),
    },
    {
      id: 'amount',
      header: t('columns.amount'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='num font-semibold'>
            {row.original.amount.toFixed(2)} {t('sar')}
          </span>
          <span className='text-ink-3 text-xs'>{t('vatIncl')}</span>
        </div>
      ),
    },
    {
      id: 'next',
      header: '',
      cell: ({ row }) => {
        const next = NEXT_STATUS[row.original.status];
        if (
          next !== 'checkedIn' &&
          next !== 'inProgress' &&
          next !== 'completed'
        )
          return null;
        // TODO(backend): call the status-change endpoint.
        return (
          <Button
            size='sm'
            variant={next === 'checkedIn' ? 'default' : 'outline'}
          >
            {t(`next.${next}`)}
          </Button>
        );
      },
    },
  ];
}
