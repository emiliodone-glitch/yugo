'use client';

import { useState } from 'react';
import { es, intlLocale } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useAdminVerificationQueue, useDecideVerification } from '@/lib/hooks';
import { BarTop, Panel } from '@/components/admin';
import { PhotoPlaceholder } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

/**
 * Verificación de identidad (RF-ADM-03): la cola real, un caso a la vez, con
 * la selfie y la foto principal en URL firmada, el puntaje de similitud y el
 * historial. Cada decisión va a la API y queda en la bitácora.
 */
export default function VerificationQueuePage() {
  const queue = useAdminVerificationQueue();
  const decide = useDecideVerification();
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = queue.data ?? [];
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];

  const act = async (kind: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (!current) return;
    setError(null);
    try {
      await decide.mutateAsync({ id: current.id, decision: kind, note: note.trim() || undefined });
      setDecision(kind);
      setNote('');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const similarityChip = (value: number | null) => {
    if (value === null) return <span className="chip">Sin puntaje</span>;
    const pct = Math.round(value * 100);
    return (
      <span
        className={`chip ${value >= 0.85 ? 'chip-olive' : value >= 0.7 ? 'chip-wheat' : 'chip-wine'}`}
      >
        {pct}% · {value >= 0.85 ? 'alta' : value >= 0.7 ? 'media' : 'baja'}
      </span>
    );
  };

  return (
    <div>
      <BarTop
        title={
          current
            ? es.admin.verificationCase(Math.min(index, items.length - 1) + 1, items.length)
            : es.admin.verifications
        }
        right={
          current ? (
            <span className="chip">
              {current.displayName} · {current.age}
              {current.city ? ` · ${current.city}` : ''}
            </span>
          ) : null
        }
      />
      <div className="p-6">
        {queue.isError ? (
          <QueryError error={queue.error} onRetry={() => void queue.refetch()} />
        ) : null}
        {decision ? (
          <div
            role="status"
            className={`mb-4 rounded-field px-4 py-3 text-sm ${
              decision === 'APPROVE'
                ? 'bg-olive-soft text-olive-text'
                : decision === 'REJECT'
                  ? 'bg-wheat-soft text-wheat-text'
                  : 'bg-wine-soft text-wine'
            }`}
          >
            {decision === 'APPROVE'
              ? 'Identidad aprobada. El caso quedó registrado en la bitácora.'
              : decision === 'REJECT'
                ? 'Selfie rechazada; se pidió una nueva al miembro.'
                : 'Caso escalado como posible menor: perfil oculto preventivamente (SLA 12 h).'}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="mb-4 rounded-field bg-wine-soft px-4 py-3 text-sm text-wine">
            {error}
          </div>
        ) : null}

        {queue.isLoading ? (
          <Panel>
            <p className="text-sm text-muted">{es.common.loading}</p>
          </Panel>
        ) : !current ? (
          <Panel>
            <p className="text-sm text-muted">
              No hay verificaciones pendientes. La cola está al día.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] text-muted">
                    {es.admin.selfieLive} · {shortDate(current.createdAt)}
                  </div>
                  <PhotoPlaceholder
                    className="h-[260px] rounded-card"
                    photoUrl={current.selfieUrl ?? undefined}
                    name={current.displayName}
                    alt="Selfie en vivo"
                  />
                  {!current.selfieUrl ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Sin archivo de selfie en el almacenamiento.
                    </p>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] text-muted">{es.admin.mainPhoto}</div>
                  <PhotoPlaceholder
                    className="h-[260px] rounded-card"
                    photoUrl={current.photoUrl ?? undefined}
                    name={current.displayName}
                    alt="Foto principal del perfil"
                  />
                  {!current.photoUrl ? (
                    <p className="mt-1 text-[11px] text-muted">
                      El miembro aún no tiene foto aprobada.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12.5px]">
                <span>{es.admin.similarity}</span>
                {similarityChip(current.similarity)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
                <span>{es.admin.liveness}</span>
                {current.livenessPassed === null ? (
                  <span className="chip">Sin prueba</span>
                ) : current.livenessPassed ? (
                  <span className="chip chip-olive">{es.admin.livenessPassed}</span>
                ) : (
                  <span className="chip chip-wine">No superada</span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
                <span>{es.admin.declaredBirth}</span>
                <span className="chip">
                  {new Date(current.birthDate).toLocaleDateString(intlLocale())} · {current.age}{' '}
                  años
                </span>
              </div>
              {current.priority ? (
                <p className="mt-2 rounded-field bg-wheat-soft px-3 py-2 text-[11.5px] text-wheat-text">
                  Prioridad Oro: compromiso de respuesta en menos de 4 horas.
                </p>
              ) : null}
            </Panel>

            <Panel title={es.admin.decision}>
              <textarea
                className="field mb-3 h-20 resize-none"
                placeholder={es.admin.internalNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-olive"
                disabled={decide.isPending}
                onClick={() => void act('APPROVE')}
              >
                {es.admin.approveIdentity}
              </button>
              <button
                type="button"
                className="btn btn-ghost mt-2"
                disabled={decide.isPending}
                onClick={() => void act('REJECT')}
              >
                {es.admin.rejectSelfie}
              </button>
              <button
                type="button"
                className="btn btn-wine mt-2"
                disabled={decide.isPending}
                onClick={() => void act('ESCALATE')}
              >
                {es.admin.escalateMinor}
              </button>
              <p className="mt-3 text-[11px] text-muted">
                {es.admin.memberHistory(
                  current.history.reports,
                  current.history.sanctions,
                  new Date(current.history.since).toLocaleDateString(intlLocale()),
                )}
              </p>
              {items.length > 1 ? (
                <div className="mt-3 flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => {
                      setIndex((i) => Math.max(0, i - 1));
                      setDecision(null);
                    }}
                  >
                    ‹ Anterior
                  </button>
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index >= items.length - 1}
                    onClick={() => {
                      setIndex((i) => Math.min(items.length - 1, i + 1));
                      setDecision(null);
                    }}
                  >
                    Siguiente ›
                  </button>
                </div>
              ) : null}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
