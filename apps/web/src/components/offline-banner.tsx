'use client';

import { es } from '@yugo/shared';
import { useOnline } from '@/lib/online';

/**
 * Franja fija arriba cuando no hay red (RNF-06). Va fija y no dentro del
 * flujo para no empujar el chat, que ocupa el alto exacto de la ventana.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-40 bg-wheat-soft px-4 py-1.5 text-center text-[12px] font-medium text-wheat-text shadow-segment md:left-[220px]"
    >
      {es.errors.offlineBanner}
    </div>
  );
}
