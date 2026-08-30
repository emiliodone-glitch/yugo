'use client';

import { demoGroups, es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';

export default function AdminGroupsPage() {
  return (
    <div>
      <BarTop title={es.admin.groups} />
      <div className="p-6">
        <DataTable headers={['Grupo', 'Categoría', 'Tipo', 'Miembros', 'Estado', '']}>
          {demoGroups.map((group) => (
            <tr key={group.id}>
              <Td>
                <b>{group.name}</b>
                {group.isOfficial ? (
                  <span className="ml-2 rounded-full bg-ink px-2 py-[2px] text-[10px] font-semibold text-white">
                    {es.common.official}
                  </span>
                ) : null}
              </Td>
              <Td>{group.category}</Td>
              <Td>
                {group.type === 'OPEN'
                  ? es.community.open
                  : group.type === 'APPROVAL'
                    ? es.community.withApproval
                    : es.common.official}
              </Td>
              <Td>{group.memberCount}</Td>
              <Td>
                <span className="chip chip-olive">Activo</span>
              </Td>
              <Td>
                <button type="button" className="btn btn-ghost btn-sm">
                  Ver
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Los grupos con 0 publicaciones en 90 días se archivan automáticamente con aviso previo (7.4).
        </p>
      </div>
    </div>
  );
}
