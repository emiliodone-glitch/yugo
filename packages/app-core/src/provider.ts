/**
 * The query client, its defaults and the provider all come from here so every
 * app shares one instance of react-query. A provider imported by the host app
 * would otherwise resolve to a different build of the library than the hooks
 * in this package (ESM there, CommonJS here) and the hooks would never see the
 * client.
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@yugo/shared';

export { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

/** Shared query defaults: domain errors are answers, not failures. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
