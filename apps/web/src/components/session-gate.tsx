'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { es, isUnreachableError } from '@yugo/shared';
import { useSession } from '@/lib/hooks';
import { API_BASE_URL, ApiError, DEMO_MODE, errorMessage, hasStoredSession } from '@/lib/api';

/**
 * Puerta de la zona de miembros contra la API real.
 *
 * Sin sesión guardada, manda a /entrar recordando a dónde iba la persona.
 * Antes de esto, la bienvenida enlazaba directo a /inicio y nada comprobaba la
 * sesión: contra la API real, cada pantalla disparaba peticiones que volvían
 * 401 y la interfaz se quedaba en «Cargando…» para siempre. En modo demo no
 * hay sesión que comprobar y la puerta no hace nada.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;
    if (!hasStoredSession()) {
      router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}

/**
 * Aviso visible cuando la API no responde. Una sola pieza en la cáscara de la
 * app, en vez de repetir el estado de error en veinte pantallas: si la sesión
 * no se puede cargar por un problema de conexión (no por un 401, que ya
 * redirige a /entrar), lo dice en claro y ofrece reintentar. Incluye la
 * dirección configurada porque el error más común en un despliegue nuevo es
 * una URL de API mal puesta, y eso hay que poder verlo sin abrir la consola.
 */
export function ApiStatusBanner() {
  const session = useSession();
  if (DEMO_MODE || !session.isError) return null;
  const error = session.error;
  if (error instanceof ApiError && error.isUnauthorized) return null;
  const unreachable = isUnreachableError(error);

  return (
    <div role="alert" className="mx-4 mt-4 rounded-card bg-wine-soft px-4 py-3 text-[13px] text-wine">
      <p className="font-semibold">{unreachable ? es.errors.apiUnreachable : errorMessage(error)}</p>
      {unreachable ? (
        <p className="mt-1 break-all text-[12px] opacity-90">{es.errors.apiUnreachableHint(API_BASE_URL)}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void session.refetch()}
        className="mt-2 rounded-field border border-wine/40 px-3 py-1 text-[12px] font-semibold"
      >
        {es.common.retry}
      </button>
    </div>
  );
}
