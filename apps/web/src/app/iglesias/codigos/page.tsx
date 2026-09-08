'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useChurchCodes,
  useChurchMe,
  useEndorsementRequests,
  useGenerateChurchCodes,
  useResolveEndorsement,
} from '@/lib/hooks';
import { BarTop, Kpi, Panel } from '@/components/admin';
import { Avatar, EndorsedBadge } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const BATCH = 25;

const expiresLabel = (iso: string) => {
  const days = Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
  return days === 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`;
};

/**
 * Códigos de respaldo — nivel 3 en manos de la iglesia (RF-IGL-05).
 * Los códigos, las solicitudes y los totales son los de la iglesia real;
 * generar y confirmar van a la API y quedan en la bitácora.
 */
export default function EndorsementCodesPage() {
  const me = useChurchMe();
  const codes = useChurchCodes();
  const requests = useEndorsementRequests();
  const generate = useGenerateChurchCodes();
  const resolve = useResolveEndorsement();
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const churchName = me.data?.church.name ?? 'tu iglesia';
  const activeCodes = (codes.data ?? []).filter(
    (code) => !code.usedAt && Date.parse(code.expiresAt) > Date.now(),
  );
  const pending = requests.data ?? [];

  const generateBatch = async () => {
    setFailure(null);
    try {
      await generate.mutateAsync(BATCH);
      setNotice(`${BATCH} códigos generados. Son de un solo uso y vencen a los 30 días.`);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  const decide = async (id: string, confirm: boolean) => {
    setFailure(null);
    try {
      await resolve.mutateAsync({ id, confirm });
      // Sin el nombre: la solicitud ya salió de la cola y el aviso no debe
      // volver a mostrarlo; basta con decir qué pasó.
      setNotice(
        confirm
          ? `Respaldo confirmado: la persona ya lleva la insignia «Respaldado por ${churchName}».`
          : 'Solicitud retirada. La persona no recibe respaldo y no se le muestra motivo.',
      );
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div>
      <BarTop
        title={es.church.endorsementCodes}
        right={
          <button
            type="button"
            className="btn btn-olive btn-sm"
            disabled={generate.isPending}
            onClick={() => void generateBatch()}
          >
            {es.church.generateCodes(BATCH)}
          </button>
        }
      />
      <div className="p-6">
        {notice ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {notice}
          </div>
        ) : null}
        {failure ? (
          <div role="alert" className="mb-4 rounded-field bg-wine-soft px-4 py-3 text-sm text-wine">
            {failure}
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <Kpi label={es.church.endorsedMembers} value={me.data?.stats.endorsedMembers ?? '…'} />
          <Kpi
            label={es.church.activeCodes}
            value={codes.isLoading ? '…' : activeCodes.length}
            small={es.church.codesExpire}
          />
          <Kpi
            label={es.church.pendingRequests}
            value={requests.isLoading ? '…' : pending.length}
          />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel title={es.church.endorsementRequests}>
            {requests.isError ? (
              <QueryError error={requests.error} onRetry={() => void requests.refetch()} />
            ) : null}
            {requests.isLoading ? (
              <p className="py-4 text-center text-sm text-muted">{es.common.loading}</p>
            ) : pending.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No hay solicitudes pendientes.</p>
            ) : (
              pending.map((request) => (
                <div key={request.id} className="list-row">
                  <Avatar name={request.name} size="s" />
                  <div className="flex-1">
                    <b className="text-[12.5px]">{request.name}</b>
                    <div className="text-[11px] text-muted">
                      {request.attendsSince
                        ? es.church.attendsSince(request.attendsSince)
                        : 'No indicó desde cuándo asiste'}
                      {request.leaderName ? ` · ${es.church.asksLeader(request.leaderName)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-olive btn-sm"
                    disabled={resolve.isPending}
                    onClick={() => void decide(request.id, true)}
                  >
                    {es.church.confirmEndorsement}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={resolve.isPending}
                    onClick={() => void decide(request.id, false)}
                  >
                    No es de la congregación
                  </button>
                </div>
              ))
            )}
          </Panel>

          <div className="grid gap-4">
            <Panel title={es.church.howItWorks}>
              <p className="text-[12.5px] leading-relaxed">
                Entrega un código a cada miembro soltero que quiera usar Yugo. Al ingresarlo, su
                perfil muestra la insignia <EndorsedBadge label={`Respaldado por ${churchName}`} />.
                Los códigos son de un solo uso y puedes revocar un respaldo en cualquier momento. El
                portal nunca muestra la actividad de citas de tus miembros.
              </p>
            </Panel>

            <Panel
              title="Códigos vigentes"
              titleExtra={
                <span className="text-[11px] font-sans font-normal text-muted">
                  Toca uno para copiarlo
                </span>
              }
            >
              {codes.isError ? (
                <QueryError error={codes.error} onRetry={() => void codes.refetch()} />
              ) : null}
              {codes.isLoading ? (
                <p className="text-sm text-muted">{es.common.loading}</p>
              ) : activeCodes.length === 0 ? (
                <p className="text-sm text-muted">
                  No quedan códigos sin usar. Genera un lote nuevo con el botón de arriba.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                  {activeCodes.slice(0, 30).map((code) => (
                    <li key={code.id}>
                      <button
                        type="button"
                        onClick={() => void copy(code.code)}
                        className={`w-full rounded-field border px-2 py-1.5 text-left font-mono text-[12px] transition ${
                          copied === code.code
                            ? 'border-olive bg-olive-soft'
                            : 'border-line bg-linen hover:bg-white'
                        }`}
                        aria-label={`Copiar código ${code.code}`}
                      >
                        <span className="block font-semibold text-ink">{code.code}</span>
                        <span className="block font-sans text-[10.5px] text-muted">
                          {copied === code.code ? 'Copiado' : expiresLabel(code.expiresAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {activeCodes.length > 30 ? (
                <p className="mt-2 text-[11px] text-muted">
                  Se muestran 30 de {activeCodes.length}.
                </p>
              ) : null}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
