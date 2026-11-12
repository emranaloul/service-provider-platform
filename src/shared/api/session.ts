import { tokenStore } from '@/shared/api/token-store';
import { queryClient } from '@/shared/lib/query-client';

/**
 * Ends the session locally: tokens and every cached response go, so nothing
 * from this user or company survives into the next sign-in.
 */
export function endSession() {
  tokenStore.clear();
  queryClient.clear();
}
