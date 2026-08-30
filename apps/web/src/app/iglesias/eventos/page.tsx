'use client';

import Link from 'next/link';
import { demoChurch, demoEvents, es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';

export default function ChurchEventsPage() {
  const churchEvents = demoEvents.filter((event) => event.churchName === demoChurch.name);
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
        <DataTable headers={['Evento', 'Tipo', 'Fecha', 'Asistirán', 'Estado']}>
          {churchEvents.map((event) => (
            <tr key={event.id}>
              <Td>
                <b>{event.title}</b>
              </Td>
              <Td>{event.typeName}</Td>
              <Td className="capitalize">
                {new Intl.DateTimeFormat('es-DO', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/Santo_Domingo',
                }).format(new Date(event.startsAt))}
              </Td>
              <Td>{event.goingCount}</Td>
              <Td>
                <span className="chip chip-olive">{es.church.published}</span>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
