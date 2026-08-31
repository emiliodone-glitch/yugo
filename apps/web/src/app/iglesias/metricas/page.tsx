'use client';

import { demoChurch, es } from '@yugo/shared';
import { BarTop, Kpi, Panel, SparkBars } from '@/components/admin';

export default function ChurchMetricsPage() {
  return (
    <div>
      <BarTop title={es.church.metrics} />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Asistencias marcadas" value="311" />
          <Kpi label="Check-ins con QR" value="187" />
          <Kpi label="Miembros del grupo" value="142" />
          <Kpi label={es.church.endorsedMembers} value={demoChurch.endorsedMembers} />
        </div>

        {/* El respaldo es el foso del producto: la iglesia necesita ver si su
            programa de códigos funciona, no quién sale con quién. */}
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Respaldos nuevos (30 d)" value="12" />
          <Kpi label="Códigos entregados" value="60" />
          <Kpi label="Códigos canjeados" value="41" />
          <Kpi label="Tasa de canje" value="68%" />
        </div>

        <Panel title="Alcance de eventos por semana">
          <SparkBars indigo={[30, 44, 38, 52, 61, 58, 72, 85]} wheat={[]} />
          <p className="mt-1.5 text-[11px] text-muted">
            Personas alcanzadas por tus eventos publicados en Yugo (RF-IGL-06).
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
