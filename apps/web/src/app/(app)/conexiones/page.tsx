'use client';

import { es } from '@yugo/shared';
import { ChatIcon } from '@/components/icons';

/**
 * /conexiones: en el teléfono la lista la pinta el layout y esta página no
 * se ve; en escritorio esta es la columna derecha vacía hasta que se elige
 * una conversación.
 */
export default function ConnectionsPage() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center px-6 text-center text-muted xl:flex">
      <ChatIcon className="h-10 w-10 text-line" />
      <p className="mt-3 text-[14px] font-semibold text-ink">{es.connections.pickOneTitle}</p>
      <p className="mt-1 max-w-xs text-[12.5px]">{es.connections.pickOneBody}</p>
    </div>
  );
}
