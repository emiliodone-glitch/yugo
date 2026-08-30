import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  configureAppRuntime,
  createQueryClient,
  QueryClientProvider,
} from '@yugo/app-core';
import { DEMO_MODE, getApiClient, onSignOut } from './api';

// Points the shared hooks at this app's client. At module scope so it is in
// place before any screen renders.
configureAppRuntime({ demoMode: DEMO_MODE, client: getApiClient });

/** React Query plus the global reaction to losing the session. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(
    () =>
      onSignOut(() => {
        queryClient.clear();
        router.replace('/entrar');
      }),
    [queryClient],
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
