import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Columns3, Download, Table2 } from 'lucide-react';
import {
  FilterBar,
  FilterChip,
  Hero,
  HeroEyebrow,
  HeroFigure,
  HeroTile,
  HeroTitle,
  Panel,
  SegmentedControl,
} from '@/shared/components/pulse';
import { DataTable } from '@/shared/components/data-table';
import { Button } from '@/shared/components/ui/button';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { reservationColumns } from '@/modules/reservations/_components/reservation-columns';
import { MOCK_RESERVATIONS } from '@/modules/reservations/lib/mock-reservations';

const SAVED_VIEWS = ['today', 'upcoming', 'attention', 'all'] as const;
type SavedView = (typeof SAVED_VIEWS)[number];

/**
 * Reservations — Table view (docs/design/Reservations.dc.html).
 * Reference implementation of the page pattern: Hero with saved-view tiles,
 * view switcher, filter bar, table in a Panel. The saved view lives in the
 * URL (`?view=`) so back/refresh keep it.
 *
 * TODO: Board (Board.dc.html) and Calendar (Calendar.dc.html) views,
 * preview drawer, bulk bar, real API + server-side filters.
 */
export function ReservationsPage() {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as SavedView | null) ?? 'all';

  // Sample counts. TODO(backend): a counts endpoint per saved view.
  const counts: Record<SavedView, number> = {
    today: 2,
    upcoming: 3,
    attention: 1,
    all: MOCK_RESERVATIONS.length,
  };
  const columns = useMemo(() => reservationColumns(t, lang), [t, lang]);

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-10 gap-y-6'>
        <div className='flex flex-[1_1_260px] flex-col gap-2.5'>
          <HeroEyebrow icon={<CalendarDays />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{t('hero.title')}</HeroTitle>
        </div>
        <HeroFigure value={counts[view]} caption={t('hero.caption')} />
        <div className='flex flex-wrap gap-3'>
          {SAVED_VIEWS.map((v) => (
            <HeroTile
              key={v}
              label={t(`savedViews.${v}`)}
              value={counts[v]}
              tone={v === 'attention' ? 'warn' : 'default'}
              active={view === v}
              onClick={() => setParams({ view: v }, { replace: true })}
            />
          ))}
        </div>
      </Hero>

      <div className='flex flex-wrap items-center gap-2.5'>
        <SegmentedControl
          label={t('views.label')}
          value='table'
          options={[
            {
              id: 'table',
              label: t('views.table'),
              icon: Table2,
              to: '/reservations',
            },
            { id: 'board', label: t('views.board'), icon: Columns3 },
            { id: 'calendar', label: t('views.calendar'), icon: CalendarDays },
          ]}
        />
        <FilterBar
          label={t('common.filters', { ns: 'shell' })}
          leadLabel={t('common.filters', { ns: 'shell' })}
        >
          <FilterChip active>
            Test2 · <span className='num'>4</span>
          </FilterChip>
          <FilterChip active>
            Test 3 · <span className='num'>2</span>
          </FilterChip>
          <FilterChip>
            {t('columns.status')}: {t('common.all', { ns: 'shell' })}
          </FilterChip>
        </FilterBar>
        <div className='flex-1' />
        <Button variant='outline'>
          <Download />
          {t('common.exportCsv', { ns: 'shell' })}
        </Button>
      </div>

      <Panel className='animate-enter overflow-hidden'>
        <DataTable columns={columns} data={MOCK_RESERVATIONS} />
      </Panel>
    </>
  );
}
