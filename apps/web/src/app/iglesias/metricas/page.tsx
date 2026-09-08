'use client';

import { es } from '@yugo/shared';
import { useChurchMetrics } from '@/lib/hooks';
import { BarTop, Kpi, Panel, SparkBars } from '@/components/admin';
import { QueryError } from '@/components/query-error';

/**
 * Métricas de la iglesia (RF-IGL-06): totales reales de alcance. Nunca
 * nombres ni actividad de citas; ese límite es lo que hace creíble el respaldo.
 */
export default function ChurchMetricsPage() {
  const metrics = useChurchMetrics();
  const m = metrics.data;
  const value = (n: number | undefined) => (n === undefined ? '…' : n.toLocaleString('es-DO'));

  const reach = m?.weeklyReach ?? [];
  const reachMax = Math.max(1, ...reach);
  const reachBars = reach.map((n) => Math.max(n > 0 ? 6 : 2, Math.round((n / reachMax) * 100)));
  const reachTotal = reach.reduce((a, b) => a + b, 0);

  return (
    <div>
      <BarTop title={es.church.metrics} />
      <div className="p-6">
        {metrics.isError ? (
          <QueryError error={metrics.error} onRetry={() => void metrics.refetch()} />
        ) : null}
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi
            label="Asistencias marcadas"
            value={value(m?.going)}
            small={m ? `${m.events} eventos publicados` : undefined}
          />
          <Kpi
            label="Check-ins con QR"
            value={value(m?.checkIns)}
            small={m ? `${m.checkInRate}% de quienes dijeron que irían` : undefined}
          />
          <Kpi label="Miembros del grupo" value={value(m?.groupMembers)} />
          <Kpi label={es.church.endorsedMembers} value={value(m?.endorsed)} />
        </div>

        {/* El respaldo es el foso del producto: la iglesia necesita ver si su
            programa de códigos funciona, no quién sale con quién. */}
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Respaldos nuevos (30 d)" value={value(m?.endorsedLast30)} />
          <Kpi label="Códigos entregados" value={value(m?.codesIssued)} />
          <Kpi label="Códigos canjeados" value={value(m?.codesUsed)} />
          <Kpi label="Tasa de canje" value={m ? `${m.codeRedemptionRate}%` : '…'} />
        </div>

        <Panel title="Alcance de eventos por semana">
          {metrics.isLoading ? (
            <p className="text-sm text-muted">{es.common.loading}</p>
          ) : reachTotal === 0 ? (
            <p className="py-4 text-sm text-muted">
              Todavía nadie marcó asistencia a tus eventos en las últimas 8 semanas. Cuando
              publiques el próximo, aquí verás cuántas personas alcanzó.
            </p>
          ) : (
            <SparkBars indigo={reachBars} wheat={[]} />
          )}
          <p className="mt-1.5 text-[11px] text-muted">
            Personas que marcaron asistencia a tus eventos publicados en Yugo, por semana, últimas 8
            semanas (RF-IGL-06).
          </p>
        </Panel>

        <div className="card mt-4 border-0 bg-olive-soft">
          <b className="text-[12.5px] text-olive-text">Qué no verás aquí, y por qué</b>
          <p className="mt-1 text-[11.5px] leading-relaxed text-olive-text">
            Estas métricas cuentan el alcance de lo que tu iglesia publica: eventos, grupos y
            respaldos. Nunca verás con quién conecta un miembro, a quién marcó interés ni sus
            conversaciones. El respaldo que das descansa sobre esa separación: si la rompiéramos,
            nadie usaría su código.
          </p>
        </div>
      </div>
    </div>
  );
}
