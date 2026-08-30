'use client';

import { useState } from 'react';
import { demoDiscover, es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';
import { Avatar } from '@/components/ui';

const EXTRA = [
  { name: 'Emilio Doñe', age: 34, city: 'Santo Domingo', level: 2, tier: 'ORO', reports: 0 },
  { name: 'Carlos Medina', age: 41, city: 'Santiago', level: 1, tier: null, reports: 2 },
];

export default function MembersPage() {
  const [query, setQuery] = useState('');
  const rows = [
    ...demoDiscover.map((p) => ({
      name: p.displayName,
      age: p.age,
      city: p.city,
      level: p.badges.endorsedBy ? 3 : p.badges.identity ? 2 : 1,
      tier: null as string | null,
      reports: 0,
    })),
    ...EXTRA,
  ].filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <BarTop
        title={es.admin.members}
        right={
          <input
            className="field w-64"
            placeholder="Buscar por nombre o correo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
      />
      <div className="p-6">
        <DataTable headers={['Miembro', 'Edad', 'Ciudad', 'Verificación', 'Suscripción', 'Reportes', '']}>
          {rows.map((row) => (
            <tr key={row.name}>
              <Td>
                <span className="flex items-center gap-2">
                  <Avatar name={row.name} size="s" />
                  <b>{row.name}</b>
                </span>
              </Td>
              <Td>{row.age}</Td>
              <Td>{row.city}</Td>
              <Td>
                <span className={`chip ${row.level >= 3 ? 'chip-olive' : ''}`}>Nivel {row.level}</span>
              </Td>
              <Td>{row.tier ? <span className="chip chip-wheat">{row.tier}</span> : <span className="text-muted">Gratuito</span>}</Td>
              <Td className={row.reports > 0 ? 'font-semibold text-wine' : ''}>{row.reports}</Td>
              <Td>
                <button type="button" className="btn btn-ghost btn-sm">
                  Ver ficha
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
