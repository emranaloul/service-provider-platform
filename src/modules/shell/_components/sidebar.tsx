import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { SCREEN_KEYS, SCREENS } from '@/app/screens';
import { usePermissionCheck } from '@/shared/permissions';
import { cn } from '@/shared/lib/utils';
import { useCurrentUser } from '@/shared/session/current-user';

const NAV_ITEM =
  'flex h-10.5 items-center gap-2.5 rounded-[14px] px-3 font-bold transition-colors [&_svg]:size-4.5';

/**
 * Pulse sidebar (hero palette): brand, provider + branch switcher, the
 * modules, help at the bottom. Rendered inline on desktop and inside a
 * Sheet on small screens (`onNavigate` closes it).
 */
export function SidebarContent({
  onNavigate,
  badges,
}: {
  onNavigate?: () => void;
  /** Count bubbles per screen, e.g. `{ reservations: 2 }`; 0 = none. */
  badges?: Partial<Record<string, number>>;
}) {
  const { t } = useTranslation();
  const can = usePermissionCheck();
  const { user } = useCurrentUser();
  const branchCount = user?.userServiceProviderBranches?.length ?? 0;

  return (
    <div className='bg-hero text-hero-ink-2 flex h-full flex-col gap-4.5 px-3.5 py-5'>
      <div className='flex items-center gap-2.5 px-1.5'>
        <span
          aria-hidden
          className='hd bg-hero-accent text-hero grid size-9 place-items-center rounded-md text-[17px] font-bold'
        >
          {t('appName').charAt(0)}
        </span>
        <span className='flex flex-col leading-snug'>
          <span className='hd text-hero-ink text-[15px] font-bold'>
            {t('appName')}
          </span>
          <span className='text-xs'>{t('appSubtitle')}</span>
        </span>
      </div>

      {/* Provider + branch switcher. TODO: open a branch picker (popover). */}
      <button
        type='button'
        className='border-hero-line bg-hero-raised text-hero-ink flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start'
      >
        <span className='flex flex-1 flex-col leading-snug'>
          <span className='font-bold'>{user?.serviceProviderName ?? '—'}</span>
          <span className='text-hero-ink-2 text-xs'>
            {t('shell.allBranches')}
            {branchCount > 0 &&
              ` · ${t('shell.branchCount', { count: branchCount })}`}
          </span>
        </span>
        <ChevronDown aria-hidden className='size-4.5' />
      </button>

      <nav aria-label={t('shell.mainNav')} className='flex flex-col gap-1'>
        {SCREEN_KEYS.filter((k) => can(SCREENS[k].permission)).map((key) => {
          const { path, icon: Icon } = SCREENS[key];
          const badge = badges?.[key];
          return (
            <NavLink
              key={key}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  NAV_ITEM,
                  isActive
                    ? 'bg-hero-raised text-hero-accent'
                    : 'hover:text-hero-ink',
                )
              }
            >
              <Icon aria-hidden />
              <span className='flex-1'>{t(`nav.${key}`)}</span>
              {badge ? (
                <span className='num bg-hero-accent text-hero grid h-5.5 min-w-5.5 place-items-center rounded-full px-1.5 text-xs font-semibold'>
                  {badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className='flex-1' />
      <a href='#' className={cn(NAV_ITEM, 'hover:text-hero-ink')}>
        <CircleHelp aria-hidden />
        {t('shell.help')}
      </a>
    </div>
  );
}
