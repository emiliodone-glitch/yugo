'use client';

import { useDemoStore } from '@yugo/app-core';
import { DEMO_MODE } from './api';

const KEY = 'yugo.demo.privacy';

/**
 * En la demo el almacén vive en memoria y una recarga lo vacía. Las
 * preferencias de privacidad se guardan además en el navegador para que
 * «Ocultar mi distancia» siga marcado al volver, como pasa con la API real.
 * Solo esto: el resto de la demo debe arrancar limpio en cada visita.
 */
export function initDemoPersistence(): () => void {
  if (!DEMO_MODE || typeof window === 'undefined') return () => {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<{
        hideExactDistance: boolean;
        allowEventPresenceVisible: boolean;
      }>;
      const current = useDemoStore.getState().privacyPrefs;
      useDemoStore.setState({
        privacyPrefs: {
          hideExactDistance: stored.hideExactDistance ?? current.hideExactDistance,
          allowEventPresenceVisible:
            stored.allowEventPresenceVisible ?? current.allowEventPresenceVisible,
        },
      });
    }
  } catch {
    // almacenamiento bloqueado o dato corrupto: se sigue con lo de fábrica
  }
  return useDemoStore.subscribe((state, previous) => {
    if (state.privacyPrefs === previous.privacyPrefs) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.privacyPrefs));
    } catch {
      // sin almacenamiento dura esta visita
    }
  });
}
