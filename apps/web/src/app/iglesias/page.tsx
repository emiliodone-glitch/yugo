'use client';

import Link from 'next/link';
import { demoChurch, demoEvents, es } from '@yugo/shared';
import { BarTop, Kpi, Panel } from '@/components/admin';

export default function ChurchHomePage() {
  const churchEvents = demoEvents.filter((event) => event.churchName === demoChurch.name);
  return (
    <div>
      <BarTop
        title={demoChurch.name}
        right={
          <Link href="/iglesias/eventos/nuevo" className="btn btn-olive btn-sm">
            + {es.church.newEvent}
          </Link>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-3">
          <Kpi label={es.church.endorsedMembers} value={demoChurch.endorsedMembers} />
          <Kpi label="Eventos publicados" value={churchEvents.length} />
          <Kpi label="Miembros del grupo oficial" value="142" />
        </div>
        <Panel title="Próximos eventos">
          {churchEvents.map((event) => (
            <div key={event.id} className="list-row">
              <div className="flex-1">
                <b className="text-[12.5px]">{event.title}</b>
                <div className="text-[11px] text-muted">
                  {new Intl.DateTimeFormat('es-DO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Santo_Domingo',
                  }).format(new Date(event.startsAt))}
                </div>
              </div>
              <span className="chip chip-olive">{es.church.published}</span>
              <span className="chip">{event.goingCount} asistirán</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
