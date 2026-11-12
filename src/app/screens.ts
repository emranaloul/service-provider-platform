import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarDays,
  ListChecks,
  MapPin,
  ReceiptText,
  Sun,
  Users,
} from 'lucide-react';
import type { PermissionInput } from '@/shared/permissions';

/**
 * Every sidebar screen, in nav order (design: Pulse sidebar).
 * To add one: key here + `SCREENS` entry + `shell` i18n `nav.<key>` label +
 * the module's `<name>.routes.tsx` spread in `router.tsx`.
 */
export const SCREEN_KEYS = [
  'today',
  'reservations',
  'ledgers',
  'team',
  'services',
  'branches',
  'profile',
] as const;

export type ScreenKey = (typeof SCREEN_KEYS)[number];

export interface ScreenDef {
  key: ScreenKey;
  path: string;
  icon: LucideIcon;
  permission: PermissionInput;
}

export const SCREENS: Record<ScreenKey, ScreenDef> = {
  today: {
    key: 'today',
    path: '/today',
    icon: Sun,
    permission: ['today', 'view'],
  },
  reservations: {
    key: 'reservations',
    path: '/reservations',
    icon: CalendarDays,
    permission: ['reservations', 'view'],
  },
  ledgers: {
    key: 'ledgers',
    path: '/ledgers',
    icon: ReceiptText,
    permission: ['ledgers', 'view'],
  },
  team: {
    key: 'team',
    path: '/team',
    icon: Users,
    permission: ['team', 'view'],
  },
  services: {
    key: 'services',
    path: '/services',
    icon: ListChecks,
    permission: ['services', 'view'],
  },
  branches: {
    key: 'branches',
    path: '/branches',
    icon: MapPin,
    permission: ['branches', 'view'],
  },
  profile: {
    key: 'profile',
    path: '/profile',
    icon: Building2,
    permission: ['profile', 'view'],
  },
};

/** The nav screen whose path prefixes the current location. */
export function screenKeyOf(pathname: string): ScreenKey | undefined {
  return SCREEN_KEYS.find(
    (k) =>
      pathname === SCREENS[k].path ||
      pathname.startsWith(`${SCREENS[k].path}/`),
  );
}
