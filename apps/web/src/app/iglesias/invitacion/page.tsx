'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { es } from '@yugo/shared';
import { DEMO_MODE, errorMessage, hasStoredSession } from '@/lib/api';
import { useAcceptInvitation, useSession } from '@/lib/hooks';
import { YugoMark } from '@/components/icons';

/**
 * Enlace de invitación al portal (RF-IGL-02). Con sesión, acepta y entra al
 * portal; sin sesión, lleva a crear la cuenta (el registro acepta el token)
 * o a entrar y volver aquí.
 */
export default function InvitationPage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const session = useSession({ enabled: DEMO_MODE || hasStoredSession() });
  const accept = useAcceptInvitation();
  const [result, setResult] = useState<{ churchName: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!token || attempted || !session.data || accept.isPending) return;
    setAttempted(true);
    accept
      .mutateAsync(token)
      .then((data) => setResult({ churchName: data.churchName, role: data.role }))
      .catch((caught) => {
        const message = errorMessage(caught);
        setError(
          /mismatch/i.test(message)
            ? 'Esta invitación es para otro correo. Entra con la cuenta a la que se envió.'
            : /invalid|not_found|no encontrad/i.test(message)
              ? 'La invitación venció o ya se usó. Pide una nueva a tu iglesia.'
              : message,
        );
      });
  }, [token, attempted, session.data, accept]);

  const next = `/iglesias/invitacion?token=${encodeURIComponent(token)}`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linen px-6">
      <div className="card w-full max-w-md text-center">
        <YugoMark className="mx-auto h-12 w-12 text-ink" />
        <h1 className="h-display mt-4 text-[22px]">Invitación al portal de iglesias</h1>

        {!token ? (
          <p className="mt-2 text-sm text-muted">
            Falta el enlace de invitación. Ábrelo desde el correo que te llegó.
          </p>
        ) : result ? (
          <>
            <p className="mt-2 text-sm text-olive-text">
              Ya formas parte del portal de <b>{result.churchName}</b> como{' '}
              {result.role === 'ADMIN' ? 'administrador' : 'editor de eventos'}.
            </p>
            <Link href="/iglesias" className="btn btn-olive mt-5">
              Entrar al portal
            </Link>
          </>
        ) : error ? (
          <>
            <p className="mt-2 text-sm text-wine">{error}</p>
            <Link href="/iglesias" className="btn btn-ghost mt-5">
              Ir al portal
            </Link>
          </>
        ) : session.data ? (
          <p className="mt-2 text-sm text-muted">{es.common.loading}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Tu iglesia te invitó a administrar sus eventos y códigos en Yugo. Crea tu cuenta con
              el mismo correo al que llegó la invitación, o entra si ya la tienes.
            </p>
            <Link
              href={`/registro?invite=${encodeURIComponent(token)}`}
              className="btn btn-olive mt-5"
            >
              Crear mi cuenta
            </Link>
            <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="btn btn-ghost mt-2">
              {es.welcome.haveAccount}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
