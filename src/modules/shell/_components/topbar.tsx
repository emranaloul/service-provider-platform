import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound,
  LogOut,
  Menu,
  Moon,
  QrCode,
  Search,
  Sun,
} from 'lucide-react';
import { logout } from '@/shared/api/session';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useCurrentUser } from '@/shared/session/current-user';
import {
  InitialsAvatar,
  Kbd,
  SegmentedControl,
} from '@/shared/components/pulse';
import { useTheme } from '@/shared/hooks/use-theme';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import type { Lang } from '@/shared/types/lang';
import { ChangePasswordDialog } from '@/modules/shell/_components/change-password-dialog';
import { CheckInDialog } from '@/modules/shell/_components/check-in-dialog';
import { CommandPalette } from '@/modules/shell/_components/command-palette';
import { usePaletteShortcut } from '@/modules/shell/_components/use-palette-shortcut';

/** The shortcut hint: ⌘K on Apple devices, Ctrl K elsewhere. */
const SHORTCUT_HINT =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';

/**
 * Pulse top bar: page title + subtitle, command palette (Ctrl K), Check-in
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
  const { user } = useCurrentUser();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  usePaletteShortcut(() => setPaletteOpen(true));

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

      <Button
        variant='outline'
        className='text-ink-2 hidden min-w-60 px-3.5 font-medium md:inline-flex'
        aria-keyshortcuts='Control+K Meta+K'
        onClick={() => setPaletteOpen(true)}
      >
        <Search />
        <span className='flex-1 text-start'>{t('shell.search')}</span>
        <Kbd>{SHORTCUT_HINT}</Kbd>
      </Button>
      <Button
        variant='outline'
        size='icon'
        className='md:hidden'
        aria-label={t('shell.search')}
        onClick={() => setPaletteOpen(true)}
      >
        <Search />
      </Button>
      <Button onClick={() => setCheckInOpen(true)}>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='rounded-full p-0'
            aria-label={t('shell.account')}
          >
            <InitialsAvatar name={fullName || '?'} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-56'>
          <DropdownMenuLabel className='flex flex-col'>
            <span className='font-bold'>{fullName}</span>
            <span className='text-ink-2 text-xs font-normal'>
              {user?.roleName ?? user?.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound />
            {t('shell.changePassword.menu')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => logout()}>
            <LogOut />
            {t('shell.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onCheckIn={() => setCheckInOpen(true)}
        onChangePassword={() => setPasswordOpen(true)}
      />
      <CheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} />
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </header>
  );
}
