import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { WEEK_DAYS } from '@/shared/api/enums';
import { mediaUrl } from '@/shared/api/media';
import { ActiveStatusBadge } from '@/shared/components/active-status-badge';
import { IconTile, Panel, PanelHeader, Tag } from '@/shared/components/pulse';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { splitFlags } from '@/shared/lib/bit-flags';
import { formatDate, joinList } from '@/shared/lib/format';
import { pickTranslation } from '@/shared/lib/translation';
import type { ServiceProvider } from '@/modules/profile/api/types';
import {
  useCategoryOptions,
  WEEKDAY_KEY,
} from '@/modules/profile/_components/provider-shared';

/** Read-only provider details (doc §6.2, §17.2 Overview). */
export function ProviderOverview({
  provider: p,
}: {
  provider: ServiceProvider;
}) {
  const { t } = useTranslation('profile');
  const lang = useUiLang();
  const categories = useCategoryOptions();
  const name = pickTranslation(p.translations, lang)?.name;
  const icon = mediaUrl(p.icon);
  const category = categories.options.find(
    (o) => o.value === String(p.categoryId),
  )?.label;
  const closingDays = splitFlags(p.closingDay, WEEK_DAYS);
  const dates = [...(p.dates ?? [])].sort((a, b) =>
    a.closingDate.localeCompare(b.closingDate),
  );
  const none = <span className='text-ink-3'>{t('overview.none')}</span>;
  const ltr = (value: string | null | undefined) =>
    value ? (
      <span dir='ltr' className='num'>
        {value}
      </span>
    ) : undefined;

  const rows: [string, ReactNode][] = [
    [
      t('overview.name'),
      <span key='n' className='flex items-center gap-3'>
        {icon && (
          <img
            src={icon}
            alt=''
            className='border-line size-10 shrink-0 rounded-xl border object-cover'
          />
        )}
        {name ?? `#${p.id}`}
      </span>,
    ],
    [t('overview.companyName'), p.companyName || undefined],
    [
      t('overview.contact'),
      [p.firstName, p.lastName].filter(Boolean).join(' ') || undefined,
    ],
    [
      t('overview.email'),
      p.email ? (
        <span key='e' dir='ltr'>
          {p.email}
        </span>
      ) : undefined,
    ],
    [t('overview.phone'), ltr(p.phone)],
    [t('overview.crNumber'), ltr(p.crNumber)],
    [t('overview.vatNumber'), ltr(p.vatNumber)],
    [
      t('overview.bankDetails'),
      p.bankDetails ? (
        <span key='b' className='whitespace-pre-line'>
          {p.bankDetails}
        </span>
      ) : undefined,
    ],
    [t('overview.category'), category],
    [
      t('overview.status'),
      <ActiveStatusBadge key='s' ns='profile' active={p.status} />,
    ],
    [
      t('overview.closingDays'),
      closingDays.length
        ? joinList(
            closingDays.map((d) => t(`weekdays.${WEEKDAY_KEY[d]}`)),
            lang,
          )
        : none,
    ],
    [
      t('overview.closingDates'),
      dates.length ? (
        <span key='d' className='flex flex-wrap gap-1.5'>
          {dates.map((d) => (
            <Tag key={d.id} className='num'>
              {formatDate(d.closingDate, lang)}
            </Tag>
          ))}
        </span>
      ) : (
        none
      ),
    ],
    [
      t('overview.tags'),
      p.tags?.length ? (
        <span key='t' className='flex flex-wrap gap-1.5'>
          {p.tags.map((tag) => (
            <Tag key={tag.id}>{tag.tagName}</Tag>
          ))}
        </span>
      ) : (
        none
      ),
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
        title={t('overview.title')}
      />
      <dl className='grid grid-cols-[minmax(110px,200px)_minmax(0,1fr)] gap-x-4 gap-y-3 px-5 pb-6'>
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
