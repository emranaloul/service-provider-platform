import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/shared/components/data-table';
import { SingleDateButton } from '@/shared/components/date-range-filter';
import { EnumFilterSelect } from '@/shared/components/enum-filter-select';
import {
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import { Panel } from '@/shared/components/pulse';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { ledgerListQuery, ledgerRowQuery } from '@/modules/ledgers/api/ledgers';
import {
  LEDGER_STATUS,
  LEDGER_STATUSES,
  parseLedgerStatus,
} from '@/modules/ledgers/lib/ledger-status';
import { ledgerColumns } from '@/modules/ledgers/_components/ledger-columns';
import { LedgerDrawer } from '@/modules/ledgers/_components/ledger-drawer';

const PAGE_SIZE = 20;

/** The provider's ledgers, newest claim first, with a details drawer (`?ledger=`, doc §15). */
export function LedgersTab({
  serviceProviderId,
  scope,
}: {
  serviceProviderId: number | null;
  scope: Record<string, number>;
}) {
  const { t } = useTranslation('ledgers');
  const lang = useUiLang();
  const { params, update, page, idParam } = useListParams();
  const status = parseLedgerStatus(idParam('status'));
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  const ledgerId = idParam('ledger') ?? null;

  const list = useQuery(
    ledgerListQuery(
      {
        pageNumber: page,
        pageSize: PAGE_SIZE,
        serviceProviderId: serviceProviderId ?? undefined,
        from,
        to,
        status,
      },
      scope,
    ),
  );

  // The drawer needs the list row (status, period, totals, admin note). When
  // the ledger is not on this page — e.g. opened from a shared link — look
  // it up separately instead of hiding those fields.
  const onPage = ledgerId
    ? list.data?.data.find((l) => l.id === ledgerId)
    : undefined;
  const lookup = useQuery({
    ...ledgerRowQuery(
      ledgerId ?? 0,
      { serviceProviderId: serviceProviderId ?? undefined, from, to },
      scope,
    ),
    enabled: !!ledgerId && !!list.data && !onPage,
  });
  const drawerLedger = onPage ?? lookup.data ?? undefined;

  const openDrawer = (id: number | null) =>
    update(
      { ledger: id === null ? null : String(id) },
      { resetPage: false, push: true },
    );

  const columns = ledgerColumns(t, lang);

  return (
    <>
      <div className='flex flex-wrap items-end gap-3'>
        <EnumFilterSelect
          ns='ledgers'
          label={t('filters.status')}
          value={status}
          onChange={(v) => update({ status: v ? String(v) : null })}
          options={LEDGER_STATUSES.map((s) => ({
            value: s,
            label: t(`status.${LEDGER_STATUS[s].key}`),
          }))}
        />
        <SingleDateButton
          value={from ? fromDateOnly(from) : undefined}
          onChange={(d) => update({ from: d ? toDateOnly(d) : null })}
          maxDate={to ? fromDateOnly(to) : undefined}
          placeholder={t('filters.from')}
          lang={lang}
        />
        <SingleDateButton
          value={to ? fromDateOnly(to) : undefined}
          onChange={(d) => update({ to: d ? toDateOnly(d) : null })}
          minDate={from ? fromDateOnly(from) : undefined}
          placeholder={t('filters.to')}
          lang={lang}
        />
      </div>

      {list.isError ? (
        <ListError error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <Panel className='animate-enter overflow-hidden'>
          <DataTable
            columns={columns}
            data={list.data?.data ?? []}
            loading={list.isPending}
            onRowClick={(l) => openDrawer(l.id)}
          />
        </Panel>
      )}

      <ListPagination
        pageNumber={page}
        totalPages={list.data?.totalPages ?? 1}
        totalRecords={list.data?.totalRecords}
        onPageChange={(p) => update({ page: String(p) }, { resetPage: false })}
        label={t('common.pagination')}
      />

      <LedgerDrawer
        ledgerId={ledgerId}
        ledger={drawerLedger}
        onClose={() => openDrawer(null)}
      />
    </>
  );
}
