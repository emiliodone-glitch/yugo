'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useAdminGroups, useDecideGroup } from '@/lib/hooks';
import { BarTop, DataTable, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const STATUS: Record<string, { label: string; chip: string }> = {
  PENDING: { label: 'Pendiente', chip: 'chip-wheat' },
  ACTIVE: { label: 'Activo', chip: 'chip-olive' },
  ARCHIVED: { label: 'Archivado', chip: '' },
  CLOSED: { label: 'Cerrado', chip: 'chip-wine' },
};

/** Grupos (RF-COM-02/03): todos los reales, con los pendientes de aprobación arriba. */
export default function AdminGroupsPage() {
  const groups = useAdminGroups();
  const decide = useDecideGroup();
  const rows = groups.data ?? [];
  const pending = rows.filter((group) => group.status === 'PENDING').length;

  return (
    <div>
      <BarTop
        title={es.admin.groups}
        right={pending > 0 ? <span className="chip chip-wheat">{pending} por aprobar</span> : null}
      />
      <div className="p-6">
        {groups.isError ? (
          <QueryError error={groups.error} onRetry={() => void groups.refetch()} />
        ) : null}
        <DataTable
          headers={['Grupo', 'Categoría', 'Tipo', 'Miembros', 'Publicaciones', 'Estado', '']}
        >
          {groups.isLoading ? (
            <tr>
              <Td>{es.common.loading}</Td>
            </tr>
          ) : null}
          {rows.map((group) => (
            <tr key={group.id}>
              <Td>
                <b>{group.name}</b>
                {group.isOfficial ? (
                  <span className="ml-2 rounded-full bg-ink px-2 py-[2px] text-[10px] font-semibold text-white">
                    {es.common.official}
                  </span>
                ) : null}
                {group.churchName ? (
                  <div className="text-[11px] text-muted">{group.churchName}</div>
                ) : group.city ? (
                  <div className="text-[11px] text-muted">{group.city}</div>
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
              <Td>{group.postCount}</Td>
              <Td>
                <span className={`chip ${STATUS[group.status]?.chip ?? ''}`}>
                  {STATUS[group.status]?.label ?? group.status}
                </span>
              </Td>
              <Td>
                {group.status === 'PENDING' ? (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-olive btn-sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: group.id, approve: true })}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: group.id, approve: false })}
                    >
                      Rechazar
                    </button>
                  </span>
                ) : (
                  <Link href={`/comunidad/${group.id}`} className="btn btn-ghost btn-sm">
                    Ver
                  </Link>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Los grupos con 0 publicaciones en 90 días se archivan automáticamente con aviso previo
          (7.4).
        </p>
      </div>
    </div>
  );
}
