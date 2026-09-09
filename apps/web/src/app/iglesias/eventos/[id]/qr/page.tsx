'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useChurchMe, useEventQr } from '@/lib/hooks';
import { QrCode } from '@/components/qr-code';
import { QueryError } from '@/components/query-error';
import { YugoMark } from '@/components/icons';

/**
 * QR de entrada para imprimir (RF-EVE-06). Va en la puerta del evento: la
 * persona lo escanea con la app (o con la cámara del teléfono, que abre la
 * web) y su asistencia queda registrada. Antes la app mostraba un «QR» que
 * no era un QR y la API validaba un token que nadie tenía.
 */
export default function EventQrPage({ params }: { params: { id: string } }) {
  const me = useChurchMe();
  const qr = useEventQr(params.id);

  return (
    <div className="min-h-dvh bg-linen p-6">
      <div className="print-hide mb-4 flex items-center justify-between">
        <Link href="/iglesias/eventos" className="text-[13px] text-muted underline">
          ‹ {es.church.events}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/iglesias/eventos/${params.id}/entrada`}
            className="btn btn-ghost w-auto px-4"
          >
            {es.events.validateTitle}
          </Link>
          <button
            type="button"
            className="btn btn-olive w-auto px-5"
            onClick={() => window.print()}
          >
            Imprimir o guardar en PDF
          </button>
        </div>
      </div>

      {qr.isError ? <QueryError error={qr.error} onRetry={() => void qr.refetch()} /> : null}
      {qr.isLoading ? <p className="text-sm text-muted">{es.common.loading}</p> : null}

      {qr.data ? (
        <article className="print-page mx-auto flex max-w-[640px] flex-col items-center rounded-card border border-line bg-white px-10 py-12 text-center">
          <YugoMark className="h-12 w-12 text-ink" />
          <div className="mt-2 font-display text-[22px] font-semibold text-ink">Yugo</div>
          <div className="text-[12px] tracking-[0.08em] text-muted">
            {(me.data?.church.name ?? '').toUpperCase()}
          </div>
          <h1 className="h-display mt-8 text-[30px] leading-tight">{qr.data.title}</h1>
          <p className="mt-2 text-[15px] text-muted">
            Escanea al llegar para registrar tu asistencia
          </p>
          <div className="mt-8 rounded-card border border-line p-4">
            <QrCode value={qr.data.url} size={320} label={`QR de entrada de ${qr.data.title}`} />
          </div>
          <p className="mt-6 max-w-[420px] text-[13px] leading-relaxed text-muted">
            Con la app de Yugo: <b>Eventos › Registrar mi asistencia</b>. Con la cámara del
            teléfono: abre el enlace y entra con tu cuenta. Tu asistencia solo la ve la iglesia como
            un total, nunca con tu nombre.
          </p>
          <p className="mt-4 break-all text-[11px] text-muted">{qr.data.url}</p>
        </article>
      ) : null}

      <p className="print-hide mx-auto mt-4 max-w-[640px] text-[12px] text-muted">
        Imprímelo en tamaño carta y colócalo en la entrada. El mismo QR sirve para todo el evento;
        cada persona queda registrada una sola vez.
      </p>
    </div>
  );
}
