'use client';

/**
 * Cola de moderación (RF-ADM-04).
 *
 * La pestaña de retenidos es real: trae el texto de cada cosa que la
 * moderación automática paró —mensajes, publicaciones, fotos, peticiones de
 * oración, testimonios y reflexiones— y dos botones. Antes era un panel fijo
 * que decía «41 mensajes retenidos» y no permitía hacer nada; mientras tanto,
 * a quien escribía una petición se le decía «se publica cuando alguien la
 * apruebe» y nadie podía aprobarla.
 */
import { useState } from 'react';
import { es, type HeldContentItem } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useDecideCase,
  useHeldContent,
  useModerationQueue,
  useResolveHeld,
  useTakeNextCase,
  type ModerationQueueRow,
} from '@/lib/hooks';
import { BarTop, DataTable, Panel, PriorityChip, Td } from '@/components/admin';
import { Avatar, Segment } from '@/components/ui';
import { QueryError } from '@/components/query-error';

type Queue = 'reports' | 'held' | 'appeals';

function timeAgo(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

export default function ModerationQueuePage() {
  const [queue, setQueue] = useState<Queue>('held');
  const [taken, setTaken] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: held = [], isLoading } = useHeldContent();
  const reports = useModerationQueue('REPORT');
  const appeals = useModerationQueue('APPEAL');
  const takeNext = useTakeNextCase();

  const reportCount = reports.data?.counts.REPORT ?? reports.data?.items.length ?? 0;
  const appealCount = appeals.data?.counts.APPEAL ?? appeals.data?.items.length ?? 0;

  const take = async () => {
    setNotice(null);
    try {
      const result = await takeNext.mutateAsync();
      if (result && 'id' in result && result.id) {
        setTaken((t) => t + 1);
        setQueue('reports');
      } else {
        setNotice('No hay casos sin asignar. La cola está al día.');
      }
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  return (
    <div>
      <BarTop
        title={es.admin.moderationQueue}
        right={
          <div className="flex items-center gap-2">
            <span className="chip">{es.admin.assignedToMe(taken)}</span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={takeNext.isPending}
              onClick={() => void take()}
            >
              {es.admin.takeNext}
            </button>
          </div>
        }
      />
      <div className="p-6">
        {notice ? (
          <div role="status" className="mb-4 rounded-field bg-linen-2 px-4 py-3 text-sm">
            {notice}
          </div>
        ) : null}
        <div className="mb-4 max-w-[560px]">
          <Segment
            value={queue}
            onChange={setQueue}
            options={[
              { value: 'held', label: es.admin.heldTab(held.length) },
              { value: 'reports', label: es.admin.reportsTab(reportCount) },
              { value: 'appeals', label: es.admin.appealsTab(appealCount) },
            ]}
          />
        </div>

        {queue === 'held' ? (
          <HeldQueue items={held} loading={isLoading} />
        ) : queue === 'reports' ? (
          <CaseQueue
            kind="REPORT"
            rows={reports.data?.items ?? []}
            loading={reports.isLoading}
            error={reports.isError ? reports.error : null}
            onRetry={() => void reports.refetch()}
          />
        ) : (
          <CaseQueue
            kind="APPEAL"
            rows={appeals.data?.items ?? []}
            loading={appeals.isLoading}
            error={appeals.isError ? appeals.error : null}
            onRetry={() => void appeals.refetch()}
          />
        )}

        <div className="mt-4">
          <Panel title={es.admin.decisionsTitle}>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">{es.admin.decisionNoAction}</span>
              <span className="chip chip-wheat">{es.admin.decisionWarning}</span>
              <span className="chip chip-wheat">{es.admin.decisionSuspend}</span>
              <span className="chip chip-wine">{es.admin.decisionBan}</span>
              <span className="chip">{es.admin.decisionRemove}</span>
              <span className="chip">{es.admin.decisionRevoke}</span>
              <span className="chip chip-olive">{es.admin.decisionEscalate}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">{es.admin.decisionsNote}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const DECISIONS: Array<{ value: string; label: string }> = [
  { value: 'NO_ACTION', label: es.admin.decisionNoAction },
  { value: 'WARNING', label: es.admin.decisionWarning },
  { value: 'SUSPEND_3', label: 'Suspender 3 días' },
  { value: 'SUSPEND_7', label: 'Suspender 7 días' },
  { value: 'SUSPEND_30', label: 'Suspender 30 días' },
  { value: 'BAN', label: es.admin.decisionBan },
  { value: 'REMOVE_CONTENT', label: es.admin.decisionRemove },
  { value: 'REVOKE_VERIFICATION', label: es.admin.decisionRevoke },
  { value: 'ESCALATE', label: es.admin.decisionEscalate },
];

/**
 * Reportes y apelaciones reales. Cada fila se abre en un formulario con la
 * decisión y el motivo obligatorio; la API sanciona, notifica y audita.
 */
function CaseQueue({
  kind,
  rows,
  loading,
  error,
  onRetry,
}: {
  kind: 'REPORT' | 'APPEAL';
  rows: ModerationQueueRow[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const decide = useDecideCase();
  const [open, setOpen] = useState<string | null>(null);
  const [decision, setDecision] = useState('NO_ACTION');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async (id: string) => {
    if (reason.trim().length < 3) {
      setFailure('Escribe el motivo: toda decisión queda en la bitácora con él.');
      return;
    }
    setFailure(null);
    try {
      await decide.mutateAsync({ id, decision, reason: reason.trim() });
      const label = DECISIONS.find((option) => option.value === decision)?.label ?? decision;
      setResult(
        `Caso resuelto: ${label}. El miembro recibe la notificación con la plantilla correspondiente.`,
      );
      setOpen(null);
      setReason('');
      setDecision('NO_ACTION');
    } catch (caught) {
      setFailure(errorMessage(caught));
    }
  };

  if (loading) return <p className="text-sm text-muted">{es.common.loading}</p>;

  return (
    <section aria-label={kind === 'REPORT' ? 'Reportes' : 'Apelaciones'}>
      {error ? <QueryError error={error} onRetry={onRetry} /> : null}
      {result ? (
        <div
          role="status"
          className="mb-3 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
        >
          {result}
        </div>
      ) : null}
      {failure ? (
        <div role="alert" className="mb-3 rounded-field bg-wine-soft px-4 py-3 text-sm text-wine">
          {failure}
        </div>
      ) : null}
      {rows.length === 0 && !error ? (
        <Panel>
          <p className="text-sm text-olive-text">
            {kind === 'REPORT'
              ? 'No hay reportes abiertos. La cola está al día.'
              : 'No hay apelaciones abiertas. Cuando llegue una, revisa la sanción original y responde con plantilla.'}
          </p>
        </Panel>
      ) : (
        <DataTable
          headers={[
            es.admin.priority,
            es.admin.type,
            es.admin.reported,
            es.admin.reason,
            es.admin.evidence,
            es.admin.age,
            '',
          ]}
        >
          {rows.map((row) => (
            <tr key={row.id} className={open === row.id ? 'bg-linen' : ''}>
              <Td>
                <PriorityChip priority={row.priority} />
              </Td>
              <Td>{row.type}</Td>
              <Td>{row.reported}</Td>
              <Td>{row.reason}</Td>
              <Td>{row.evidence}</Td>
              <Td>{row.ageLabel}</Td>
              <Td>
                {open === row.id ? (
                  <div className="flex min-w-[320px] flex-col gap-1.5">
                    <select
                      className="field py-1.5 text-[12px]"
                      aria-label="Decisión"
                      value={decision}
                      onChange={(event) => setDecision(event.target.value)}
                    >
                      {DECISIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="field py-1.5 text-[12px]"
                      placeholder="Motivo (obligatorio, queda en la bitácora)"
                      aria-label="Motivo"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={decide.isPending}
                        onClick={() => void submit(row.id)}
                      >
                        Aplicar decisión
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setOpen(null)}
                      >
                        {es.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`btn btn-sm ${row.priority === 'NORMAL' || row.priority === 'HIGH' ? 'btn-ghost' : ''}`}
                    onClick={() => {
                      setOpen(row.id);
                      setResult(null);
                      setFailure(null);
                    }}
                  >
                    {es.admin.review}
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </section>
  );
}

function HeldQueue({ items, loading }: { items: HeldContentItem[]; loading: boolean }) {
  // Lo ya decidido en esta visita se queda en pantalla como confirmación
  // aunque el servidor ya no lo devuelva: si la tarjeta desapareciera al
  // instante, quien modera no sabría si su clic hizo algo.
  const [decided, setDecided] = useState<Record<string, boolean>>({});
  const pending = items.filter((item) => !(item.caseId in decided));

  if (loading) {
    return <p className="text-sm text-muted">{es.common.loading}</p>;
  }
  return (
    <section aria-label={es.admin.heldTitle}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="h-display text-[15px]">{es.admin.heldTitle}</h2>
        {pending.length > 0 ? (
          <span className="text-[12px] text-muted">{es.admin.heldWaiting(pending.length)}</span>
        ) : null}
      </div>
      {/* Se dice en positivo y se dice aunque queden recibos de lo recién
          decidido: la persona que modera necesita saber que terminó. */}
      {pending.length === 0 ? (
        <Panel>
          <p className="text-sm text-olive-text">{es.admin.heldEmpty}</p>
        </Panel>
      ) : null}
      <ul className="mt-3 grid gap-3 xl:grid-cols-2">
        {Object.entries(decided).map(([caseId, approved]) => (
          <li
            key={caseId}
            className={`card m-0 ${approved ? 'bg-olive-soft text-olive-text' : 'bg-wine-soft text-wine'}`}
          >
            <div className="text-[12px] font-semibold">
              {approved
                ? 'Publicado. Se avisó a la persona.'
                : 'No publicado. Se avisó a la persona.'}
            </div>
          </li>
        ))}
        {pending.map((item) => (
          <HeldCard
            key={item.caseId}
            item={item}
            onDecided={(approved) => setDecided((d) => ({ ...d, [item.caseId]: approved }))}
          />
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">{es.admin.heldNote}</p>
    </section>
  );
}

function HeldCard({
  item,
  onDecided,
}: {
  item: HeldContentItem;
  onDecided: (approved: boolean) => void;
}) {
  const resolve = useResolveHeld();

  return (
    <li className="card m-0 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={item.authorName} size="s" />
          <div>
            <div className="text-[12.5px] font-semibold">{item.authorName}</div>
            <div className="text-[11px] text-muted">{item.context}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PriorityChip priority={item.priority} />
          <span className="text-[10.5px] text-muted">{timeAgo(item.createdAt)}</span>
        </div>
      </div>

      {item.kind === 'voice' ? (
        item.audioUrl ? (
          <div className="rounded-field bg-linen px-3 py-2">
            <audio controls preload="none" src={item.audioUrl} className="w-full">
              Tu navegador no reproduce audio.
            </audio>
            <p className="mt-1 text-[11px] text-muted">
              Escúchalo entero antes de decidir: sin datos de contacto, sin nombres de terceros, sin
              nada que no diría en su iglesia.
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-muted">No se pudo cargar el audio.</p>
        )
      ) : item.kind === 'photo' ? (
        item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="max-h-[260px] w-full rounded-card object-cover"
          />
        ) : (
          <p className="text-[12px] text-muted">No se pudo cargar la foto.</p>
        )
      ) : (
        <blockquote className="rounded-field border-l-[3px] border-wheat bg-linen px-3 py-2 text-[13px] leading-relaxed">
          {item.text}
        </blockquote>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="chip">
          {es.admin.heldKind[item.kind]}
          {item.risk !== null ? ` · ${es.admin.heldRisk(Math.round(item.risk * 100))}` : ''}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={resolve.isPending}
            onClick={async () => {
              await resolve.mutateAsync({ caseId: item.caseId, approve: false });
              onDecided(false);
            }}
          >
            {es.admin.heldReject}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-olive"
            disabled={resolve.isPending}
            onClick={async () => {
              await resolve.mutateAsync({ caseId: item.caseId, approve: true });
              onDecided(true);
            }}
          >
            {es.admin.heldApprove}
          </button>
        </div>
      </div>
    </li>
  );
}
