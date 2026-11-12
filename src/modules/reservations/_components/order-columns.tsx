import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Tag } from '@/shared/components/pulse';
import {
  formatLocalDateTime,
  formatMoney,
  joinList,
} from '@/shared/lib/format';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import type { Lang } from '@/shared/types/lang';
import type { Order } from '@/modules/reservations/api/types';
import {
  CHANNEL_KEY,
  orderChannel,
} from '@/modules/reservations/lib/order-labels';
import { orderServiceNames } from '@/modules/reservations/lib/order-rules';
import { NextActionButton } from '@/modules/reservations/_components/next-action-button';

/** Column factory for the reservations table (doc §13.3). */
export function orderColumns(
  t: TFunction<'reservations'>,
  lang: Lang,
  onComplete: (order: Order) => void,
): ColumnDef<Order>[] {
  return [
    {
      id: 'id',
      header: t('columns.id'),
      cell: ({ row }) => (
        <span dir='ltr' className='num text-ink-2'>
          #{row.original.id}
        </span>
      ),
    },
    {
      id: 'name',
      header: t('columns.name'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='text-ink font-bold'>{row.original.ownerName}</span>
          <span dir='ltr' className='num text-ink-3 text-start text-xs'>
            {row.original.ownerPhone}
          </span>
        </div>
      ),
    },
    {
      id: 'branch',
      header: t('columns.branch'),
      cell: ({ row }) => <Tag>{row.original.serviceProviderBranchName}</Tag>,
    },
    {
      id: 'service',
      header: t('columns.service'),
      cell: ({ row }) => {
        const names = orderServiceNames(row.original);
        if (!names.length) return '—';
        return (
          <span className='line-clamp-2 max-w-64'>{joinList(names, lang)}</span>
        );
      },
    },
    {
      id: 'date',
      header: t('columns.date'),
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatLocalDateTime(row.original.dateChosen, lang)}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: ({ row }) => (
        <ReservationStatusBadge status={statusKeyOf(row.original.status)} />
      ),
    },
    {
      id: 'channel',
      header: t('columns.channel'),
      cell: ({ row }) => {
        const channel = orderChannel(row.original);
        return channel ? t(`channel.${CHANNEL_KEY[channel]}`) : '—';
      },
    },
    {
      id: 'amount',
      header: t('columns.amount'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num font-semibold whitespace-nowrap'>
          {formatMoney(row.original.cost + row.original.costTax)} {t('sar')}
        </span>
      ),
    },
    {
      id: 'next',
      header: '',
      meta: { align: 'end' },
      cell: ({ row }) => (
        <NextActionButton order={row.original} onComplete={onComplete} />
      ),
    },
  ];
}
