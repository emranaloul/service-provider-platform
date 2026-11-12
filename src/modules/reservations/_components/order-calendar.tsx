import { useTranslation } from 'react-i18next';
import { format, isToday as isTodayDate } from 'date-fns';
import { CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/shared/components/empty-state';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  dateFnsLocale,
  parseUtcDate,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import { cn } from '@/shared/lib/utils';
import type { Order } from '@/modules/reservations/api/types';
import {
  groupByLocalDay,
  weekDays,
} from '@/modules/reservations/lib/order-views';

const DAY_GRID =
  'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7';

/**
 * Week calendar (design board 04): seven local days from Saturday, each
 * with its appointments in time order.
 */
export function OrderCalendar({
  weekStart,
  orders,
  loading,
  onPrev,
  onNext,
  onToday,
  onOpen,
}: {
  weekStart: Date;
  orders: readonly Order[];
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (order: Order) => void;
}) {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const locale = dateFnsLocale(lang);
  const days = weekDays(weekStart);
  const byDay = groupByLocalDay(orders);
  const total = days.reduce(
    (n, d) => n + (byDay.get(toDateOnly(d))?.length ?? 0),
    0,
  );

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='outline'
          size='icon-sm'
          onClick={onPrev}
          aria-label={t('calendar.prevWeek')}
        >
          <ChevronLeft className='rtl-mirror' />
        </Button>
        <Button
          variant='outline'
          size='icon-sm'
          onClick={onNext}
          aria-label={t('calendar.nextWeek')}
        >
          <ChevronRight className='rtl-mirror' />
        </Button>
        <Button variant='ghost' size='sm' onClick={onToday}>
          {t('calendar.thisWeek')}
        </Button>
        <h2 className='hd text-ink text-base font-bold'>
          {t('calendar.range', {
            from: format(days[0], 'd MMM', { locale }),
            to: format(days[6], 'd MMM yyyy', { locale }),
          })}
        </h2>
      </div>

      {loading ? (
        <CalendarWeekSkeleton />
      ) : (
        <>
          {total === 0 && (
            <div className='bg-surface border-line rounded-2xl border'>
              <EmptyState icon={CalendarX2} title={t('calendar.empty')} />
            </div>
          )}
          <div className={DAY_GRID}>
            {days.map((day) => {
              const key = toDateOnly(day);
              const items = byDay.get(key) ?? [];
              const isToday = isTodayDate(day);
              return (
                <section
                  key={key}
                  aria-labelledby={`cal-day-${key}`}
                  className={cn(
                    'border-line flex min-h-32 flex-col gap-2 rounded-2xl border p-2',
                    isToday ? 'bg-raised border-brand' : 'bg-surface',
                  )}
                >
                  <header
                    id={`cal-day-${key}`}
                    className={cn(
                      'flex items-baseline justify-between gap-2 rounded-lg px-2 py-1',
                      isToday && 'bg-brand-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'font-bold',
                        isToday ? 'text-brand' : 'text-ink',
                      )}
                    >
                      {format(day, 'EEEE', { locale })}{' '}
                      <span className='num'>{format(day, 'd')}</span>
                      {isToday && (
                        <span className='ms-1.5 text-xs'>
                          · {t('calendar.today')}
                        </span>
                      )}
                    </span>
                    <span className='text-ink-3 text-xs'>
                      {t('calendar.count', { count: items.length })}
                    </span>
                  </header>
                  {items.map((o) => (
                    <Button
                      key={o.id}
                      variant='outline'
                      onClick={() => onOpen(o)}
                      className='h-auto w-full flex-col items-stretch gap-1 rounded-lg px-2.5 py-2 text-start font-normal whitespace-normal'
                    >
                      <span className='flex items-center justify-between gap-2'>
                        <span className='num text-ink-2 text-xs font-bold'>
                          {format(parseUtcDate(o.dateChosen), 'HH:mm')}
                        </span>
                        <ReservationStatusBadge
                          status={statusKeyOf(o.status)}
                        />
                      </span>
                      <span className='text-ink truncate font-bold'>
                        {o.ownerName}
                      </span>
                      <span className='text-ink-3 truncate text-xs'>
                        {o.serviceProviderBranchName}
                      </span>
                    </Button>
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarWeekSkeleton() {
  return (
    <div aria-busy className={DAY_GRID}>
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className='bg-surface border-line flex min-h-32 flex-col gap-2 rounded-2xl border p-2'
        >
          <Skeleton className='m-1 h-4 w-2/3' />
          {Array.from({ length: (i % 3) + 1 }, (_, j) => (
            <Skeleton key={j} className='h-16 rounded-lg' />
          ))}
        </div>
      ))}
    </div>
  );
}
