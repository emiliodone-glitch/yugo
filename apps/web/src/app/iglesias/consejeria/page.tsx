'use client';

/**
 * Consejería prematrimonial (RF-REL-05), lado de la iglesia.
 *
 * Es la única pantalla del portal con nombres, y la razón está escrita
 * arriba: la pareja pidió esto, los dos, y saben que la iglesia lo verá. La
 * conversación no aparece aquí ni en ningún otro sitio del portal.
 */
import { useState } from 'react';
import { es, type PortalCounselingRequest } from '@yugo/shared';
import { useCounselingRequests, useRespondCounselingRequest } from '@/lib/hooks';
import { BarTop, Panel } from '@/components/admin';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

export default function CounselingPage() {
  const { data, isLoading } = useCounselingRequests();
  const pending = (data ?? []).filter((row) => row.status === 'REQUESTED');
  const answered = (data ?? []).filter((row) => row.status !== 'REQUESTED');

  return (
    <div>
      <BarTop title={es.church.counseling} />
      <div className="p-6">
        <p className="mb-4 max-w-[720px] text-[12px] text-muted">{es.church.counselingIntro}</p>

        {isLoading || !data ? (
          <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
        ) : data.length === 0 ? (
          <div className="card py-8 text-center text-sm text-muted">
            {es.church.counselingEmpty}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={es.church.counselingStatuses.REQUESTED}>
              {pending.length === 0 ? (
                <p className="text-[12px] text-muted">{es.church.counselingEmpty}</p>
              ) : (
                <ul className="space-y-3">
                  {pending.map((row) => (
                    <RequestRow key={row.id} row={row} />
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Respondidas">
              {answered.length === 0 ? (
                <p className="text-[12px] text-muted">—</p>
              ) : (
                <ul className="space-y-3">
                  {answered.map((row) => (
                    <RequestRow key={row.id} row={row} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestRow({ row }: { row: PortalCounselingRequest }) {
  const respond = useRespondCounselingRequest();
  const [message, setMessage] = useState('');
  const open = row.status === 'REQUESTED';

  return (
    <li
      className="rounded-field border border-line bg-white px-3.5 py-3"
      aria-label={row.names.join(' y ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <b className="text-[13px]">{row.names.join(' y ')}</b>
          <p className="text-[11px] text-muted">
            {es.relationship.stages[row.stage]} ·{' '}
            {es.church.counselingRequestedOn(formatDate(row.createdAt))}
          </p>
          <p className="text-[11px] text-muted">{row.emails.filter(Boolean).join(' · ')}</p>
        </div>
        <span
          className={`chip ${row.status === 'ACCEPTED' ? 'chip-olive' : row.status === 'REQUESTED' ? 'chip-wheat' : ''}`}
        >
          {es.church.counselingStatuses[row.status] ?? row.status}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] text-body">«{row.note}»</p>

      {open ? (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            respond.mutate({ id: row.id, accept: true, message });
          }}
        >
          <label className="mb-1 block text-[11px] text-muted" htmlFor={`msg-${row.id}`}>
            {es.church.counselingResponseLabel}
          </label>
          <textarea
            id={`msg-${row.id}`}
            className="field w-full"
            rows={2}
            placeholder={es.church.counselingResponsePlaceholder}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={600}
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn btn-sm" disabled={respond.isPending}>
              {es.church.counselingAccept}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ id: row.id, accept: false, message })}
            >
              {es.church.counselingDecline}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 text-[11.5px] text-muted">
          {row.respondedAt ? es.church.counselingRespondedOn(formatDate(row.respondedAt)) : null}
          {row.responseNote ? ` · «${row.responseNote}»` : ''}
        </p>
      )}
    </li>
  );
}
