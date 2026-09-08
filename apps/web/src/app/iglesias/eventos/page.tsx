'use client';

import Link from 'next/link';
import { es, EVENT_TYPES } from '@yugo/shared';
import { useChurchEvents, useSubmitChurchEvent } from '@/lib/hooks';
import { BarTop, DataTable, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const when = new Intl.DateTimeFormat('es-DO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Santo_Domingo',
});

const STATUS: Record<string, { label: string; chip: string }> = {
  PUBLISHED: { label: es.church.published, chip: 'chip-olive' },
  IN_REVIEW: { label: es.church.inReview, chip: 'chip-wheat' },
  DRAFT: { label: es.church.draft, chip: '' },
  REJECTED: { label: es.church.rejected, chip: 'chip-wine' },
  CANCELLED: { label: es.church.cancelled, chip: '' },
};

/** Todos los eventos de la iglesia, con su estado real y la acción que toca. */
export default function ChurchEventsPage() {
  const events = useChurchEvents();
  const submit = useSubmitChurchEvent();

  if (events.isLoading)
    return <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>;
  if (events.isError)
    return <QueryError error={events.error} onRetry={() => void events.refetch()} />;

  const rows = [...(events.data ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div>
      <BarTop
        title={es.church.events}
        right={
          <Link href="/iglesias/eventos/nuevo" className="btn btn-olive btn-sm">
            + {es.church.newEvent}
          </Link>
        }
      />
      <div className="p-6">
        {rows.length === 0 ? (
          <div className="card text-sm text-muted">{es.church.noEventsYet}</div>
        ) : (
          <DataTable headers={['Evento', 'Tipo', 'Fecha', 'Asistirán', 'Estado', '']}>
            {rows.map((event) => {
              const status = STATUS[event.status] ?? { label: event.status, chip: '' };
              return (
                <tr key={event.id}>
                  <Td>
                    <b>{event.title}</b>
                  </Td>
                  <Td>{EVENT_TYPES.find((t) => t.slug === event.type)?.name ?? event.type}</Td>
                  <Td className="capitalize">{when.format(new Date(event.startsAt))}</Td>
                  <Td>{event.goingCount}</Td>
                  <Td>
                    <span className={`chip ${status.chip}`}>{status.label}</span>
                  </Td>
                  <Td>
                    {event.status === 'DRAFT' ? (
                      <button
                        type="button"
                        className="btn btn-olive btn-sm"
                        disabled={submit.isPending}
                        onClick={() => submit.mutate(event.id)}
                      >
                        {es.church.sendToReview}
                      </button>
                    ) : null}
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
