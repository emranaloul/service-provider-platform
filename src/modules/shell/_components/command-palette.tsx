import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, LogOut, QrCode, ReceiptText, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SCREEN_KEYS, SCREENS } from '@/app/screens';
import { logout } from '@/shared/api/session';
import { usePermissionCheck } from '@/shared/permissions';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/shared/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { paletteReservationId } from '@/modules/shell/lib/reservation-id';

interface PaletteEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

const matches = (label: string, query: string) =>
  !query || label.toLocaleLowerCase().includes(query.toLocaleLowerCase());

/**
 * Top bar → command palette (Ctrl K): go to any screen the user may see,
 * search reservations by the typed text, open a reservation from an id or
 * a verification link, and the account quick actions.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onCheckIn,
  onChangePassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: () => void;
  onChangePassword: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const can = usePermissionCheck();
  const [query, setQuery] = useState('');
  const text = query.trim();
  const canReservations = can(SCREENS.reservations.permission);

  const close = (next: boolean) => {
    if (!next) setQuery('');
    onOpenChange(next);
  };
  /** Closes the palette first so the next dialog or page gets focus. */
  const run = (action: () => void) => () => {
    close(false);
    action();
  };

  const screens: PaletteEntry[] = SCREEN_KEYS.filter((key) =>
    can(SCREENS[key].permission),
  )
    .map((key) => ({
      id: `screen-${key}`,
      label: t(`nav.${key}`),
      icon: SCREENS[key].icon,
      run: () => navigate(SCREENS[key].path),
    }))
    .filter((entry) => matches(entry.label, text));

  const reservationId = canReservations ? paletteReservationId(text) : null;
  const reservationEntries: PaletteEntry[] = [];
  if (reservationId) {
    reservationEntries.push({
      id: 'open-reservation',
      label: t('shell.palette.openReservation', { id: reservationId }),
      icon: ReceiptText,
      run: () =>
        navigate(`/reservations?order=${encodeURIComponent(reservationId)}`),
    });
  }
  if (canReservations && text) {
    reservationEntries.push({
      id: 'search-reservations',
      label: t('shell.palette.searchReservations', { text }),
      icon: Search,
      run: () => navigate(`/reservations?q=${encodeURIComponent(text)}`),
    });
  }

  const actions: PaletteEntry[] = [
    ...(canReservations
      ? [
          {
            id: 'check-in',
            label: t('shell.palette.checkIn'),
            icon: QrCode,
            run: onCheckIn,
          },
        ]
      : []),
    {
      id: 'change-password',
      label: t('shell.changePassword.menu'),
      icon: KeyRound,
      run: onChangePassword,
    },
    {
      id: 'sign-out',
      label: t('shell.signOut'),
      icon: LogOut,
      run: () => logout(),
    },
  ].filter((entry) => matches(entry.label, text));

  const groups: { id: string; heading: string; entries: PaletteEntry[] }[] = [
    {
      id: 'reservations',
      heading: t('shell.palette.reservations'),
      entries: reservationEntries,
    },
    { id: 'go-to', heading: t('shell.palette.goTo'), entries: screens },
    { id: 'actions', heading: t('shell.palette.actions'), entries: actions },
  ].filter((group) => group.entries.length > 0);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className='gap-0 overflow-hidden p-0 sm:max-w-lg'
        showCloseButton={false}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>{t('shell.palette.title')}</DialogTitle>
          <DialogDescription>
            {t('shell.palette.description')}
          </DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          loop
          label={t('shell.palette.title')}
          className='**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5'
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t('shell.palette.placeholder')}
          />
          <CommandList className='max-h-[min(24rem,60vh)]'>
            <CommandEmpty>{t('shell.palette.empty')}</CommandEmpty>
            {groups.map((group, index) => (
              <PaletteGroup
                key={group.id}
                heading={group.heading}
                separator={index > 0}
              >
                {group.entries.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={entry.id}
                    onSelect={run(entry.run)}
                  >
                    <entry.icon />
                    <span className='truncate'>{entry.label}</span>
                  </CommandItem>
                ))}
              </PaletteGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PaletteGroup({
  heading,
  separator,
  children,
}: {
  heading: string;
  separator: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {separator && <CommandSeparator />}
      <CommandGroup heading={heading}>{children}</CommandGroup>
    </>
  );
}
