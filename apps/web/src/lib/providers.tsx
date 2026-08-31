'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  configureAppRuntime,
  createQueryClient,
  disconnectRealtime,
  QueryClientProvider,
} from '@yugo/app-core';
import { DEMO_MODE, getApiClient } from './api';

// Tells the shared hooks which client to use. Runs at module scope so it is
// in place before any screen renders.
configureAppRuntime({ demoMode: DEMO_MODE, client: getApiClient });

/** React Query + global reaction to session loss. */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    const onSignedOut = () => {
      queryClient.clear();
      disconnectRealtime();
      router.push('/entrar');
    };
    window.addEventListener('yugo:signed-out', onSignedOut);
    return () => window.removeEventListener('yugo:signed-out', onSignedOut);
  }, [queryClient, router]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
