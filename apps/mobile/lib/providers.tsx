import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { configureAppRuntime, createQueryClient, disconnectRealtime } from '@yugo/app-core';
import { DEMO_MODE, getApiClient, onSignOut } from './api';
import { bindNetworkState, queryPersister } from './offline';
import { listenToNotificationTaps, registerForPush } from './push';

// Points the shared hooks at this app's client. At module scope so it is in
// place before any screen renders.
configureAppRuntime({ demoMode: DEMO_MODE, client: getApiClient });

/** React Query, offline cache, push, and the global reaction to losing the session. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // React Native does not report connectivity to React Query on its own, so
  // without this queries fire into a dead radio instead of waiting for signal.
  useEffect(() => bindNetworkState(), []);

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

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        // A day-old list is still worth showing while the fresh one loads;
        // beyond that it stops being useful and starts being wrong.
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
