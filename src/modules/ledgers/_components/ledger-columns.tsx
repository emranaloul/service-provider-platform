import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { formatLocalDateTime, formatMoney } from '@/shared/lib/format';
import type { Lang } from '@/shared/types/lang';
import type { Ledger } from '@/modules/ledgers/api/types';
import { formatPeriod } from '@/modules/ledgers/lib/ledger-status';
import { LedgerStatusBadge } from '@/modules/ledgers/_components/ledger-status-badge';

/** Column factory for the ledger list (doc §15). */
export function ledgerColumns(
  t: TFunction<'ledgers'>,
  lang: Lang,
): ColumnDef<Ledger>[] {
  return [
    {
      id: 'id',
      header: t('ledgers.columns.id'),
      cell: ({ row }) => (
        <span className='num text-ink font-bold'>#{row.original.id}</span>
      ),
    },
    {
      id: 'claimedBy',
      header: t('ledgers.columns.claimedBy'),
      cell: ({ row }) => row.original.claimedBy || '—',
    },
    {
      id: 'claimedDate',
      header: t('ledgers.columns.claimedDate'),
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatLocalDateTime(row.original.claimedDate, lang)}
        </span>
      ),
    },
    {
      id: 'period',
      header: t('ledgers.columns.period'),
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatPeriod(row.original.claimedFrom, row.original.claimedTo, lang)}
        </span>
      ),
    },
    {
      id: 'total',
      header: t('ledgers.columns.total'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num text-ink font-bold whitespace-nowrap'>
          {formatMoney(row.original.total)} {t('sar')}
        </span>
      ),
    },
    {
      id: 'tax',
      header: t('ledgers.columns.tax'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatMoney(row.original.tax)} {t('sar')}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('ledgers.columns.status'),
      cell: ({ row }) => <LedgerStatusBadge status={row.original.status} />,
    },
    {
      id: 'note',
      header: t('ledgers.columns.note'),
      cell: ({ row }) => (
        <span className='line-clamp-2 max-w-64' title={row.original.note}>
          {row.original.note || '—'}
        </span>
      ),
    },
  ];
}
