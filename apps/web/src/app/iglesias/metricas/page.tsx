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
        <Panel title="Alcance de eventos por semana">
          <SparkBars indigo={[30, 44, 38, 52, 61, 58, 72, 85]} wheat={[]} />
          <p className="mt-1.5 text-[11px] text-muted">
            Personas alcanzadas por tus eventos publicados en Yugo (RF-IGL-06).
          </p>
        </Panel>
      </div>
    </div>
  );
}
