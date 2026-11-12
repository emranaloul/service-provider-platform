import { useTranslation } from 'react-i18next';
import { Eye, Inbox } from 'lucide-react';
import { EmptyState } from '@/shared/components/empty-state';
import { Tag } from '@/shared/components/pulse';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { formatLocalDateTime, joinList } from '@/shared/lib/format';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import type { Order } from '@/modules/reservations/api/types';
import { orderServiceNames } from '@/modules/reservations/lib/order-rules';
import {
  BOARD_COLUMNS,
  groupByBoardColumn,
} from '@/modules/reservations/lib/order-views';
import { NextActionButton } from '@/modules/reservations/_components/next-action-button';

const COLUMN_GRID =
  'grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2';

/** Reservations board (design board 03): one column per status. */
export function OrderBoard({
  orders,
  loading,
  onOpen,
  onComplete,
}: {
  orders: readonly Order[];
  loading: boolean;
  onOpen: (order: Order) => void;
  onComplete: (order: Order) => void;
}) {
  const { t } = useTranslation('reservations');

  if (loading) return <BoardSkeleton />;

  const columns = groupByBoardColumn(orders);
  const shown = BOARD_COLUMNS.reduce((n, c) => n + columns[c.key].length, 0);

  return (
    <div className='flex flex-col gap-3'>
      {shown === 0 && (
        <div className='bg-surface border-line rounded-2xl border'>
          <EmptyState icon={Inbox} title={t('empty')} />
        </div>
      )}
      <div className={COLUMN_GRID}>
        {BOARD_COLUMNS.map((col) => {
          const items = columns[col.key];
          return (
            <section
              key={col.key}
              aria-labelledby={`board-col-${col.key}`}
              className='bg-sunken flex min-h-40 flex-col gap-2.5 rounded-2xl p-2.5'
            >
              <header className='flex items-center justify-between gap-2 px-1.5 pt-1'>
                <h2
                  id={`board-col-${col.key}`}
                  className='text-ink text-sm font-extrabold'
                >
                  {t(`tiles.${col.key}`)}
                </h2>
                <span className='num bg-surface text-ink-2 rounded-full px-2 text-xs font-bold'>
                  {items.length}
                </span>
              </header>
              {items.length === 0 ? (
                <p className='text-ink-3 px-1.5 py-4 text-center text-xs'>
                  {t('board.emptyColumn')}
                </p>
              ) : (
                items.map((o) => (
                  <BoardCard
                    key={o.id}
                    order={o}
                    onOpen={onOpen}
                    onComplete={onComplete}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  order: o,
  onOpen,
  onComplete,
}: {
  order: Order;
  onOpen: (order: Order) => void;
  onComplete: (order: Order) => void;
}) {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const services = orderServiceNames(o);

  return (
    // The card surface opens the drawer for pointer users; the Details
    // button is the keyboard path.
    <article
      onClick={() => onOpen(o)}
      className='bg-surface border-line hover:border-line-strong flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3 transition-colors'
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex min-w-0 flex-col'>
          <span className='text-ink truncate font-bold'>{o.ownerName}</span>
          <span className='text-ink-3 text-xs'>
            <span dir='ltr' className='num'>
              #{o.id}
            </span>
            {o.companyName && ` · ${o.companyName}`}
          </span>
        </div>
        <ReservationStatusBadge status={statusKeyOf(o.status)} />
      </div>
      <div className='text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
        <span className='num'>{formatLocalDateTime(o.dateChosen, lang)}</span>
        <Tag>{o.serviceProviderBranchName}</Tag>
      </div>
      {services.length > 0 && (
        <p className='text-ink-2 line-clamp-2 text-xs'>
          {joinList(services, lang)}
        </p>
      )}
      <div className='flex flex-wrap items-center justify-end gap-2'>
        <NextActionButton order={o} onComplete={onComplete} />
        <Button
          variant='outline'
          size='sm'
          onClick={(e) => {
            e.stopPropagation();
            onOpen(o);
          }}
          aria-label={t('board.detailsOf', { name: o.ownerName })}
        >
          <Eye />
          {t('board.details')}
        </Button>
      </div>
    </article>
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy className={COLUMN_GRID}>
      {BOARD_COLUMNS.map((c, i) => (
        <div
          key={c.key}
          aria-hidden
          className='bg-sunken flex flex-col gap-2.5 rounded-2xl p-2.5'
        >
          <Skeleton className='mx-1.5 mt-1 h-4 w-24' />
          {Array.from({ length: 3 - (i % 2) }, (_, j) => (
            <div
              key={j}
              className='bg-surface border-line flex flex-col gap-2 rounded-xl border p-3'
            >
              <Skeleton className='h-3.5 w-3/5' />
              <Skeleton className='h-2.5 w-2/5' />
              <Skeleton className='h-2.5 w-4/5' />
              <Skeleton className='ms-auto h-7 w-20 rounded-full' />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
