'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';

const PENDING = [
  { id: 'o1', name: 'Iglesia Río de Vida', den: 'Pentecostal', city: 'La Romana', contact: 'Pastor J. Guzmán' },
  { id: 'o2', name: 'Ministerio Casa de Pan', den: 'Evangélica', city: 'Santo Domingo Norte', contact: 'Pastora M. Cuevas' },
  { id: 'o3', name: 'Iglesia Buenas Nuevas', den: 'Bautista', city: 'San Cristóbal', contact: 'Pastor E. Rosario' },
  { id: 'o4', name: 'Comunidad Cristo Vive', den: 'Iglesia de Dios', city: 'Higüey', contact: 'Pastor F. Santana' },
];

export default function OrganizationsPage() {
  const [decided, setDecided] = useState<Record<string, string>>({});
  return (
    <div>
      <BarTop title={es.admin.organizations} right={<span className="chip">4 solicitudes pendientes</span>} />
      <div className="p-6">
        <DataTable headers={['Organización', 'Denominación', 'Ciudad', 'Responsable', 'Estado', '']}>
          {PENDING.map((org) => (
            <tr key={org.id}>
              <Td>
                <b>{org.name}</b>
              </Td>
              <Td>{org.den}</Td>
              <Td>{org.city}</Td>
              <Td>{org.contact}</Td>
              <Td>
                {decided[org.id] ? (
                  <span className={`chip ${decided[org.id] === 'ok' ? 'chip-olive' : 'chip-wine'}`}>
                    {decided[org.id] === 'ok' ? 'Aprobada' : 'Rechazada'}
                  </span>
                ) : (
                  <span className="chip">Pendiente</span>
                )}
              </Td>
              <Td>
                {!decided[org.id] ? (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-olive btn-sm"
                      onClick={() => setDecided((d) => ({ ...d, [org.id]: 'ok' }))}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDecided((d) => ({ ...d, [org.id]: 'no' }))}
                    >
                      Rechazar
                    </button>
                  </span>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Al aprobar, se crea el grupo oficial de la iglesia y puede publicar eventos (RF-ADM-05, RF-COM-03).
        </p>
      </div>
    </div>
  );
}
