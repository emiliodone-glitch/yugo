import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  configureAppRuntime,
  createQueryClient,
  disconnectRealtime,
  QueryClientProvider,
} from '@yugo/app-core';
import { DEMO_MODE, getApiClient, onSignOut } from './api';
import { listenToNotificationTaps, registerForPush } from './push';

// Points the shared hooks at this app's client. At module scope so it is in
// place before any screen renders.
configureAppRuntime({ demoMode: DEMO_MODE, client: getApiClient });

/** React Query plus the global reaction to losing the session. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // RF-NOT-01/03: registrar el token y llevar el toque a su pantalla.
  useEffect(() => {
    void registerForPush();
    return listenToNotificationTaps();
  }, []);

  useEffect(
    () =>
      onSignOut(() => {
        queryClient.clear();
        disconnectRealtime();
        router.replace('/entrar');
      }),
    [queryClient],
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
