'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { es, STAFF_ROLES } from '@yugo/shared';
import { useSession } from '@/lib/hooks';
import { DEMO_MODE, hasStoredSession } from '@/lib/api';

/**
 * Puerta del panel admin.
 *
 * La API ya niega cada dato a quien no es del equipo (403), pero sin esto un
 * miembro que escribía /admin veía la cáscara del panel con cifras de demo,
 * que es peor que un error: parece real. Sin sesión → entrar y volver aquí;
 * con sesión de miembro → un mensaje claro y la salida a la app. En modo demo
 * el panel se puede recorrer libremente, que es para lo que existe la demo.
 */
export function StaffGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const [hasTokens, setHasTokens] = useState<boolean | null>(DEMO_MODE ? true : null);

  useEffect(() => {
    if (DEMO_MODE) return;
    const stored = hasStoredSession();
    setHasTokens(stored);
    if (!stored)
      router.replace(`/entrar?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [pathname, router]);

  if (DEMO_MODE) return <>{children}</>;
  if (hasTokens === null || hasTokens === false) return null;
  if (session.isLoading) {
    return <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>;
  }
  const role = session.data && !session.data.demo ? session.data.me.role : undefined;
  if (!role || !STAFF_ROLES.has(role)) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="h-display text-[22px]">{es.gate.staffOnly}</h1>
        <p className="mt-2 text-sm text-muted">{es.gate.staffOnlyBody}</p>
        <Link href="/inicio" className="btn btn-ink mt-6 inline-flex w-auto px-5">
          {es.gate.backHome}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
