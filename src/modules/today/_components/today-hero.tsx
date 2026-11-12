import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun } from 'lucide-react';
import { OrderStatus } from '@/shared/api/enums';
import {
  Hero,
  HeroEyebrow,
  HeroTile,
  HeroTitle,
  type HeroTileTone,
} from '@/shared/components/pulse';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatNumber } from '@/shared/lib/format';
import type { ReservationCounts } from '@/modules/today/api/dashboard';
import { partOfDay } from '@/modules/today/lib/part-of-day';

/**
 * KPI tiles: the reservation status they open and the dashboard count that
 * goes with it. The cancelled count is never shown to provider users.
 */
const TILES: {
  key: 'total' | 'new' | 'accepted' | 'checkedIn' | 'inProgress' | 'completed';
  status?: OrderStatus;
  count: keyof ReservationCounts;
  tone: HeroTileTone;
}[] = [
  { key: 'total', count: 'totalCount', tone: 'default' },
  { key: 'new', status: OrderStatus.New, count: 'newCount', tone: 'accent' },
  {
    key: 'accepted',
    status: OrderStatus.Accept,
    count: 'acceptCount',
    tone: 'default',
  },
  {
    key: 'checkedIn',
    status: OrderStatus.CheckIn,
    count: 'checkInCount',
    tone: 'accent',
  },
  {
    key: 'inProgress',
    status: OrderStatus.InProgress,
    count: 'inProgressCount',
    tone: 'warn',
  },
  {
    key: 'completed',
    status: OrderStatus.Complete,
    count: 'completeCount',
    tone: 'up',
  },
];

/** Greeting + reservation KPI tiles, each opening the filtered list. */
export function TodayHero({
  firstName,
  counts,
  loading,
  caption,
}: {
  firstName: string | undefined;
  /** `null` when the API left the section out. */
  counts: ReservationCounts | null | undefined;
  loading: boolean;
  caption: string;
}) {
  const { t } = useTranslation('today');
  // Fixed for the page's lifetime: a greeting that flips mid-visit is noise.
  const [part] = useState(() => partOfDay(new Date().getHours()));
  const name = firstName?.trim();

  return (
    <Hero className='flex flex-col gap-6' aria-busy={loading}>
      <div className='flex flex-col gap-2.5'>
        <HeroEyebrow icon={<Sun />}>{t('hero.eyebrow')}</HeroEyebrow>
        <HeroTitle>
          {name ? t(`hero.${part}`, { name }) : t(`hero.${part}Anonymous`)}
        </HeroTitle>
        <p className='text-hero-ink-2'>{caption}</p>
      </div>
      <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'>
        {TILES.map((tile) => (
          <li key={tile.key} className='flex'>
            {loading ? (
              <div
                aria-hidden
                className='bg-hero-raised/65 flex flex-1 flex-col gap-3 rounded-2xl px-4.5 py-4'
              >
                <Skeleton className='bg-hero-line h-3 w-20' />
                <Skeleton className='bg-hero-line h-8 w-12' />
              </div>
            ) : (
              <Link
                to={
                  tile.status
                    ? `/reservations?status=${tile.status}`
                    : '/reservations'
                }
                className='focus-visible:ring-hero-accent flex flex-1 rounded-2xl transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-2'
              >
                <HeroTile
                  className='flex-1'
                  label={t(`kpi.${tile.key}`)}
                  value={counts ? formatNumber(counts[tile.count] ?? 0) : '—'}
                  tone={tile.tone}
                />
                <span className='sr-only'>{t('kpi.open')}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Hero>
  );
}
