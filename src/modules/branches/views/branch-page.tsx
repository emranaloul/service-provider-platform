import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Building2, MapPin, Pencil } from 'lucide-react';
import { classificationsQuery, namesById } from '@/shared/api/lookups';
import { mediaUrl } from '@/shared/api/media';
import { ActiveStatusBadge } from '@/shared/components/active-status-badge';
import { ListError } from '@/shared/components/list-error';
import {
  Hero,
  HeroEyebrow,
  HeroTitle,
  IconTile,
  Panel,
  PanelHeader,
  Tag,
} from '@/shared/components/pulse';
import { PageSkeleton } from '@/shared/components/skeletons';
import { Button } from '@/shared/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { joinList } from '@/shared/lib/format';
import { pickTranslation } from '@/shared/lib/translation';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import { branchQuery } from '@/modules/branches/api/branches';
import type { Branch } from '@/modules/branches/api/types';
import { BranchFormSheet } from '@/modules/branches/_components/branch-form-sheet';
import { OfferingsPanel } from '@/modules/branches/_components/offerings-panel';
import { SlotScheduleEditor } from '@/modules/branches/_components/slot-schedule-editor';
import { companyBranchScope } from '@/modules/ledgers/lib/claim';
import {
  claimedLedgersUrl,
  clearClaimParams,
} from '@/modules/ledgers/lib/claim-filters';
import { ClaimTab } from '@/modules/ledgers/_components/claim-tab';

const TABS = ['overview', 'offerings', 'slots', 'financial'] as const;
type Tab = (typeof TABS)[number];

/** The Financial tab's claim params are prefixed (`claimQ`, `claimPage`, …). */
const CLAIM_PREFIX = 'claim';

/**
 * One branch: details, what it offers (§10, §11), its weekly schedule (§9)
 * and its claims (§8.6: Financial, filtered by `ServiceProviderBranchId`).
 */
export function BranchPage() {
  const { t } = useTranslation('branches');
  const { t: tl } = useTranslation('ledgers');
  const lang = useUiLang();
  const can = useSpPermissionCheck();
  const navigate = useNavigate();
  const { user, groupId, serviceProviderId } = useCurrentUser();
  const id = Number(useParams().id);
  const { params, update } = useListParams();
  const branch = useQuery({ ...branchQuery(id), enabled: id > 0 });
  const classifications = useQuery(classificationsQuery());

  const allowed: Record<Tab, boolean> = {
    overview: true,
    offerings: can('view:branch-services') || can('view:branch-vaccines'),
    slots:
      can('view:service-provider-branch-slots') ||
      can('view:service-provider-branch-vaccine-slots'),
    financial: can('view:service-provider-financial'),
  };
  const requested = params.get('tab') as Tab | null;
  const tab: Tab =
    requested && TABS.includes(requested) && allowed[requested]
      ? requested
      : 'overview';
  const editing = params.get('edit') === '1';
  const scope = companyBranchScope(
    groupId,
    (user?.userCompanyBranches ?? []).map((cb) => cb.companyBranchId),
  );

  if (branch.isPending) return <PageSkeleton tiles={0} side={false} />;
  if (branch.isError) {
    return (
      <ListError error={branch.error} onRetry={() => void branch.refetch()} />
    );
  }

  const b = branch.data;
  const tr = pickTranslation(b.translations, lang);
  const classification = namesById(classifications.data).get(
    b.serviceProviderClassificationId,
  );
  const logo = mediaUrl(b.logo);

  return (
    <>
      <Button variant='ghost' size='sm' className='self-start' asChild>
        <Link to='/branches'>
          <ArrowRight className='ltr:rotate-180' />
          {t('detail.back')}
        </Link>
      </Button>

      <Hero className='flex flex-wrap items-center gap-x-8 gap-y-5'>
        {logo && (
          <img
            src={logo}
            alt=''
            className='size-16 shrink-0 rounded-2xl object-cover'
          />
        )}
        <div className='flex flex-[1_1_260px] flex-col gap-2'>
          <HeroEyebrow icon={<MapPin />}>
            {joinList([b.cityName, b.countryName], lang)}
          </HeroEyebrow>
          <HeroTitle>{tr?.name ?? `#${b.id}`}</HeroTitle>
          <p className='text-hero-ink-2'>{tr?.address}</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          {classification && <Tag>{classification}</Tag>}
          <ActiveStatusBadge ns='branches' active={b.status} />
          {can('update:service-provider-branch') && (
            <Button
              variant='hero'
              onClick={() => update({ edit: '1' }, { resetPage: false })}
            >
              <Pencil />
              {t('actions.edit')}
            </Button>
          )}
        </div>
      </Hero>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          update(
            {
              ...clearClaimParams(CLAIM_PREFIX),
              tab: v === 'overview' ? null : v,
            },
            { resetPage: false },
          )
        }
        className='gap-5'
      >
        <TabsList>
          {TABS.filter((key) => allowed[key]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {key === 'financial'
                ? tl('tabs.financial')
                : t(`detail.tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value='overview'>
          <BranchDetails branch={b} classification={classification} />
        </TabsContent>
        {allowed.offerings && (
          <TabsContent value='offerings'>
            <OfferingsPanel branch={b} />
          </TabsContent>
        )}
        {allowed.slots && (
          <TabsContent value='slots'>
            <SlotScheduleEditor branch={b} />
          </TabsContent>
        )}
        {allowed.financial && (
          <TabsContent value='financial' className='flex flex-col gap-5'>
            <ClaimTab
              serviceProviderId={serviceProviderId}
              scope={scope}
              branchId={b.id}
              paramPrefix={CLAIM_PREFIX}
              onClaimed={(period) => void navigate(claimedLedgersUrl(period))}
            />
          </TabsContent>
        )}
      </Tabs>

      <BranchFormSheet
        branchId={editing ? b.id : null}
        onClose={() => update({ edit: null }, { resetPage: false })}
      />
    </>
  );
}

function BranchDetails({
  branch: b,
  classification,
}: {
  branch: Branch;
  classification: string | undefined;
}) {
  const { t } = useTranslation('branches');
  const lang = useUiLang();
  const tr = pickTranslation(b.translations, lang);
  const mapUrl = `https://www.google.com/maps?q=${b.latitude},${b.longitude}`;

  const rows: [string, ReactNode][] = [
    [t('detail.name'), tr?.name],
    [t('detail.address'), tr?.address],
    [t('detail.classification'), classification ?? '—'],
    [t('detail.location'), joinList([b.cityName, b.countryName], lang)],
    [
      t('detail.coordinates'),
      <span key='c' className='flex flex-wrap items-center gap-3'>
        <span dir='ltr' className='num'>
          {b.latitude}, {b.longitude}
        </span>
        <a
          href={mapUrl}
          target='_blank'
          rel='noreferrer'
          className='text-brand font-bold'
        >
          {t('detail.openMap')}
        </a>
      </span>,
    ],
    [
      t('detail.contact'),
      <span key='p' className='flex flex-col'>
        <span>
          {b.firstName} {b.lastName}
        </span>
        <span dir='ltr' className='num text-ink-2 text-start'>
          {b.phone}
        </span>
        <span dir='ltr' className='text-ink-2 text-start'>
          {b.email}
        </span>
      </span>,
    ],
    [
      t('detail.tags'),
      b.tags?.length ? (
        <span key='t' className='flex flex-wrap gap-1.5'>
          {b.tags.map((tag) => (
            <Tag key={tag.id}>{tag.tagName}</Tag>
          ))}
        </span>
      ) : (
        t('detail.noTags')
      ),
    ],
    [
      t('detail.status'),
      <ActiveStatusBadge key='s' ns='branches' active={b.status} />,
    ],
  ];

  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile>
            <Building2 />
          </IconTile>
        }
        title={t('detail.info')}
      />
      <dl className='grid grid-cols-[minmax(110px,180px)_minmax(0,1fr)] gap-x-4 gap-y-3 px-5 pb-6'>
        {rows.map(([label, value]) => (
          <div key={label} className='contents'>
            <dt className='text-ink-2'>{label}</dt>
            <dd className='font-semibold'>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
