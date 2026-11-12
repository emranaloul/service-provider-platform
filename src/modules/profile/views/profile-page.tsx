import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, Pencil } from 'lucide-react';
import { mediaUrl } from '@/shared/api/media';
import { ActiveStatusBadge } from '@/shared/components/active-status-badge';
import { ListError } from '@/shared/components/list-error';
import { Hero, HeroEyebrow, HeroTitle, Tag } from '@/shared/components/pulse';
import { PageSkeleton } from '@/shared/components/skeletons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { pickTranslation } from '@/shared/lib/translation';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import { providerQuery } from '@/modules/profile/api/provider';
import { workspaceProviderId } from '@/modules/profile/lib/provider-access';
import { ProviderAttachmentsPanel } from '@/modules/profile/_components/provider-attachments-panel';
import { ProviderFaqsPanel } from '@/modules/profile/_components/provider-faqs-panel';
import { ProviderOverview } from '@/modules/profile/_components/provider-overview';
import { ProviderSettingsForm } from '@/modules/profile/_components/provider-settings-form';
import { useCategoryOptions } from '@/modules/profile/_components/provider-shared';
import { ProviderTagsPanel } from '@/modules/profile/_components/provider-tags-panel';

const TABS = ['overview', 'settings', 'attachments', 'tags', 'faqs'] as const;
type Tab = (typeof TABS)[number];

/**
 * Provider profile workspace (doc §6, §7, §17). The provider is the
 * `?provider=` id for an Admin, otherwise the signed-in user's own (§17.1);
 * tabs live in `?tab=` and each needs its permission (§17.2).
 */
export function ProfilePage() {
  const { t } = useTranslation('profile');
  const user = useCurrentUser();
  const { idParam } = useListParams();
  const providerId = workspaceProviderId(user, idParam('provider') ?? null);

  if (!providerId) {
    return (
      <Alert>
        <AlertCircle />
        <AlertTitle>{t('noProvider.title')}</AlertTitle>
        <AlertDescription>{t('noProvider.description')}</AlertDescription>
      </Alert>
    );
  }
  return <ProviderWorkspace providerId={providerId} />;
}

function ProviderWorkspace({ providerId }: { providerId: number }) {
  const { t } = useTranslation('profile');
  const lang = useUiLang();
  const can = useSpPermissionCheck();
  const { params, update } = useListParams();
  const provider = useQuery(providerQuery(providerId));
  const categories = useCategoryOptions();

  const allowed: Record<Tab, boolean> = {
    overview: can('view:service-provider-overview'),
    settings: can('view:service-provider-settings'),
    attachments:
      can('view:service-provider-attachments') ||
      can('upload:service-provider-attachments'),
    // OPEN QUESTION: no dedicated tags permission exists (doc §17.2 says
    // `view:service-provider-orders`); gated with the settings flags for now.
    tags: can('view:service-provider-settings'),
    // OPEN QUESTION: doc §17.2 says company-area `view:company`; shown to
    // every signed-in provider user until that is confirmed.
    faqs: true,
  };
  const visible = TABS.filter((key) => allowed[key]);
  const fallback: Tab = visible[0] ?? 'faqs';
  const requested = params.get('tab') as Tab | null;
  const tab: Tab =
    requested && TABS.includes(requested) && allowed[requested]
      ? requested
      : fallback;
  const setTab = (next: Tab) =>
    // Leaving a tab closes its URL dialog (`?tag=` belongs to the Tags tab).
    update(
      { tab: next === fallback ? null : next, tag: null },
      { resetPage: false },
    );

  if (provider.isPending) return <PageSkeleton tiles={0} side={false} />;
  if (provider.isError) {
    return (
      <ListError
        error={provider.error}
        onRetry={() => void provider.refetch()}
      />
    );
  }

  const p = provider.data;
  const name = pickTranslation(p.translations, lang)?.name ?? `#${p.id}`;
  const icon = mediaUrl(p.icon);
  const category = categories.options.find(
    (o) => o.value === String(p.categoryId),
  )?.label;

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-8 gap-y-5'>
        {icon && (
          <img
            src={icon}
            alt=''
            className='size-16 shrink-0 rounded-2xl object-cover'
          />
        )}
        <div className='flex flex-[1_1_260px] flex-col gap-2'>
          <HeroEyebrow icon={<Building2 />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{name}</HeroTitle>
          {p.companyName && <p className='text-hero-ink-2'>{p.companyName}</p>}
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          {category && <Tag>{category}</Tag>}
          <ActiveStatusBadge ns='profile' active={p.status} />
          {allowed.settings &&
            can('update:service-provider-settings') &&
            tab !== 'settings' && (
              <Button variant='hero' onClick={() => setTab('settings')}>
                <Pencil />
                {t('hero.editSettings')}
              </Button>
            )}
        </div>
      </Hero>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className='gap-5'
      >
        <TabsList>
          {visible.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {allowed.overview && (
          <TabsContent value='overview'>
            <ProviderOverview provider={p} />
          </TabsContent>
        )}
        {allowed.settings && (
          // Kept mounted while hidden so unsaved edits survive a tab switch.
          <TabsContent
            value='settings'
            forceMount
            className='data-[state=inactive]:hidden'
          >
            <ProviderSettingsForm key={p.id} provider={p} />
          </TabsContent>
        )}
        {allowed.attachments && (
          <TabsContent value='attachments'>
            <ProviderAttachmentsPanel providerId={p.id} />
          </TabsContent>
        )}
        {allowed.tags && (
          <TabsContent value='tags'>
            <ProviderTagsPanel providerId={p.id} />
          </TabsContent>
        )}
        <TabsContent value='faqs'>
          <ProviderFaqsPanel providerId={p.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
