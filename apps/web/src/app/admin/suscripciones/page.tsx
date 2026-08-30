'use client';

import { es } from '@yugo/shared';
import { BarTop, DataTable, Kpi, Td } from '@/components/admin';

const PAYMENTS = [
  { id: 'p1', member: 'emilio@…', tier: 'ORO', plan: 'Anual', channel: 'Stripe', amount: 'RD$ 6,990', status: 'Exitoso' },
  { id: 'p2', member: 'mariel@…', tier: 'PLUS', plan: 'Mensual', channel: 'App Store', amount: 'US$ 6.99', status: 'Exitoso' },
  { id: 'p3', member: 'carlos@…', tier: 'PLUS', plan: 'Anual', channel: 'Azul', amount: 'RD$ 2,990', status: 'Reembolso solicitado' },
  { id: 'p4', member: 'ana@…', tier: 'ORO', plan: 'Mensual', channel: 'Google Play', amount: 'US$ 14.99', status: 'Exitoso' },
];

export default function SubscriptionsAdminPage() {
  return (
    <div>
      <BarTop title={es.admin.subscriptions} right={<span className="chip">Exportar a Excel</span>} />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Suscriptores Plus" value="228" delta="▲ 11%" />
          <Kpi label="Suscriptores Oro" value="41" delta="▲ 24%" />
          <Kpi label="Ingresos del mes (RD$)" value="312,450" delta="▲ 19%" />
          <Kpi label="Reembolsos pendientes" value="1" small="Requiere doble aprobación" />
        </div>
        <DataTable headers={['Miembro', 'Nivel', 'Plan', 'Canal', 'Monto', 'Estado', '']}>
          {PAYMENTS.map((payment) => (
            <tr key={payment.id}>
              <Td>{payment.member}</Td>
              <Td>
                <span className={`chip ${payment.tier === 'ORO' ? 'chip-wheat' : ''}`}>{payment.tier}</span>
              </Td>
              <Td>{payment.plan}</Td>
              <Td>{payment.channel}</Td>
              <Td>{payment.amount}</Td>
              <Td className={payment.status.startsWith('Reembolso') ? 'text-wine' : ''}>{payment.status}</Td>
              <Td>
                {payment.status.startsWith('Reembolso') ? (
                  <button type="button" className="btn btn-sm">
                    Aprobar (1 de 2)
                  </button>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Un solo estado por cuenta; conciliación por canal. Los reembolsos exigen dos aprobaciones distintas (RF-ADM-09).
        </p>
      </div>
    </div>
  );
}
