'use client';

import { useState } from 'react';
import { demoEvents, es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';

export default function AdminEventsPage() {
  const [featured, setFeatured] = useState<Record<string, boolean>>({ 'ev-vigilia': true });
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const inReview = [
    { id: 'rev-1', title: 'Retiro de damas: Mujer virtuosa', church: 'Centro Cristiano Vida Nueva', date: '26 sep' },
  ];

  return (
    <div>
      <BarTop title={es.admin.events} right={<span className="chip">1 en revisión</span>} />
      <div className="p-6">
        <h2 className="h-display mb-2 text-[15px]">En revisión (RF-EVE-02)</h2>
        <DataTable headers={['Evento', 'Iglesia', 'Fecha', '']}>
          {inReview.map((event) => (
            <tr key={event.id}>
              <Td>
                <b>{event.title}</b>
              </Td>
              <Td>{event.church}</Td>
              <Td>{event.date}</Td>
              <Td>
                {approved[event.id] ? (
                  <span className="chip chip-olive">Publicado ✓</span>
                ) : (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-olive btn-sm"
                      onClick={() => setApproved((a) => ({ ...a, [event.id]: true }))}
                    >
                      Aprobar y publicar
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm">
                      Devolver
                    </button>
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>

        <h2 className="h-display mb-2 mt-6 text-[15px]">Publicados</h2>
        <DataTable headers={['Evento', 'Iglesia', 'Asistencias', 'Destacado', '']}>
          {demoEvents.map((event) => (
            <tr key={event.id}>
              <Td>
                <b>{event.title}</b>
              </Td>
              <Td>{event.churchName}</Td>
              <Td>{event.goingCount + event.interestedCount}</Td>
              <Td>
                <button
                  type="button"
                  className={`chip ${featured[event.id] ? 'chip-wheat' : ''}`}
                  onClick={() => setFeatured((f) => ({ ...f, [event.id]: !f[event.id] }))}
                >
                  {featured[event.id] ? '★ Destacado' : 'Destacar'}
                </button>
              </Td>
              <Td>
                <button type="button" className="btn btn-ghost btn-sm">
                  Editar
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
