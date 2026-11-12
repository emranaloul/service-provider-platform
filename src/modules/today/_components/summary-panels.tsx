import { useTranslation } from 'react-i18next';
import {
  CircleCheck,
  CircleDashed,
  MapPin,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { IconTile, Panel, PanelHeader } from '@/shared/components/pulse';
import { StatusBadge } from '@/shared/components/status-badge';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format';
import type { DashboardSummary } from '@/modules/today/api/dashboard';
import {
  PanelEmpty,
  PanelLink,
  StatRow,
} from '@/modules/today/_components/panel-bits';

/** How many ledgers the claims panel lists. */
const LATEST_LEDGERS = 4;

function Money({ value }: { value: number }) {
  const { t } = useTranslation('today');
  return (
    <>
      {formatMoney(value)}
      <span className='text-ink-3 text-xs font-normal'>{t('sar')}</span>
    </>
  );
}

/** Reservation money for the period, split claimed / not claimed. */
export function FinancialPanel({
  data,
}: {
  data: DashboardSummary['reservationFinancial'];
}) {
  const { t } = useTranslation('today');
  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile tone='up'>
            <WalletCards />
          </IconTile>
        }
        title={t('financial.title')}
        description={t('financial.description')}
        actions={<PanelLink to='/ledgers'>{t('financial.open')}</PanelLink>}
      />
      {!data ? (
        <PanelEmpty icon={WalletCards}>{t('financial.empty')}</PanelEmpty>
      ) : (
        <dl className='flex flex-col px-5 pb-4'>
          <StatRow
            label={t('financial.reservations')}
            value={formatNumber(data.totalReservationCount ?? 0)}
          />
          <StatRow
            label={t('financial.cost')}
            value={
              <Money value={(data.totalCost ?? 0) + (data.totalCostTax ?? 0)} />
            }
          />
          <StatRow
            label={t('financial.sellPrice')}
            value={
              <Money
                value={
                  (data.totalSellPrice ?? 0) + (data.totalSellPriceTax ?? 0)
                }
              />
            }
          />
          <StatRow
            label={t('financial.profit')}
            value={<Money value={data.profit ?? 0} />}
          />
          <StatRow
            label={<StatusBadge variant='up' label={t('financial.claimed')} />}
            value={formatNumber(data.claimed?.reservationCount ?? 0)}
          />
          <StatRow
            label={
              <StatusBadge variant='warn' label={t('financial.notClaimed')} />
            }
            value={formatNumber(data.notClaimed?.reservationCount ?? 0)}
          />
        </dl>
      )}
    </Panel>
  );
}

/** Ledger totals and the latest ledgers. */
export function ClaimsPanel({ data }: { data: DashboardSummary['ledgers'] }) {
  const { t } = useTranslation('today');
  const lang = useUiLang();
  const latest = (data?.ledgers ?? []).slice(0, LATEST_LEDGERS);

  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile tone='accent'>
            <ReceiptText />
          </IconTile>
        }
        title={t('claims.title')}
        description={t('claims.description')}
        actions={
          <PanelLink to='/ledgers?tab=ledgers'>{t('claims.open')}</PanelLink>
        }
      />
      {!data ? (
        <PanelEmpty icon={ReceiptText}>{t('claims.empty')}</PanelEmpty>
      ) : (
        <div className='flex flex-col px-5 pb-4'>
          <dl className='flex flex-col'>
            <StatRow
              label={t('claims.count')}
              value={formatNumber(data.totalLedgersCount ?? 0)}
            />
            <StatRow
              label={t('claims.claimedReservations')}
              value={formatNumber(data.totalClaimedReservations ?? 0)}
            />
            <StatRow
              label={t('claims.cost')}
              value={<Money value={data.totalCost ?? 0} />}
            />
            <StatRow
              label={t('claims.sellPrice')}
              value={<Money value={data.totalSellPrice ?? 0} />}
            />
            <StatRow
              label={t('claims.profit')}
              value={<Money value={data.profit ?? 0} />}
            />
          </dl>
          {latest.length > 0 && (
            <>
              <h3 className='text-ink-3 border-line border-t pt-4 pb-1 text-xs font-bold'>
                {t('claims.latest')}
              </h3>
              <ul className='flex flex-col'>
                {latest.map((l) => (
                  <li
                    key={l.id}
                    className='border-line flex items-center gap-3 border-t py-3 first:border-t-0'
                  >
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='text-ink font-bold'>
                        {t('claims.ledger', { id: l.id })}
                      </span>
                      <span className='text-ink-3 truncate text-xs'>
                        {t('claims.period', {
                          from: formatDate(l.claimedFrom, lang),
                          to: formatDate(l.claimedTo, lang),
                        })}
                        {' · '}
                        {t('claims.reservations', {
                          count: l.claimedReservationsCount ?? 0,
                        })}
                        {l.claimedBy &&
                          ` · ${t('claims.by', { name: l.claimedBy })}`}
                      </span>
                    </div>
                    <span className='num text-ink flex items-baseline gap-1.5 font-bold'>
                      <Money value={l.sellPrice ?? 0} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

/** Active / inactive branch counts. */
export function BranchesPanel({
  data,
}: {
  data: DashboardSummary['serviceProviderBranches'];
}) {
  const { t } = useTranslation('today');
  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile>
            <MapPin />
          </IconTile>
        }
        title={t('branches.title')}
        description={t('branches.description')}
        actions={<PanelLink to='/branches'>{t('branches.open')}</PanelLink>}
      />
      {!data ? (
        <PanelEmpty icon={MapPin}>{t('branches.empty')}</PanelEmpty>
      ) : (
        <dl className='flex flex-col px-5 pb-4'>
          <StatRow
            label={
              <span className='flex items-center gap-2'>
                <CircleCheck aria-hidden className='text-up size-4' />
                {t('branches.active')}
              </span>
            }
            value={formatNumber(data.activeServiceProviderBranches ?? 0)}
          />
          <StatRow
            label={
              <span className='flex items-center gap-2'>
                <CircleDashed aria-hidden className='text-ink-3 size-4' />
                {t('branches.inactive')}
              </span>
            }
            value={formatNumber(data.inactiveServiceProviderBranches ?? 0)}
          />
          <StatRow
            label={t('branches.total')}
            value={formatNumber(data.totalCount ?? 0)}
          />
        </dl>
      )}
    </Panel>
  );
}
