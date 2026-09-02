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
import { demoModerationQueue, es, type HeldContentItem } from '@yugo/shared';
import { useHeldContent, useResolveHeld } from '@/lib/hooks';
import { BarTop, DataTable, Panel, PriorityChip, Td } from '@/components/admin';
import { Avatar, Segment } from '@/components/ui';

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
  const [taken, setTaken] = useState(3);
  const { data: held = [], isLoading } = useHeldContent();

  return (
    <div>
      <BarTop
        title={es.admin.moderationQueue}
        right={
          <div className="flex items-center gap-2">
            <span className="chip">{es.admin.assignedToMe(taken)}</span>
            <button type="button" className="btn btn-sm" onClick={() => setTaken((t) => t + 1)}>
              {es.admin.takeNext}
            </button>
          </div>
        }
      />
      <div className="p-6">
        <div className="mb-4 max-w-[560px]">
          <Segment
            value={queue}
            onChange={setQueue}
            options={[
              { value: 'held', label: es.admin.heldTab(held.length) },
              { value: 'reports', label: es.admin.reportsTab(demoModerationQueue.length) },
              { value: 'appeals', label: es.admin.appealsTab(2) },
            ]}
          />
        </div>

        {queue === 'held' ? (
          <HeldQueue items={held} loading={isLoading} />
        ) : queue === 'reports' ? (
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
            {demoModerationQueue.map((row) => (
              <tr key={row.id}>
                <Td>
                  <PriorityChip priority={row.priority} />
                </Td>
                <Td>{row.type}</Td>
                <Td>{row.reported}</Td>
                <Td>{row.reason}</Td>
                <Td>{row.evidence}</Td>
                <Td>{row.ageLabel}</Td>
                <Td>
                  <button
                    type="button"
                    className={`btn btn-sm ${row.priority === 'NORMAL' || row.priority === 'HIGH' ? 'btn-ghost' : ''}`}
                  >
                    {es.admin.review}
                  </button>
                </Td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Panel>
            <p className="text-sm text-muted">
              2 apelaciones abiertas. Revisa la sanción original y responde con plantilla.
            </p>
          </Panel>
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
              {approved ? 'Publicado. Se avisó a la persona.' : 'No publicado. Se avisó a la persona.'}
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

      {item.kind === 'photo' ? (
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
