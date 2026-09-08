'use client';

import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';

/**
 * Estado de error de una consulta, con reintento. Existe para que una pantalla
 * nunca muestre «Cargando…» cuando en realidad la petición ya falló: eso deja
 * a la persona esperando algo que no va a llegar, sin saber por qué.
 */
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="px-4 pt-10 text-center">
      <p className="text-sm text-wine">{errorMessage(error)}</p>
      <button type="button" onClick={onRetry} className="btn btn-ghost mt-3 inline-flex w-auto px-4">
        {es.common.retry}
      </button>
    </div>
  );
}
