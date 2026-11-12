import { useTranslation } from 'react-i18next';
import { HandCoins, ReceiptText } from 'lucide-react';
import {
  Hero,
  HeroEyebrow,
  HeroTitle,
  SegmentedControl,
  type SegmentOption,
} from '@/shared/components/pulse';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import { companyBranchScope } from '@/modules/ledgers/lib/claim';
import {
  clearClaimParams,
  toLocalDay,
} from '@/modules/ledgers/lib/claim-filters';
import type { LedgersTab as Tab } from '@/modules/ledgers/lib/ledger-status';
import { ClaimTab } from '@/modules/ledgers/_components/claim-tab';
import { LedgersTab } from '@/modules/ledgers/_components/ledgers-tab';

/**
 * Claims (doc §14–15): the Claim tab (completed, unclaimed orders) and the
 * Ledgers tab, in `?tab=`. Each tab is shown only with its permission.
 */
export function LedgersPage() {
  const { t } = useTranslation('ledgers');
  const can = useSpPermissionCheck();
  const { user, groupId, serviceProviderId } = useCurrentUser();
  const { params, update } = useListParams();

  const tabs: SegmentOption<Tab>[] = [
    ...(can('view:service-provider-financial')
      ? [{ id: 'claim' as const, label: t('tabs.claim'), icon: HandCoins }]
      : []),
    ...(can('view:service-provider-ledgers')
      ? [
          {
            id: 'ledgers' as const,
            label: t('tabs.ledgers'),
            icon: ReceiptText,
          },
        ]
      : []),
  ];
  const tab =
    tabs.find((o) => o.id === params.get('tab'))?.id ?? tabs[0]?.id ?? null;

  const scope = companyBranchScope(
    groupId,
    (user?.userCompanyBranches ?? []).map((b) => b.companyBranchId),
  );

  // Switching tabs starts from a clean slate: filters belong to one tab.
  const switchTab = (next: Tab) =>
    update(
      {
        ...clearClaimParams(),
        tab: next,
        q: null,
        from: null,
        to: null,
        status: null,
        ledger: null,
        dialog: null,
      },
      { push: true },
    );

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-10 gap-y-6'>
        <div className='flex flex-[1_1_260px] flex-col gap-2.5'>
          <HeroEyebrow icon={<ReceiptText />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{t('hero.title')}</HeroTitle>
          <p className='text-hero-ink-2'>{t('subtitle')}</p>
        </div>
      </Hero>

      {tab === null ? (
        <Alert variant='destructive'>
          <AlertDescription>{t('noAccess')}</AlertDescription>
        </Alert>
      ) : (
        <>
          {tabs.length > 1 && (
            <SegmentedControl
              options={tabs}
              value={tab}
              onChange={switchTab}
              label={t('tabs.label')}
            />
          )}
          {tab === 'claim' ? (
            <ClaimTab
              serviceProviderId={serviceProviderId}
              scope={scope}
              onClaimed={({ from, to }) =>
                update(
                  {
                    ...clearClaimParams(),
                    tab: 'ledgers',
                    q: null,
                    from: toLocalDay(from),
                    to: toLocalDay(to),
                    status: null,
                    ledger: null,
                    dialog: null,
                  },
                  { push: true },
                )
              }
            />
          ) : (
            <LedgersTab serviceProviderId={serviceProviderId} scope={scope} />
          )}
        </>
      )}
    </>
  );
}
