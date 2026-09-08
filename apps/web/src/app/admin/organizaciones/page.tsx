'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useAdminChurches, useDecideChurch } from '@/lib/hooks';
import { BarTop, DataTable, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const STATUS: Record<string, { label: string; chip: string }> = {
  PENDING: { label: 'Pendiente', chip: '' },
  APPROVED: { label: 'Aprobada', chip: 'chip-olive' },
  REJECTED: { label: 'Rechazada', chip: 'chip-wine' },
  SUSPENDED: { label: 'Suspendida', chip: 'chip-wine' },
};

/**
 * Organizaciones (RF-ADM-05): iglesias y ministerios registrados desde el
 * portal. Aprobar crea el grupo oficial y habilita publicar eventos.
 */
export default function OrganizationsPage() {
  const churches = useAdminChurches();
  const decide = useDecideChurch();
  const [notice, setNotice] = useState<string | null>(null);
  const rows = churches.data ?? [];
  const pending = rows.filter((church) => church.status === 'PENDING').length;

  const act = async (id: string, approve: boolean) => {
    try {
      await decide.mutateAsync({ id, approve });
      setNotice(
        approve
          ? 'Iglesia aprobada: ya tiene grupo oficial y puede publicar eventos.'
          : 'Solicitud rechazada.',
      );
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  return (
    <div>
      <BarTop
        title={es.admin.organizations}
        right={<span className="chip">{pending} solicitudes pendientes</span>}
      />
      <div className="p-6">
        {notice ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {notice}
          </div>
        ) : null}
        {churches.isError ? (
          <QueryError error={churches.error} onRetry={() => void churches.refetch()} />
        ) : null}
        <DataTable
          headers={[
            'Organización',
            'Denominación',
            'Ciudad',
            'Responsable',
            'Eventos',
            'Estado',
            '',
          ]}
        >
          {churches.isLoading ? (
            <tr>
              <Td>{es.common.loading}</Td>
            </tr>
          ) : null}
          {rows.map((org) => (
            <tr key={org.id}>
              <Td>
                <b>{org.name}</b>
                <div className="text-[11px] text-muted">
                  Registrada el {new Date(org.createdAt).toLocaleDateString('es-DO')}
                </div>
              </Td>
              <Td>{org.denomination ?? '—'}</Td>
              <Td>{org.city ?? '—'}</Td>
              <Td>
                {org.contactName ?? '—'}
                {org.contactEmail ? (
                  <div className="text-[11px] text-muted">{org.contactEmail}</div>
                ) : null}
              </Td>
              <Td>{org.events}</Td>
              <Td>
                <span className={`chip ${STATUS[org.status]?.chip ?? ''}`}>
                  {STATUS[org.status]?.label ?? org.status}
                </span>
              </Td>
              <Td>
                {org.status === 'PENDING' ? (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-olive btn-sm"
                      disabled={decide.isPending}
                      onClick={() => void act(org.id, true)}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={decide.isPending}
                      onClick={() => void act(org.id, false)}
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
          Al aprobar, se crea el grupo oficial de la iglesia y puede publicar eventos (RF-ADM-05,
          RF-COM-03).
        </p>
      </div>
    </div>
  );
}
