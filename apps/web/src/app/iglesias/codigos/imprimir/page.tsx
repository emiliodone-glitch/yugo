'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useChurchCodes, useChurchMe } from '@/lib/hooks';
import { QueryError } from '@/components/query-error';
import { YugoMark } from '@/components/icons';

/**
 * Lote de códigos para imprimir (RF-IGL-05). Muchas iglesias los entregan en
 * papel el domingo: tarjetas con el nombre de la iglesia, el código y cómo
 * usarlo, listas para recortar. «Imprimir» del navegador las guarda en PDF.
 */
export default function PrintCodesPage() {
  const me = useChurchMe();
  const codes = useChurchCodes();
  const active = (codes.data ?? []).filter(
    (code) => !code.usedAt && Date.parse(code.expiresAt) > Date.now(),
  );
  const churchName = me.data?.church.name ?? 'tu iglesia';
  const expires = active[0]
    ? new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'long' }).format(
        new Date(active[0].expiresAt),
      )
    : null;

  return (
    <div className="min-h-dvh bg-linen p-6">
      <div className="print-hide mb-4 flex items-center justify-between">
        <Link href="/iglesias/codigos" className="text-[13px] text-muted underline">
          ‹ {es.church.endorsementCodes}
        </Link>
        <button
          type="button"
          className="btn btn-olive w-auto px-5"
          disabled={active.length === 0}
          onClick={() => window.print()}
        >
          Imprimir o guardar en PDF
        </button>
      </div>

      {codes.isError ? (
        <QueryError error={codes.error} onRetry={() => void codes.refetch()} />
      ) : null}
      {codes.isLoading ? <p className="text-sm text-muted">{es.common.loading}</p> : null}
      {!codes.isLoading && active.length === 0 ? (
        <p className="text-sm text-muted">
          No hay códigos vigentes sin usar. Genera un lote primero.
        </p>
      ) : null}

      <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-3 md:grid-cols-3">
        {active.map((code) => (
          <div
            key={code.id}
            className="flex flex-col justify-between rounded-card border border-dashed border-line bg-white px-4 py-4"
          >
            <div className="flex items-center gap-1.5">
              <YugoMark className="h-5 w-5 text-ink" />
              <span className="font-display text-[14px] font-semibold text-ink">Yugo</span>
            </div>
            <div className="mt-2 text-[10.5px] leading-snug text-muted">
              Respaldo de <b className="text-ink">{churchName}</b>
            </div>
            <div className="mt-3 font-mono text-[17px] font-bold tracking-wider text-ink">
              {code.code}
            </div>
            <div className="mt-3 text-[9.5px] leading-snug text-muted">
              En la app: Perfil › Verificación › Código de mi iglesia. Un solo uso
              {expires ? ` · vence el ${expires}` : ''}.
            </div>
          </div>
        ))}
      </div>

      <p className="print-hide mx-auto mt-4 max-w-[720px] text-[12px] text-muted">
        {active.length} tarjetas. Cada código es de un solo uso: entrega una por persona y anota a
        quién se la diste si quieres llevar tu propio control. El portal nunca mostrará la actividad
        de citas de nadie.
      </p>
    </div>
  );
}
