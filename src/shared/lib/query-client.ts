import { MutationCache, QueryClient } from '@tanstack/react-query';
import { errorMessage, toApiError } from '@/shared/api/api-error';
import { notify } from '@/shared/lib/notify';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** The mutation shows its own error UI — skip the global toast. */
      silentError?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silentError) return;
      if (toApiError(error).kind === 'canceled') return;
      notify(errorMessage(error), 'error');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Only a dropped connection is worth retrying; an HTTP 600 answer is final.
      retry: (failureCount, error) =>
        failureCount < 2 && toApiError(error).kind === 'network',
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
