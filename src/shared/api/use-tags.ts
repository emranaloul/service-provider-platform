import { useQuery } from '@tanstack/react-query';
import { UserType } from '@/shared/api/enums';
import { tagsQuery } from '@/shared/api/lookups';
import { useCurrentUser } from '@/shared/session/current-user';

/** Tag picker options for the signed-in user (Missing Items §12.2). */
export function useTags() {
  const { groupId, serviceProviderId } = useCurrentUser();
  return useQuery(
    tagsQuery({ isAdmin: groupId === UserType.Admin, serviceProviderId }),
  );
}
