import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { addDays } from 'date-fns';
import { CalendarDays, CalendarRange, Columns3, Table2 } from 'lucide-react';
import { OrderStatus } from '@/shared/api/enums';
import { DataTable } from '@/shared/components/data-table';
import { SingleDateButton } from '@/shared/components/date-range-filter';
import {
  toDateOnly,
  fromDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import {
  Hero,
  HeroEyebrow,
  HeroFigure,
  HeroTile,
  HeroTitle,
  Panel,
  SegmentedControl,
  type SegmentOption,
} from '@/shared/components/pulse';
import { SearchBox } from '@/shared/components/search-box';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { useCurrentUser } from '@/shared/session/current-user';
import { orderListQuery, orderQuery } from '@/modules/reservations/api/orders';
import type { Order } from '@/modules/reservations/api/types';
import { CancelOrderDialog } from '@/modules/reservations/_components/cancel-order-dialog';
import { CompleteOrderDialog } from '@/modules/reservations/_components/complete-order-dialog';
import { OrderBoard } from '@/modules/reservations/_components/order-board';
import { OrderCalendar } from '@/modules/reservations/_components/order-calendar';
import { orderColumns } from '@/modules/reservations/_components/order-columns';
import { OrderDrawer } from '@/modules/reservations/_components/order-drawer';
import {
  BranchFilter,
  ChannelFilter,
  FitFilterSelect,
  MoreFilters,
} from '@/modules/reservations/_components/order-filters';
import {
  clearFiltersPatch,
  countActiveFilters,
  dayRangeToUtc,
  MORE_FILTER_PARAMS,
  ORDER_FILTER_PARAMS,
  parseChannel,
  parseDayParam,
  parseExcludedStatus,
  parseFunding,
  toggleExcludedStatus,
} from '@/modules/reservations/lib/order-filters';
import { useDebouncedParam } from '@/modules/reservations/lib/use-debounced-param';
import { OrderVaccinesDialog } from '@/modules/reservations/_components/order-vaccines-dialog';
import { UpdateResultDialog } from '@/modules/reservations/_components/update-result-dialog';
import { UpdatePriceDialog } from '@/modules/reservations/_components/update-price-dialog';
import { useOrderActions } from '@/modules/reservations/lib/use-order-actions';
import {
  fitParam,
  parseFitFilter,
  parseOrderView,
  parseWeekParam,
  weekParam,
  weekRange,
  type OrderView,
} from '@/modules/reservations/lib/order-views';
import {
  dashboardQuery,
  type ReservationCounts,
} from '@/modules/today/api/dashboard';

const PAGE_SIZE = 20;
/** Board and calendar read one large page instead of paginating. */
const BOARD_PAGE_SIZE = 100;
const CALENDAR_PAGE_SIZE = 200;

/** Status tiles: the filter value and the dashboard count that goes with it. */
const TILES: {
  key:
    | 'all'
    | 'new'
    | 'accepted'
    | 'checkedIn'
    | 'inProgress'
    | 'delayed'
    | 'completed';
  status?: OrderStatus;
  count: keyof ReservationCounts;
}[] = [
  { key: 'all', count: 'totalCount' },
  { key: 'new', status: OrderStatus.New, count: 'newCount' },
  { key: 'accepted', status: OrderStatus.Accept, count: 'acceptCount' },
  { key: 'checkedIn', status: OrderStatus.CheckIn, count: 'checkInCount' },
  {
    key: 'inProgress',
    status: OrderStatus.InProgress,
    count: 'inProgressCount',
  },
  { key: 'delayed', status: OrderStatus.Delayed, count: 'delayedCount' },
  { key: 'completed', status: OrderStatus.Complete, count: 'completeCount' },
];

/**
 * Provider reservations (doc §13): status tiles, search, date, branch,
 * result and channel filters (funding, ID number, phone, city, a from/to
 * range and excluded statuses under "More filters"), a table / board / calendar view (`?view=`, the calendar
 * week in `?week=`), and a details drawer (`?order=`) with its dialogs
 * (`&dialog=complete|cancel|vaccines`) — all in the URL.
 */
export function ReservationsPage() {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const user = useCurrentUser();
  const { params, update, page, idParam } = useListParams();

  const view = parseOrderView(params.get('view'));
  const status = idParam('status');
  const branch = idParam('branch');
  const fit = parseFitFilter(params.get('fit'));
  const date = params.get('date') ?? undefined;
  const weekStart = parseWeekParam(params.get('week'));
  const orderId = params.get('order');
  const dialog = params.get('dialog');

  const channel = parseChannel(params.get('channel'));
  const funding = parseFunding(params.get('funding'));
  const city = idParam('city');
  const from = parseDayParam(params.get('from'));
  const to = parseDayParam(params.get('to'));
  // Unset → the API default (providers: Cancel + NoShow excluded).
  const excluded = parseExcludedStatus(params.get('excl'));

  // Search, ID number and phone: typed locally, written to the URL once the
  // user pauses.
  const [search, setSearch] = useDebouncedParam('q');
  const [idNumber, setIdNumber] = useDebouncedParam('idn');
  const [phone, setPhone] = useDebouncedParam('phone');

  const filters = {
    status,
    search: params.get('q') ?? undefined,
    isFit: fitParam(fit),
    serviceProviderBranchId: branch,
    requestChannel: channel,
    requestFunding: funding,
    identityNumber: params.get('idn') ?? undefined,
    phone: params.get('phone') ?? undefined,
    cityId: city,
    excludedStatus: excluded,
  };
  // Date precedence, kept simple: the calendar's week always drives
  // `from`/`to` (the range filter is hidden there); elsewhere a single
  // appointment date (`?date=`) wins and the `from`/`to` range is not sent;
  // otherwise the range is sent as local day bounds in UTC.
  const list = useQuery(
    orderListQuery(
      view === 'calendar'
        ? {
            ...filters,
            pageNumber: 1,
            pageSize: CALENDAR_PAGE_SIZE,
            ...weekRange(weekStart),
          }
        : {
            ...filters,
            pageNumber: view === 'board' ? 1 : page,
            pageSize: view === 'board' ? BOARD_PAGE_SIZE : PAGE_SIZE,
            ...(date ? { reservationDate: date } : dayRangeToUtc(from, to)),
          },
      user.groupId,
    ),
  );
  // The branch filter is sent to the API (`serviceProviderBranchId`), so
  // totals and pagination match what is shown.
  const rows = list.data?.data ?? [];
  const counts = useQuery(dashboardQuery({}, user)).data?.reservations;
  const openOrder = useQuery({
    ...orderQuery(orderId ?? ''),
    enabled: !!orderId,
  });
  // A dialog in the URL only opens when its action is allowed for this
  // order — the same rules that show its button in the drawer.
  const allowed = useOrderActions(
    openOrder.data ?? { status: OrderStatus.Cancel, isClaimedByProvider: true },
  );

  const openDrawer = (id: string | null, next: string | null = null) =>
    update({ order: id, dialog: next }, { resetPage: false, push: true });
  const openComplete = (o: Order) => openDrawer(o.id, 'complete');
  const setWeek = (start: Date | null) =>
    update({ week: start ? weekParam(start) : null }, { resetPage: false });

  const columns = orderColumns(t, lang, openComplete);
  const total = list.data?.totalRecords;
  const loaded = list.data?.data.length ?? 0;
  const truncated = view !== 'table' && (total ?? 0) > loaded;

  const views: SegmentOption<OrderView>[] = [
    { id: 'table', label: t('views.table'), icon: Table2 },
    { id: 'board', label: t('views.board'), icon: Columns3 },
    { id: 'calendar', label: t('views.calendar'), icon: CalendarRange },
  ];

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-10 gap-y-6'>
        <div className='flex flex-[1_1_260px] flex-col gap-2.5'>
          <HeroEyebrow icon={<CalendarDays />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{t('hero.title')}</HeroTitle>
        </div>
        <HeroFigure
          value={total ?? '—'}
          caption={t('hero.caption', { count: total ?? 0 })}
        />
        <div className='flex flex-wrap gap-3'>
          {TILES.map((tile) => (
            <HeroTile
              key={tile.key}
              label={t(`tiles.${tile.key}`)}
              value={counts?.[tile.count] ?? '—'}
              active={status === tile.status}
              onClick={() =>
                update({ status: tile.status ? String(tile.status) : null })
              }
            />
          ))}
        </div>
      </Hero>

      <div className='flex flex-wrap items-center gap-3'>
        <SegmentedControl
          options={views}
          value={view}
          onChange={(v) => update({ view: v === 'table' ? null : v })}
          label={t('views.label')}
        />
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('filters.search')}
        />
        {/* The calendar's week replaces the single-date filter. */}
        {view !== 'calendar' && (
          <SingleDateButton
            value={date ? fromDateOnly(date) : undefined}
            onChange={(d) => update({ date: d ? toDateOnly(d) : null })}
            placeholder={t('filters.anyDate')}
            lang={lang}
          />
        )}
        <BranchFilter
          value={branch}
          onChange={(b) => update({ branch: b ? String(b) : null })}
        />
        <FitFilterSelect value={fit} onChange={(f) => update({ fit: f })} />
        <ChannelFilter
          value={channel}
          onChange={(c) => update({ channel: c ? String(c) : null })}
        />
        <MoreFilters
          funding={funding}
          onFundingChange={(f) => update({ funding: f ? String(f) : null })}
          idNumber={idNumber}
          onIdNumberChange={setIdNumber}
          city={city}
          onCityChange={(c) => update({ city: c ? String(c) : null })}
          phone={phone}
          onPhoneChange={setPhone}
          showRange={view !== 'calendar'}
          rangeOverridden={!!date && !!(from || to)}
          range={
            from || to
              ? {
                  from: from ? fromDateOnly(from) : undefined,
                  to: to ? fromDateOnly(to) : undefined,
                }
              : undefined
          }
          onRangeChange={(r) =>
            update({
              from: r?.from ? toDateOnly(r.from) : null,
              to: r?.to ? toDateOnly(r.to) : null,
            })
          }
          excluded={excluded}
          onExcludedToggle={(s, on) =>
            update({ excl: toggleExcludedStatus(excluded, s, on) })
          }
          activeCount={countActiveFilters(params, MORE_FILTER_PARAMS)}
          canClear={countActiveFilters(params, ORDER_FILTER_PARAMS) > 0}
          onClear={() => update(clearFiltersPatch())}
        />
      </div>

      {truncated && !list.isError && (
        <p role='status' className='text-ink-3 text-small'>
          {t('views.truncated', { shown: loaded, total: total ?? 0 })}
        </p>
      )}

      {list.isError ? (
        <ListError error={list.error} onRetry={() => void list.refetch()} />
      ) : view === 'board' ? (
        <OrderBoard
          orders={rows}
          loading={list.isPending || list.isPlaceholderData}
          onOpen={(o) => openDrawer(o.id)}
          onComplete={openComplete}
        />
      ) : view === 'calendar' ? (
        <OrderCalendar
          weekStart={weekStart}
          orders={rows}
          loading={list.isPending || list.isPlaceholderData}
          onPrev={() => setWeek(addDays(weekStart, -7))}
          onNext={() => setWeek(addDays(weekStart, 7))}
          onToday={() => setWeek(null)}
          onOpen={(o) => openDrawer(o.id)}
        />
      ) : (
        <>
          <Panel className='animate-enter overflow-hidden'>
            <DataTable
              columns={columns}
              data={rows}
              loading={list.isPending}
              onRowClick={(o) => openDrawer(o.id)}
            />
          </Panel>
          <ListPagination
            pageNumber={page}
            totalPages={list.data?.totalPages ?? 1}
            totalRecords={total}
            onPageChange={(p) =>
              update({ page: String(p) }, { resetPage: false })
            }
            label={t('common.pagination')}
          />
        </>
      )}

      <OrderDrawer
        orderId={orderId}
        onClose={() => openDrawer(null)}
        onComplete={() => openDrawer(orderId, 'complete')}
        onCancel={() => openDrawer(orderId, 'cancel')}
        onEditVaccines={() => openDrawer(orderId, 'vaccines')}
        onUpdateResult={() => openDrawer(orderId, 'result')}
        onUpdatePrice={() => openDrawer(orderId, 'price')}
      />
      {orderId && openOrder.data && (
        <UpdatePriceDialog
          order={openOrder.data}
          open={dialog === 'price' && allowed.updatePrice}
          onClose={() => openDrawer(orderId)}
        />
      )}
      {orderId && openOrder.data && (
        <UpdateResultDialog
          order={openOrder.data}
          open={dialog === 'result' && allowed.updateResult}
          onClose={() => openDrawer(orderId)}
        />
      )}
      {orderId && openOrder.data && (
        <CompleteOrderDialog
          order={openOrder.data}
          open={dialog === 'complete' && allowed.complete}
          onClose={() => openDrawer(orderId)}
        />
      )}
      {orderId && openOrder.data && (
        <OrderVaccinesDialog
          order={openOrder.data}
          open={
            dialog === 'vaccines' &&
            allowed.updateVaccines &&
            allowed.viewVaccines
          }
          onClose={() => openDrawer(orderId)}
        />
      )}
      {orderId && (
        <CancelOrderDialog
          orderId={orderId}
          open={dialog === 'cancel' && allowed.cancel}
          onClose={() => openDrawer(orderId)}
        />
      )}
    </>
  );
}
