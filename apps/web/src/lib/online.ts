'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const readOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

/**
 * Si el navegador cree tener red. `navigator.onLine` no garantiza que la API
 * responda, pero cuando dice «no» es seguro: no vale la pena intentar y
 * fallar. En el servidor siempre es `true`, así el HTML no cambia al hidratar.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, readOnline, () => true);
}
