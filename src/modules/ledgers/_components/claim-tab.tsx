import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HandCoins, X } from 'lucide-react';
import { DataTable } from '@/shared/components/data-table';
import { SingleDateButton } from '@/shared/components/date-range-filter';
import {
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import { Panel } from '@/shared/components/pulse';
import { SearchBox } from '@/shared/components/search-box';
import { Button } from '@/shared/components/ui/button';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { formatMoney } from '@/shared/lib/format';
import { pickTranslation } from '@/shared/lib/translation';
import { serviceGroupsQuery, servicesQuery } from '@/shared/api/lookups';
import { EnumFilterSelect } from '@/shared/components/enum-filter-select';
import { branchListQuery } from '@/modules/branches/api/branches';
import type { Order } from '@/modules/reservations/api/types';
import { claimableOrdersQuery } from '@/modules/ledgers/api/ledgers';
import { claimSummary } from '@/modules/ledgers/lib/claim';
import {
  claimContext,
  claimParamKeys,
  formatIdList,
  parseId,
  parseIdList,
} from '@/modules/ledgers/lib/claim-filters';
import { claimTaxTotals } from '@/modules/ledgers/lib/claim-totals';
import { formatPeriod } from '@/modules/ledgers/lib/ledger-status';
import { ClaimDialog } from '@/modules/ledgers/_components/claim-dialog';
import { claimableColumns } from '@/modules/ledgers/_components/claimable-columns';
import { ClaimIdFilter } from '@/modules/ledgers/_components/claim-id-filter';

const PAGE_SIZE = 20;

/**
 * Completed, unclaimed orders with row selection, a sticky summary of the
 * selection and the Claim dialog (`?dialog=claim`, doc §14).
 *
 * With a fixed `branchId` (the branch page's Financial tab, §8.6) the list is
 * scoped to that branch, the branch filter is hidden, the claim is sent with
 * `ServiceProviderBranchId` as its context, and every URL key is prefixed with
 * `paramPrefix` so it can't clash with the host page's own params.
 */
export function ClaimTab({
  serviceProviderId,
  scope,
  onClaimed,
  branchId,
  paramPrefix,
}: {
  serviceProviderId: number | null;
  scope: Record<string, number>;
  onClaimed: (period: { from: string | null; to: string | null }) => void;
  branchId?: number;
  paramPrefix?: string;
}) {
  const { t } = useTranslation('ledgers');
  const lang = useUiLang();
  const { params, update: updateParams } = useListParams();
  const keys = claimParamKeys(paramPrefix);
  const page = Math.max(1, Number(params.get(keys.page)) || 1);
  // Filter changes go back to page 1 (our own page key, not the host's).
  const update = (
    patch: Record<string, string | null>,
    { resetPage = true, push = false } = {},
  ) =>
    updateParams(resetPage ? { ...patch, [keys.page]: null } : patch, {
      resetPage: false,
      push,
    });
  const from = params.get(keys.from) ?? undefined;
  const to = params.get(keys.to) ?? undefined;
  const dialog = params.get(keys.dialog);
  const query = params.get(keys.q) ?? '';
  const branchFilter = branchId ?? parseId(params.get(keys.branch));
  const serviceIds = parseIdList(params.get(keys.services));
  const groupIds = parseIdList(params.get(keys.groups));
  // OwnerId (§14.1) is a patient user id and there is no patient lookup
  // endpoint to pick one from, so it has no filter here.

  const branches = useQuery({
    ...branchListQuery({
      pageNumber: 1,
      pageSize: 1000,
      serviceProviderId: serviceProviderId ?? undefined,
    }),
    enabled: branchId === undefined && serviceProviderId !== null,
  });
  const services = useQuery(servicesQuery());
  const groups = useQuery(serviceGroupsQuery());

  // Selection survives paging and filtering; the summary needs the orders.
  const [selected, setSelected] = useState<ReadonlyMap<string, Order>>(
    () => new Map(),
  );

  // Search box: typed locally, written to the URL once the user pauses.
  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  useEffect(() => {
    if (query !== debouncedSearch) {
      update({ [keys.q]: debouncedSearch || null });
    }
    // Only the debounced value drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const list = useQuery(
    claimableOrdersQuery(
      {
        pageNumber: page,
        pageSize: PAGE_SIZE,
        serviceProviderId: serviceProviderId ?? undefined,
        serviceProviderBranchId: branchFilter,
        serviceIds: serviceIds.length ? serviceIds : undefined,
        serviceGroupIds: groupIds.length ? groupIds : undefined,
        from,
        to,
        search: query || undefined,
      },
      scope,
    ),
  );
  const pageOrders = list.data?.data ?? [];

  const toggle = (orders: readonly Order[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const o of orders) {
        if (checked) next.set(o.id, o);
        else next.delete(o.id);
      }
      return next;
    });

  const columns = claimableColumns({
    t,
    lang,
    selected: new Set(selected.keys()),
    pageOrders,
    onToggle: (o, checked) => toggle([o], checked),
    onTogglePage: (checked) => toggle(pageOrders, checked),
  });

  const orders = [...selected.values()];
  const summary = claimSummary(orders);
  const taxTotals = claimTaxTotals(orders);
  const setDialog = (value: string | null) =>
    update({ [keys.dialog]: value }, { resetPage: false, push: true });

  return (
    <>
      <div className='flex flex-wrap items-end gap-3'>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('filters.search')}
        />
        <SingleDateButton
          value={from ? fromDateOnly(from) : undefined}
          onChange={(d) => update({ [keys.from]: d ? toDateOnly(d) : null })}
          maxDate={to ? fromDateOnly(to) : undefined}
          placeholder={t('filters.from')}
          lang={lang}
        />
        <SingleDateButton
          value={to ? fromDateOnly(to) : undefined}
          onChange={(d) => update({ [keys.to]: d ? toDateOnly(d) : null })}
          minDate={from ? fromDateOnly(from) : undefined}
          placeholder={t('filters.to')}
          lang={lang}
        />
        {branchId === undefined && (
          <EnumFilterSelect
            ns='ledgers'
            label={t('filters.branch')}
            value={branchFilter}
            onChange={(v) => update({ [keys.branch]: v ? String(v) : null })}
            options={(branches.data?.data ?? []).map((b) => ({
              value: b.id,
              label: pickTranslation(b.translations, lang)?.name ?? `#${b.id}`,
            }))}
          />
        )}
        <ClaimIdFilter
          label={t('filters.services')}
          options={services.data ?? []}
          value={serviceIds}
          onChange={(ids) => update({ [keys.services]: formatIdList(ids) })}
        />
        <ClaimIdFilter
          label={t('filters.groups')}
          options={groups.data ?? []}
          value={groupIds}
          onChange={(ids) => update({ [keys.groups]: formatIdList(ids) })}
        />
      </div>

      {list.isError ? (
        <ListError error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <Panel className='animate-enter overflow-hidden'>
          <DataTable
            columns={columns}
            data={pageOrders}
            loading={list.isPending}
            onRowClick={(o) => toggle([o], !selected.has(o.id))}
          />
        </Panel>
      )}

      <ListPagination
        pageNumber={page}
        totalPages={list.data?.totalPages ?? 1}
        totalRecords={list.data?.totalRecords}
        onPageChange={(p) =>
          update({ [keys.page]: String(p) }, { resetPage: false })
        }
        label={t('common.pagination')}
      />

      {orders.length > 0 && (
        <section
          aria-label={t('claim.summary.label')}
          className='bg-surface border-line shadow-card animate-enter sticky bottom-4 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border px-5 py-4'
        >
          <span className='text-ink font-bold'>
            {t('claim.summary.selected', { count: orders.length })}
          </span>
          <dl className='flex flex-wrap gap-x-8 gap-y-2'>
            <div className='flex flex-col'>
              <dt className='text-ink-3 text-xs font-bold'>
                {t('claim.summary.cost')}
              </dt>
              <dd className='num text-ink font-bold'>
                {formatMoney(summary.cost)} {t('sar')}
              </dd>
            </div>
            <div className='flex flex-col'>
              <dt className='text-ink-3 text-xs font-bold'>
                {t('claim.summary.costWithTax')}
              </dt>
              <dd className='num text-ink font-bold'>
                {formatMoney(taxTotals.costWithTax)} {t('sar')}
              </dd>
            </div>
            <div className='flex flex-col'>
              <dt className='text-ink-3 text-xs font-bold'>
                {t('claim.summary.sellPrice')}
              </dt>
              <dd className='num text-ink font-bold'>
                {formatMoney(summary.sellPrice)} {t('sar')}
              </dd>
            </div>
            <div className='flex flex-col'>
              <dt className='text-ink-3 text-xs font-bold'>
                {t('claim.summary.sellPriceWithTax')}
              </dt>
              <dd className='num text-ink font-bold'>
                {formatMoney(taxTotals.sellPriceWithTax)} {t('sar')}
              </dd>
            </div>
            <div className='flex flex-col'>
              <dt className='text-ink-3 text-xs font-bold'>
                {t('claim.summary.period')}
              </dt>
              <dd className='num text-ink font-bold'>
                {formatPeriod(summary.from, summary.to, lang)}
              </dd>
            </div>
          </dl>
          <div className='ms-auto flex gap-2.5'>
            <Button variant='ghost' onClick={() => setSelected(new Map())}>
              <X />
              {t('claim.summary.clear')}
            </Button>
            <Button variant='brand' onClick={() => setDialog('claim')}>
              <HandCoins />
              {t('claim.summary.claim')}
            </Button>
          </div>
        </section>
      )}

      <ClaimDialog
        orders={orders}
        context={claimContext(serviceProviderId, branchId)}
        open={dialog === 'claim' && orders.length > 0}
        onClose={() => setDialog(null)}
        onClaimed={(period) => {
          setSelected(new Map());
          onClaimed(period);
        }}
      />
    </>
  );
}
