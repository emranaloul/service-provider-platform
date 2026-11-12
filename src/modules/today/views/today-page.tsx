import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarClock, ReceiptText, Sun } from 'lucide-react';
import {
  Hero,
  HeroEyebrow,
  HeroTile,
  HeroTitle,
  IconTile,
  Panel,
  PanelHeader,
} from '@/shared/components/pulse';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Button } from '@/shared/components/ui/button';
import { MOCK_RESERVATIONS } from '@/modules/reservations/lib/mock-reservations';

/**
 * Today — the landing page (docs/design/Main.dc.html): who arrives today,
 * what is waiting, what is overdue. Sample data only.
 * TODO(backend): counts endpoint for the tiles; tiles link to pre-filtered
 * reservation views.
 */
export function TodayPage() {
  const { t } = useTranslation('today');
  const arrivals = MOCK_RESERVATIONS.slice(0, 3);

  return (
    <>
      <Hero className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2.5'>
          <HeroEyebrow icon={<Sun />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{t('hero.title', { name: 'Kordy' })}</HeroTitle>
        </div>
        <div className='flex flex-wrap gap-3'>
          <HeroTile label={t('kpi.arrivals')} value={2} tone='accent' />
          <HeroTile label={t('kpi.inCenter')} value={1} />
          <HeroTile label={t('kpi.delayed')} value={1} tone='warn' />
          <HeroTile label={t('kpi.unpaid')} value={3} tone='down' />
        </div>
      </Hero>

      <div className='grid gap-5 lg:grid-cols-[3fr_2fr]'>
        <Panel className='animate-enter'>
          <PanelHeader
            icon={
              <IconTile tone='accent'>
                <CalendarClock />
              </IconTile>
            }
            title={t('arrivals.title')}
          />
          <ul className='flex flex-col px-5 pb-4'>
            {arrivals.map((r) => (
              <li
                key={r.id}
                className='border-line flex items-center gap-3 border-t py-3'
              >
                <div className='flex min-w-0 flex-1 flex-col'>
                  <span className='font-bold'>{r.name}</span>
                  <span className='text-ink-3 text-xs'>
                    {r.service} · {r.branch}
                  </span>
                </div>
                <ReservationStatusBadge status={r.status} />
                <Button size='sm' variant='outline'>
                  {t('arrivals.checkIn')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className='animate-enter'>
          <PanelHeader
            icon={
              <IconTile tone='warn'>
                <AlertTriangle />
              </IconTile>
            }
            title={t('attention.title')}
          />
          <ul className='flex flex-col px-5 pb-4'>
            <li className='border-line flex items-center gap-3 border-t py-3'>
              <IconTile tone='down'>
                <ReceiptText />
              </IconTile>
              <span className='flex-1'>
                {t('attention.unpaidClaims', { count: 3 })}
              </span>
              <Button size='sm' variant='ghost'>
                {t('attention.open')}
              </Button>
            </li>
            <li className='border-line flex items-center gap-3 border-t py-3'>
              <IconTile tone='warn'>
                <CalendarClock />
              </IconTile>
              <span className='flex-1'>{t('attention.closingDay')}</span>
              <Button size='sm' variant='ghost'>
                {t('attention.open')}
              </Button>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
