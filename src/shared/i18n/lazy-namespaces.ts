/**
 * Feature-module translations load on demand, not in the entry bundle.
 * Each loader imports a module's `i18n/index.ts`, which registers its
 * namespace for both languages. `shell` stays eager (`modules.ts`).
 *
 * Add an entry for each namespace a new module registers.
 */
export const LAZY_NAMESPACES: Record<string, () => Promise<unknown>> = {
  today: () => import('@/modules/today/i18n'),
  reservations: () => import('@/modules/reservations/i18n'),
  ledgers: () => import('@/modules/ledgers/i18n'),
  team: () => import('@/modules/team/i18n'),
  services: () => import('@/modules/services/i18n'),
  branches: () => import('@/modules/branches/i18n'),
  profile: () => import('@/modules/profile/i18n'),
};
