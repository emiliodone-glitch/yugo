'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  configureAnalytics,
  configureAppRuntime,
  createQueryClient,
  disconnectRealtime,
  flushAnalytics,
  QueryClientProvider,
} from '@yugo/app-core';
import { DEMO_MODE, getApiClient } from './api';
import { applyAccountLocale, LocaleGate } from './locale';

// Tells the shared hooks which client to use. Runs at module scope so it is
// in place before any screen renders.
configureAppRuntime({
  demoMode: DEMO_MODE,
  client: getApiClient,
  onAccountLocale: applyAccountLocale,
});
// Eventos de producto anónimos (RF-ADM-12): un id por navegador, nunca PII.
configureAnalytics({
  platform: 'web',
  storage: {
    get: (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // almacenamiento bloqueado: el id vive solo en memoria
      }
    },
  },
});
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAnalytics();
  });
}

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

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleGate>{children}</LocaleGate>
    </QueryClientProvider>
  );
}
