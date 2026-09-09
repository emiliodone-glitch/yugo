'use client';

import { useState } from 'react';
import { es, intlLocale } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useAdminPayments, useAdminSubscriptionSummary, useApproveRefund } from '@/lib/hooks';
import { BarTop, DataTable, Kpi, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const PLAN: Record<string, string> = {
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  ANNUAL: 'Anual',
};
const PROVIDER: Record<string, string> = {
  STRIPE: 'Stripe',
  AZUL: 'Azul',
  APP_STORE: 'App Store',
  GOOGLE_PLAY: 'Google Play',
  PROMO: 'Código promocional',
};
const STATUS: Record<string, string> = {
  PENDING: 'Pendiente',
  SUCCEEDED: 'Exitoso',
  FAILED: 'Fallido',
  REFUND_REQUESTED: 'Reembolso solicitado',
  REFUNDED: 'Reembolsado',
};

const money = (amount: number, currency: string) =>
  `${currency === 'DOP' ? 'RD$' : 'US$'} ${amount.toLocaleString(intlLocale(), { minimumFractionDigits: currency === 'DOP' ? 0 : 2 })}`;

/** Suscripciones y pagos (RF-ADM-09): resumen real y reembolsos con doble aprobación. */
export default function SubscriptionsAdminPage() {
  const summary = useAdminSubscriptionSummary();
  const payments = useAdminPayments();
  const approve = useApproveRefund();
  const [notice, setNotice] = useState<string | null>(null);
  const rows = payments.data ?? [];

  const refund = async (id: string) => {
    try {
      const result = await approve.mutateAsync(id);
      setNotice(
        result.status === 'awaiting_second_approval'
          ? 'Primera aprobación registrada. Otra persona del equipo debe dar la segunda.'
          : 'Reembolso aprobado por segunda persona: se ejecuta con el proveedor.',
      );
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  return (
    <div>
      <BarTop title={es.admin.subscriptions} />
      <div className="p-6">
        {notice ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {notice}
          </div>
        ) : null}
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Suscriptores Plus" value={summary.data?.plus ?? '…'} />
          <Kpi label="Suscriptores Oro" value={summary.data?.oro ?? '…'} />
          <Kpi
            label="Ingresos del mes (RD$)"
            value={summary.data ? summary.data.revenueMonthDop.toLocaleString(intlLocale()) : '…'}
          />
          <Kpi
            label="Reembolsos pendientes"
            value={summary.data?.refundsPending ?? '…'}
            small="Requiere doble aprobación"
          />
        </div>
        {payments.isError ? (
          <QueryError error={payments.error} onRetry={() => void payments.refetch()} />
        ) : null}
        <DataTable headers={['Miembro', 'Nivel', 'Plan', 'Canal', 'Monto', 'Fecha', 'Estado', '']}>
          {payments.isLoading ? (
            <tr>
              <Td>{es.common.loading}</Td>
            </tr>
          ) : null}
          {rows.map((payment) => (
            <tr key={payment.id}>
              <Td>{payment.email ?? '—'}</Td>
              <Td>
                {payment.tier ? (
                  <span className={`chip ${payment.tier === 'ORO' ? 'chip-wheat' : ''}`}>
                    {payment.tier}
                  </span>
                ) : (
                  '—'
                )}
              </Td>
              <Td>{payment.plan ? (PLAN[payment.plan] ?? payment.plan) : '—'}</Td>
              <Td>{PROVIDER[payment.provider] ?? payment.provider}</Td>
              <Td>{money(payment.amount, payment.currency)}</Td>
              <Td>{new Date(payment.createdAt).toLocaleDateString(intlLocale())}</Td>
              <Td className={payment.status === 'REFUND_REQUESTED' ? 'text-wine' : ''}>
                {STATUS[payment.status] ?? payment.status}
              </Td>
              <Td>
                {payment.status === 'REFUND_REQUESTED' || payment.status === 'SUCCEEDED' ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={approve.isPending}
                    onClick={() => void refund(payment.id)}
                  >
                    {payment.firstApprovalGiven ? 'Aprobar (2 de 2)' : 'Aprobar (1 de 2)'}
                  </button>
                ) : null}
              </Td>
            </tr>
          ))}
          {!payments.isLoading && rows.length === 0 ? (
            <tr>
              <Td>Todavía no hay pagos registrados.</Td>
            </tr>
          ) : null}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Un solo estado por cuenta; conciliación por canal. Los reembolsos exigen dos aprobaciones
          de personas distintas (RF-ADM-09).
        </p>
      </div>
    </div>
  );
}
