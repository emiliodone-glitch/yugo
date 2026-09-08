'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useChurchEvents, useChurchMe } from '@/lib/hooks';
import { BarTop, Kpi, Panel } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const when = new Intl.DateTimeFormat('es-DO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Santo_Domingo',
});

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: es.church.published,
  IN_REVIEW: es.church.inReview,
  DRAFT: es.church.draft,
};

/** Portada del portal: la iglesia de quien entró, sus cifras y su agenda. */
export default function ChurchHomePage() {
  const me = useChurchMe();
  const events = useChurchEvents();

  if (me.isLoading || events.isLoading) {
    return <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>;
  }
  if (me.isError || !me.data)
    return <QueryError error={me.error} onRetry={() => void me.refetch()} />;
  if (events.isError)
    return <QueryError error={events.error} onRetry={() => void events.refetch()} />;

  const upcoming = (events.data ?? [])
    .filter((event) => new Date(event.startsAt).getTime() >= Date.now() - 3 * 3600_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const published = (events.data ?? []).filter((event) => event.status === 'PUBLISHED');

  return (
    <div>
      <BarTop
        title={me.data.church.name}
        right={
          <Link href="/iglesias/eventos/nuevo" className="btn btn-olive btn-sm">
            + {es.church.newEvent}
          </Link>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-3">
          <Kpi label={es.church.endorsedMembers} value={me.data.stats.endorsedMembers} />
          <Kpi label={es.church.publishedEvents} value={published.length} />
          <Kpi label={es.church.pendingRequests} value={me.data.stats.pendingRequests} />
        </div>
        <Panel title={es.church.upcoming}>
          {upcoming.length === 0 ? (
            <div className="text-[12.5px] text-muted">{es.church.noUpcoming}</div>
          ) : (
            upcoming.map((event) => (
              <div key={event.id} className="list-row">
                <div className="flex-1">
                  <b className="text-[12.5px]">{event.title}</b>
                  <div className="text-[11px] capitalize text-muted">
                    {when.format(new Date(event.startsAt))}
                  </div>
                </div>
                <span
                  className={`chip ${event.status === 'PUBLISHED' ? 'chip-olive' : event.status === 'IN_REVIEW' ? 'chip-wheat' : ''}`}
                >
                  {STATUS_LABEL[event.status] ?? event.status}
                </span>
                <span className="chip">{es.church.goingCount(event.goingCount)}</span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
