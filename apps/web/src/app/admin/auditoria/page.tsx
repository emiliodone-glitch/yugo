'use client';

import { es } from '@yugo/shared';
import { BarTop, DataTable, Panel, Td } from '@/components/admin';

const ROLES = [
  { role: 'Moderador', people: 4, scope: 'Reportes, retenidos por IA, verificaciones' },
  { role: 'Gestor de comunidad', people: 2, scope: 'Iglesias, grupos, eventos, destacados' },
  { role: 'Soporte', people: 3, scope: 'Tickets, accesos, reembolsos (con aprobación)' },
  { role: 'Finanzas', people: 1, scope: 'Suscripciones, pagos, conciliación' },
  { role: 'Superadmin', people: 1, scope: 'Todo + configuración y auditoría' },
];

const AUDIT = [
  { at: '29 ago 14:02', actor: 'admin@yugo.do', action: 'SETTINGS_AFFINITY_WEIGHTS', target: 'affinity.weights' },
  { at: '29 ago 13:40', actor: 'mod1@yugo.do', action: 'VERIFICATION_APPROVE', target: 'Mariel Peña' },
  { at: '29 ago 12:15', actor: 'mod2@yugo.do', action: 'CASE_SUSPEND_7', target: '@carlos.mv' },
  { at: '29 ago 10:03', actor: 'gestor@yugo.do', action: 'CHURCH_APPROVED', target: 'Iglesia Río de Vida' },
  { at: '28 ago 18:30', actor: 'finanzas@yugo.do', action: 'REFUND_FIRST_APPROVAL', target: 'Pago p3' },
];

export default function AuditPage() {
  return (
    <div>
      <BarTop title={es.admin.rolesAudit} right={<span className="chip">2FA obligatorio ✓</span>} />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Panel title="Roles y permisos">
            {ROLES.map((r) => (
              <div key={r.role} className="list-row">
                <div className="flex-1">
                  <b className="text-[12.5px]">{r.role}</b>
                  <div className="text-[11px] text-muted">{r.scope}</div>
                </div>
                <span className="chip">{r.people}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Bitácora de auditoría (inmutable)">
            <DataTable headers={['Fecha', 'Actor', 'Acción', 'Objetivo']}>
              {AUDIT.map((entry) => (
                <tr key={`${entry.at}-${entry.action}`}>
                  <Td className="whitespace-nowrap">{entry.at}</Td>
                  <Td>{entry.actor}</Td>
                  <Td>
                    <code className="text-[11px]">{entry.action}</code>
                  </Td>
                  <Td>{entry.target}</Td>
                </tr>
              ))}
            </DataTable>
            <p className="mt-2 text-[11px] text-muted">
              Registro append-only: ninguna ruta del sistema puede modificarlo ni borrarlo (RF-ADM-11).
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
