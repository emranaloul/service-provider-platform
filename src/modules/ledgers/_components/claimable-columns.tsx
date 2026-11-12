import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { formatLocalDateTime, formatMoney } from '@/shared/lib/format';
import type { Lang } from '@/shared/types/lang';
import type { Order } from '@/modules/reservations/api/types';
import { costWithTax } from '@/modules/ledgers/lib/claim';

interface ClaimableColumnContext {
  t: TFunction<'ledgers'>;
  lang: Lang;
  /** Ids of the selected orders (across pages). */
  selected: ReadonlySet<string>;
  /** Orders on the current page, for the header "select all" box. */
  pageOrders: readonly Order[];
  onToggle: (order: Order, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}

/** Column factory for the claimable-orders list (doc §14). */
export function claimableColumns({
  t,
  lang,
  selected,
  pageOrders,
  onToggle,
  onTogglePage,
}: ClaimableColumnContext): ColumnDef<Order>[] {
  const pickedOnPage = pageOrders.filter((o) => selected.has(o.id)).length;
  const headerState =
    pageOrders.length > 0 && pickedOnPage === pageOrders.length
      ? true
      : pickedOnPage > 0
        ? 'indeterminate'
        : false;

  return [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={headerState}
          disabled={pageOrders.length === 0}
          onCheckedChange={(c) => onTogglePage(c === true)}
          aria-label={t('claim.columns.selectAll')}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={(c) => onToggle(row.original, c === true)}
            aria-label={t('claim.columns.selectRow', { id: row.original.id })}
          />
        </div>
      ),
    },
    {
      id: 'id',
      header: t('claim.columns.id'),
      cell: ({ row }) => (
        <span dir='ltr' className='num text-ink font-bold'>
          {row.original.id}
        </span>
      ),
    },
    {
      id: 'patient',
      header: t('claim.columns.patient'),
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
      header: t('claim.columns.branch'),
      cell: ({ row }) => row.original.serviceProviderBranchName || '—',
    },
    {
      id: 'date',
      header: t('claim.columns.date'),
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatLocalDateTime(row.original.dateChosen, lang)}
        </span>
      ),
    },
    {
      id: 'costWithTax',
      header: t('claim.columns.costWithTax'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatMoney(costWithTax(row.original))} {t('sar')}
        </span>
      ),
    },
    {
      id: 'sellPrice',
      header: t('claim.columns.sellPrice'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num whitespace-nowrap'>
          {formatMoney(row.original.sellPrice)} {t('sar')}
        </span>
      ),
    },
  ];
}
