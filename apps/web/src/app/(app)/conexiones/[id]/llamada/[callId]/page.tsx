'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useJoinCall } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

/**
 * La sala de la videollamada (RF-CON-12). La sala del proveedor va embebida,
 * con permiso de cámara y micrófono solo dentro de este marco. Al salir, la
 * persona vuelve al chat, donde reportar sigue a un toque.
 */
export default function VideoCallPage({ params }: { params: { id: string; callId: string } }) {
  const join = useJoinCall();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    join
      .mutateAsync(params.callId)
      .then((result) => setUrl(result.url))
      .catch((caught) => {
        const message = errorMessage(caught);
        setError(
          /call_not_open/.test(message)
            ? 'Todavía no se abre: puedes entrar desde 10 minutos antes de la hora propuesta.'
            : /video_unavailable/.test(message)
              ? es.connections.videoUnavailable
              : message,
        );
      });
    // Solo al entrar a la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.callId]);

  const demo = url?.startsWith('about:blank');

  return (
    <div className="flex h-dvh flex-col">
      <PageHeader title={es.connections.videoTitle} backHref={`/conexiones/${params.id}`} />
      <div className="flex-1 px-4 pb-4">
        {error ? (
          <div className="card border-wheat bg-wheat-soft text-[12.5px] text-wheat-text">
            {error}
            <div className="mt-3">
              <Link href={`/conexiones/${params.id}`} className="btn btn-ghost btn-sm w-auto px-4">
                {es.common.back}
              </Link>
            </div>
          </div>
        ) : demo ? (
          <div className="card text-[12.5px] text-muted">
            Entorno de demostración: aquí se abre la sala de video de quince minutos. En producción
            la sala la crea Daily y solo pueden entrar ustedes dos.
          </div>
        ) : url ? (
          <iframe
            title={es.connections.videoTitle}
            src={url}
            allow="camera; microphone; fullscreen; autoplay; display-capture"
            className="h-full min-h-[60dvh] w-full rounded-card border border-line bg-black"
          />
        ) : (
          <div className="card text-sm text-muted">{es.common.loading}</div>
        )}
        <p className="mt-2 text-[11px] text-muted">
          Quince minutos. Si algo no está bien, sal y usa «Reportar» en el chat: el equipo lo revisa
          con prioridad.
        </p>
      </div>
    </div>
  );
}
