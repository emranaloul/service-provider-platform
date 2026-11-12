import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateRangeFilter } from '@/shared/components/date-range-filter';
import {
  academyToday,
  fromDateOnly,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import { ListError } from '@/shared/components/list-error';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { pickTranslation } from '@/shared/lib/translation';
import { cn } from '@/shared/lib/utils';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import { branchListQuery } from '@/modules/branches/api/branches';
import { orderListQuery } from '@/modules/reservations/api/orders';
import { dashboardQuery } from '@/modules/today/api/dashboard';
import { AppointmentsPanel } from '@/modules/today/_components/appointments-panel';
import {
  BranchFilter,
  type BranchOption,
} from '@/modules/today/_components/branch-filter';
import { PanelSkeleton } from '@/modules/today/_components/panel-bits';
import {
  BranchesPanel,
  ClaimsPanel,
  FinancialPanel,
} from '@/modules/today/_components/summary-panels';
import { TodayHero } from '@/modules/today/_components/today-hero';
import {
  formatBranchParam,
  parseBranchParam,
} from '@/modules/today/lib/branch-param';

const APPOINTMENTS = 8;

/** `YYYY-MM-DD` from the URL, or `undefined` when missing / malformed. */
const dateParam = (v: string | null) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;

/**
 * Today — the landing page (docs/design/Main.dc.html): reservation KPIs for
 * the chosen dates (`?from=&to=`) and branches (`?branches=`, A-Z §29),
 * today's appointments, and the financial,
 * claims and branch summaries — all from `Dashboard/Summary` (missing items
 * §9) plus today's `ShortcutList`.
 */
export function TodayPage() {
  const { t } = useTranslation('today');
  const user = useCurrentUser();
  const can = useSpPermissionCheck();
  const { params, update } = useListParams();
  const lang = useUiLang();

  const [today] = useState(academyToday);

  const from = dateParam(params.get('from'));
  const to = dateParam(params.get('to'));

  const canBranches = can('view:service-provider-branch');
  // Without the branch permission the filter is not shown, so a `branches`
  // param in a shared link is ignored rather than silently narrowing the
  // figures with no way to see or clear it.
  const branchParam = canBranches ? params.get('branches') : null;
  const branchIds = useMemo(() => parseBranchParam(branchParam), [branchParam]);
  // A single branch also narrows today's appointments (Reservation/List);
  // several are not supported there, so the list stays on all branches.
  const singleBranch = branchIds.length === 1 ? branchIds[0] : undefined;

  const branches = useQuery({
    ...branchListQuery({
      pageNumber: 1,
      pageSize: 1000,
      serviceProviderId: user.serviceProviderId ?? undefined,
    }),
    enabled: canBranches && user.serviceProviderId != null,
  });
  const branchOptions = useMemo<BranchOption[]>(
    () =>
      (branches.data?.data ?? []).map((b) => ({
        id: b.id,
        name:
          pickTranslation(b.translations, lang)?.name ??
          t('filters.unnamedBranch', { id: b.id }),
      })),
    [branches.data, lang, t],
  );

  const summary = useQuery(
    dashboardQuery(
      { from, to, branchIds: branchIds.length ? branchIds : undefined },
      user,
    ),
  );
  const appointments = useQuery(
    orderListQuery(
      {
        pageNumber: 1,
        pageSize: APPOINTMENTS,
        reservationDate: today,
        serviceProviderBranchId: singleBranch,
      },
      user.groupId,
    ),
  );

  const canFinancial = can('view:service-provider-financial');
  const canLedgers = can('view:service-provider-ledgers');
  const data = summary.data;
  const loading = summary.isPending;

  return (
    <>
      <TodayHero
        firstName={user.user?.firstName}
        counts={data?.reservations}
        loading={loading}
        caption={t(from || to ? 'hero.range' : 'hero.allTime')}
      />

      <div className='flex flex-wrap items-center gap-3'>
        <DateRangeFilter
          value={
            from || to
              ? {
                  from: from ? fromDateOnly(from) : undefined,
                  to: to ? fromDateOnly(to) : undefined,
                }
              : undefined
          }
          onChange={(r) =>
            update({
              from: r?.from ? toDateOnly(r.from) : null,
              to: r?.to ? toDateOnly(r.to) : null,
            })
          }
          fromPlaceholder={t('filters.from')}
          toPlaceholder={t('filters.to')}
        />
        {canBranches && user.serviceProviderId != null && (
          <BranchFilter
            options={branchOptions}
            value={branchIds}
            loading={branches.isPending}
            onChange={(ids) => update({ branches: formatBranchParam(ids) })}
          />
        )}
      </div>

      {summary.isError && (
        <ListError
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />
      )}

      <div className='grid items-start gap-5 lg:grid-cols-[3fr_2fr]'>
        <div className={cn(!canFinancial && 'lg:col-span-2')}>
          <AppointmentsPanel
            orders={appointments.data?.data}
            loading={appointments.isPending}
            error={appointments.isError ? appointments.error : undefined}
            onRetry={() => void appointments.refetch()}
            note={
              branchIds.length > 1 ? t('appointments.allBranches') : undefined
            }
          />
        </div>
        {canFinancial &&
          (loading ? (
            <PanelSkeleton rows={6} />
          ) : (
            <FinancialPanel data={data?.reservationFinancial ?? null} />
          ))}
        {canLedgers && (
          <div className={cn(!canBranches && 'lg:col-span-2')}>
            {loading ? (
              <PanelSkeleton rows={5} />
            ) : (
              <ClaimsPanel data={data?.ledgers ?? null} />
            )}
          </div>
        )}
        {canBranches && (
          <div className={cn(!canLedgers && 'lg:col-span-2')}>
            {loading ? (
              <PanelSkeleton rows={3} />
            ) : (
              <BranchesPanel data={data?.serviceProviderBranches ?? null} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
