'use client';

import { es, intlLocale } from '@yugo/shared';
import { useAdminDashboard } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { BarTop, Kpi, Panel, PriorityChip } from '@/components/admin';
import { QueryError } from '@/components/query-error';

/**
 * Tablero: los números reales de los últimos 30 días y lo que requiere
 * atención hoy. Hasta ahora esta pantalla vivía de fixtures y mostraba
 * 4.812 miembros activos en un piloto de cuarenta; un tablero que miente
 * es peor que uno vacío.
 */
export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch } = useAdminDashboard();

  if (isLoading)
    return <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>;
  if (isError || !data) return <QueryError error={error} onRetry={() => void refetch()} />;

  const { kpis, attention } = data;
  const fmt = (n: number) => n.toLocaleString(intlLocale());

  return (
    <div>
      <BarTop
        title={es.admin.dashboard}
        right={
          <div className="flex items-center gap-2">
            <span className="chip">{es.admin.last30}</span>
            <Avatar name="Admin" size="s" />
          </div>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label={es.admin.kpiActive} value={fmt(kpis.activeMembers30d)} />
          <Kpi label={es.admin.kpiConnections} value={fmt(kpis.connectionsCreated30d)} />
          <Kpi label={es.admin.kpiVerified} value={`${kpis.verifiedLevel2Pct}%`} />
          <Kpi label={es.admin.kpiRevenue} value={fmt(kpis.revenueDop30d)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel title={es.admin.weeklySignups}>
            <Kpi label={es.admin.kpiNewMembers} value={fmt(kpis.newRegistrations30d)} />
            <div className="mt-1.5 text-[11px] text-muted">{es.admin.last30}</div>
          </Panel>
          <Panel title={es.admin.needsAttention}>
            {attention.length === 0 ? (
              <div className="text-[12.5px] text-muted">{es.admin.nothingPending}</div>
            ) : (
              attention.map((item) => (
                <div key={item.text} className="list-row">
                  <PriorityChip priority={item.priority as 'CRITICAL' | 'HIGH' | 'NORMAL'} />
                  <span className="text-[12.5px]">{item.text}</span>
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
