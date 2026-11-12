import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CalendarClock,
  CircleCheck,
  MapPin,
  SearchX,
  Stethoscope,
  User,
} from 'lucide-react';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { formatLocalDateTime } from '@/shared/lib/format';
import {
  mapsLink,
  type PublicOrder,
} from '@/modules/reservations/api/public-order';

export function OrderNotFound() {
  const { t } = useTranslation('public');
  return (
    <EmptyState
      icon={SearchX}
      title={t('verify.notFoundTitle')}
      hint={t('verify.notFoundDesc')}
    />
  );
}

export function OrderVerifySkeleton() {
  return (
    <div aria-busy className='flex flex-col gap-5'>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-4 w-64' />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className='flex gap-3'>
          <Skeleton className='size-9 rounded-md' />
          <div className='flex flex-1 flex-col gap-2'>
            <Skeleton className='h-3.5 w-24' />
            <Skeleton className='h-4 w-40' />
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className='flex gap-3'>
      <span
        aria-hidden
        className='bg-brand-soft text-brand grid size-9 flex-none place-items-center rounded-md [&_svg]:size-4.5'
      >
        <Icon />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='text-ink-3 text-xs font-semibold'>{label}</span>
        <div className='text-ink flex flex-col gap-0.5 break-words'>
          {children}
        </div>
      </div>
    </div>
  );
}

export function OrderDetails({ order }: { order: PublicOrder }) {
  const { t } = useTranslation('public');
  const lang = useUiLang();
  const groups = order.reservationServices?.groupServices ?? [];
  const services = order.reservationServices?.services ?? [];
  const hasLocation = !!order.latitude || !!order.longitude;

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-1'>
        <h1 className='hd text-h1 flex items-center gap-2 font-bold'>
          <CircleCheck aria-hidden className='text-up size-6' />
          {t('verify.title')}
        </h1>
        <p className='text-ink-2'>{t('verify.subtitle')}</p>
      </div>

      <Row icon={User} label={t('verify.bookedFor')}>
        <span className='font-bold'>{order.ownerName || '—'}</span>
        {order.ownerPhone && (
          <span dir='ltr' className='num text-ink-2 self-start text-sm'>
            {order.ownerPhone}
          </span>
        )}
        {order.companyName && (
          <span className='text-ink-2 text-sm'>
            {t('verify.company')}: {order.companyName}
          </span>
        )}
      </Row>

      <Row icon={CalendarClock} label={t('verify.appointment')}>
        <span className='num font-bold'>
          {formatLocalDateTime(order.dateChosen, lang)}
        </span>
      </Row>

      <Row icon={Building2} label={t('verify.provider')}>
        <span className='font-bold'>{order.serviceProviderName || '—'}</span>
        {order.serviceProviderBranchName && (
          <span className='text-ink-2 text-sm'>
            {t('verify.branch')}: {order.serviceProviderBranchName}
          </span>
        )}
        {order.serviceProviderBranchPhone && (
          <span className='text-ink-2 text-sm'>
            {t('verify.phone')}:{' '}
            <span dir='ltr' className='num'>
              {order.serviceProviderBranchPhone}
            </span>
          </span>
        )}
      </Row>

      {(order.serviceProviderBranchAddress || hasLocation) && (
        <Row icon={MapPin} label={t('verify.address')}>
          {order.serviceProviderBranchAddress && (
            <span>{order.serviceProviderBranchAddress}</span>
          )}
          {hasLocation && (
            <Button
              asChild
              variant='outline'
              size='sm'
              className='mt-1 self-start'
            >
              <a
                href={mapsLink(order.latitude, order.longitude)}
                target='_blank'
                rel='noopener noreferrer'
              >
                <MapPin />
                {t('verify.openInMaps')}
              </a>
            </Button>
          )}
        </Row>
      )}

      <Separator />

      <Row icon={Stethoscope} label={t('verify.services')}>
        {groups.length === 0 && services.length === 0 ? (
          <span className='text-ink-2'>{t('verify.noServices')}</span>
        ) : (
          <ul className='flex flex-col gap-2'>
            {groups.map((g) => (
              <li key={`g-${g.reservationServiceId}`}>
                <span className='font-bold'>{g.serviceGroupName}</span>
                {g.services.length > 0 && (
                  <ul className='text-ink-2 border-line mt-1 flex flex-col gap-0.5 border-s-2 ps-3 text-sm'>
                    {g.services.map((s) => (
                      <li key={s.id}>{s.serviceName}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {services.map((s) => (
              <li key={`s-${s.reservationServiceId}`} className='font-bold'>
                {s.serviceName}
              </li>
            ))}
          </ul>
        )}
      </Row>
    </div>
  );
}
