import { useTranslation } from 'react-i18next';
import { Menu, Moon, QrCode, Search, Sun } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  InitialsAvatar,
  Kbd,
  SegmentedControl,
} from '@/shared/components/pulse';
import { useTheme } from '@/shared/hooks/use-theme';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import type { Lang } from '@/shared/types/lang';

/**
 * Pulse top bar: page title + subtitle, global search (Ctrl K), Check-in
 * (scan QR), language, theme, account. The page title comes from the
 * current screen; pass a `subtitle` per page if needed.
 */
export function Topbar({
  title,
  subtitle,
  onOpenMenu,
}: {
  title?: string;
  subtitle?: string;
  onOpenMenu: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = useUiLang();
  const { resolved, toggle } = useTheme();

  return (
    <header className='flex flex-wrap items-center gap-3 px-4 pt-4.5 md:px-7.5'>
      <Button
        variant='outline'
        size='icon'
        className='lg:hidden'
        aria-label={t('shell.openMenu')}
        onClick={onOpenMenu}
      >
        <Menu />
      </Button>
      <div className='min-w-0 flex-[1_1_200px]'>
        {title && <h1 className='hd text-h1 m-0 font-bold'>{title}</h1>}
        {subtitle && <p className='text-small text-ink-2 m-0'>{subtitle}</p>}
      </div>

      {/* TODO: open a command palette (cmdk is installed) on click / Ctrl K. */}
      <Button
        variant='outline'
        className='text-ink-2 hidden min-w-60 px-3.5 font-medium md:inline-flex'
      >
        <Search />
        <span className='flex-1 text-start'>{t('shell.search')}</span>
        <Kbd>Ctrl K</Kbd>
      </Button>
      <Button>
        <QrCode />
        {t('shell.checkIn')}
      </Button>
      <SegmentedControl<Lang>
        label={t('shell.language')}
        value={lang}
        onChange={(v) => void i18n.changeLanguage(v)}
        options={[
          { id: 'ar', label: 'ع' },
          { id: 'en', label: 'EN' },
        ]}
      />
      <Button
        variant='outline'
        size='icon'
        onClick={toggle}
        aria-label={
          resolved === 'dark' ? t('shell.toLight') : t('shell.toDark')
        }
      >
        {resolved === 'dark' ? <Sun /> : <Moon />}
      </Button>
      {/* TODO: account dropdown (profile, sign out) once auth exists. */}
      <button
        type='button'
        aria-label={t('shell.account')}
        className='rounded-full'
      >
        <InitialsAvatar name='Kordy Test' />
      </button>
    </header>
  );
}
