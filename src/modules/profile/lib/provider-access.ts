import { UserType } from '@/shared/api/enums';
import type { CurrentUser } from '@/shared/session/current-user';

/**
 * doc §17.1: a provider workspace (`?provider={id}`) is loaded only for an
 * Admin, or for a user whose own `serviceProviderId` is that provider.
 */
export function canOpenProvider(
  user: Pick<CurrentUser, 'groupId' | 'serviceProviderId'>,
  providerId: number,
): boolean {
  return (
    user.groupId === UserType.Admin || user.serviceProviderId === providerId
  );
}

/**
 * The provider the workspace shows: the `?provider=` id when allowed,
 * otherwise a Provider user's own provider; `null` when there is none.
 */
export function workspaceProviderId(
  user: Pick<CurrentUser, 'groupId' | 'serviceProviderId'>,
  requested: number | null,
): number | null {
  if (requested && canOpenProvider(user, requested)) return requested;
  return user.groupId === UserType.Admin ? null : user.serviceProviderId;
}
