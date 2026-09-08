'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { useAdminStaff, useAuditLog } from '@/lib/hooks';
import { BarTop, DataTable, Panel, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const ROLES: Array<{ role: string; label: string; scope: string }> = [
  { role: 'MODERATOR', label: 'Moderador', scope: 'Reportes, retenidos por IA, verificaciones' },
  {
    role: 'COMMUNITY_MANAGER',
    label: 'Gestor de comunidad',
    scope: 'Iglesias, grupos, eventos, destacados',
  },
  { role: 'SUPPORT', label: 'Soporte', scope: 'Tickets, accesos, reembolsos (con aprobación)' },
  { role: 'FINANCE', label: 'Finanzas', scope: 'Suscripciones, pagos, conciliación' },
  { role: 'SUPERADMIN', label: 'Superadmin', scope: 'Todo + configuración y auditoría' },
];

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');

/**
 * Roles y auditoría (RF-ADM-10/11): el equipo real con su 2FA y la bitácora
 * tal cual la escribe la API. Antes ambas tablas eran texto fijo.
 */
export default function AuditPage() {
  const [filter, setFilter] = useState('');
  const staff = useAdminStaff();
  const audit = useAuditLog(filter.trim() || undefined);
  const people = staff.data ?? [];
  const everyoneHas2fa = people.length > 0 && people.every((person) => person.twoFactorEnabled);
  const without2fa = people.filter((person) => !person.twoFactorEnabled);

  return (
    <div>
      <BarTop
        title={es.admin.rolesAudit}
        right={
          <span className={`chip ${everyoneHas2fa || people.length === 0 ? '' : 'chip-wine'}`}>
            {people.length === 0 || everyoneHas2fa
              ? '2FA obligatorio ✓'
              : `2FA obligatorio · ${without2fa.length} sin activar`}
          </span>
        }
      />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Panel title="Roles y permisos">
            {staff.isError ? (
              <QueryError error={staff.error} onRetry={() => void staff.refetch()} />
            ) : null}
            {ROLES.map((r) => {
              const members = people.filter((person) => person.role === r.role);
              return (
                <div key={r.role} className="list-row">
                  <div className="flex-1">
                    <b className="text-[12.5px]">{r.label}</b>
                    <div className="text-[11px] text-muted">{r.scope}</div>
                    {members.length > 0 ? (
                      <div className="mt-0.5 text-[11px] text-ink">
                        {members.map((person) => person.email).join(' · ')}
                      </div>
                    ) : null}
                  </div>
                  <span className="chip">{staff.isLoading ? '…' : members.length}</span>
                </div>
              );
            })}
            {without2fa.length > 0 ? (
              <p className="mt-2 rounded-field bg-wine-soft px-3 py-2 text-[11.5px] text-wine">
                Sin 2FA: {without2fa.map((person) => person.email).join(', ')}. No pueden entrar al
                panel hasta activarlo.
              </p>
            ) : null}
          </Panel>
          <Panel
            title="Bitácora de auditoría (inmutable)"
            titleExtra={
              <input
                className="field w-44 py-1 text-[12px]"
                placeholder="Filtrar por acción"
                aria-label="Filtrar por acción"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            }
          >
            {audit.isError ? (
              <QueryError error={audit.error} onRetry={() => void audit.refetch()} />
            ) : null}
            <DataTable headers={['Fecha', 'Actor', 'Acción', 'Objetivo']}>
              {audit.isLoading ? (
                <tr>
                  <Td>{es.common.loading}</Td>
                </tr>
              ) : null}
              {(audit.data ?? []).map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap">{when(entry.createdAt)}</Td>
                  <Td>{entry.actorId}</Td>
                  <Td>
                    <code className="text-[11px]">{entry.action}</code>
                  </Td>
                  <Td>
                    {entry.targetType ? (
                      <span className="text-muted">{entry.targetType} · </span>
                    ) : null}
                    {entry.targetId ?? '—'}
                  </Td>
                </tr>
              ))}
              {!audit.isLoading && (audit.data ?? []).length === 0 ? (
                <tr>
                  <Td>Sin entradas para ese filtro.</Td>
                </tr>
              ) : null}
            </DataTable>
            <p className="mt-2 text-[11px] text-muted">
              Registro append-only: ninguna ruta del sistema puede modificarlo ni borrarlo
              (RF-ADM-11).
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
