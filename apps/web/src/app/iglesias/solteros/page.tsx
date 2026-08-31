'use client';

/**
 * Ministerio de solteros.
 *
 * The church stops being a name on a badge and becomes something that
 * convokes: it calls people together and sees whether they came. Everything
 * here is a total or a rate — no names, no attendee lists, nothing about who
 * is talking to whom. That line is what makes the endorsement worth anything.
 */
import Link from 'next/link';
import { es } from '@yugo/shared';
import { useSinglesMinistry } from '@/lib/hooks';
import { BarTop, Kpi, Panel } from '@/components/admin';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

export default function SinglesMinistryPage() {
  const { data, isLoading } = useSinglesMinistry();

  return (
    <div>
      <BarTop
        title={es.singlesMinistry.title}
        right={
          <Link href="/iglesias/eventos" className="chip chip-wheat">
            {es.singlesMinistry.convoke}
          </Link>
        }
      />
      <div className="p-6">
        <p className="mb-4 text-[12px] text-muted">{es.singlesMinistry.intro}</p>

        {isLoading || !data ? (
          <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
              <Kpi
                label={es.singlesMinistry.endorsedSingles}
                value={data.endorsedSingles.toLocaleString('es-DO')}
              />
              <Kpi
                label={es.singlesMinistry.pastEncounters}
                value={data.pastEncounters.toLocaleString('es-DO')}
              />
              <Kpi label={es.singlesMinistry.going} value={data.going.toLocaleString('es-DO')} />
              <Kpi
                label={es.singlesMinistry.checkInRate}
                value={`${data.checkInRate}%`}
                small={`${data.checkIns.toLocaleString('es-DO')} check-ins`}
              />
            </div>

            {/* El número que cambia lo que hace una iglesia la próxima vez. */}
            {data.waitlisted > 0 ? (
              <div className="mb-4 rounded-[14px] border border-wheat bg-wheat-soft px-4 py-3">
                <b className="text-[12.5px] text-wheat-text">
                  {data.waitlisted.toLocaleString('es-DO')} {es.singlesMinistry.waitlisted.toLowerCase()}
                </b>
                <p className="mt-0.5 text-[11.5px] text-wheat-text">
                  {es.singlesMinistry.demandHint}
                </p>
              </div>
            ) : null}

            <Panel title={es.singlesMinistry.upcoming}>
              {data.upcoming.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  {es.singlesMinistry.noneUpcoming}
                </p>
              ) : (
                data.upcoming.map((encounter) => {
                  const pct = encounter.capacity
                    ? Math.min(100, Math.round((encounter.going / encounter.capacity) * 100))
                    : 0;
                  return (
                    <div key={encounter.id} className="mb-3 last:mb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                        <b>{encounter.title}</b>
                        <span className="text-[11px] capitalize text-muted">
                          {formatDate(encounter.startsAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {encounter.capacity
                          ? es.singlesMinistry.seatsOf(encounter.going, encounter.capacity)
                          : `${encounter.going} confirmaciones`}
                        {encounter.waitlisted > 0
                          ? ` · ${es.events.waitlistCount(encounter.waitlisted)}`
                          : ''}
                      </div>
                      {encounter.capacity ? (
                        <div className="bar mt-1">
                          <i style={{ width: `${pct}%`, background: '#6B7445' }} />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </Panel>

            {/* Lo que este panel no muestra, dicho aquí y no solo en un anexo. */}
            <p className="mt-4 rounded-field bg-olive-soft px-3 py-2.5 text-[11.5px] text-olive-text">
              {data.privacyNote}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
