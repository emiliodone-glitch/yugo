'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@yugo/shared';

/** React Query + global reaction to session loss. */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Domain errors are answers, not failures: never retry them.
              if (error instanceof ApiError) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  useEffect(() => {
    const onSignedOut = () => {
      queryClient.clear();
      router.push('/entrar');
    };
    window.addEventListener('yugo:signed-out', onSignedOut);
    return () => window.removeEventListener('yugo:signed-out', onSignedOut);
  }, [queryClient, router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
