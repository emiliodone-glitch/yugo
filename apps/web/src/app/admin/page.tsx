'use client';

import { demoAdminKpis, demoAttentionItems, es } from '@yugo/shared';
import { Avatar } from '@/components/ui';
import { BarTop, Kpi, Panel, PriorityChip, SparkBars } from '@/components/admin';

export default function AdminDashboard() {
  const kpis = demoAdminKpis;
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
          <Kpi
            label={es.admin.kpiActive}
            value={kpis.activeMembers30d.toLocaleString('es-DO')}
            delta={kpis.activeMembersDelta}
          />
          <Kpi
            label={es.admin.kpiConnections}
            value={kpis.connectionsCreated.toLocaleString('es-DO')}
            delta={kpis.connectionsDelta}
          />
          <Kpi label={es.admin.kpiVerified} value={`${kpis.verifiedLevel2Pct}%`} delta={kpis.verifiedDelta} />
          <Kpi
            label={es.admin.kpiRevenue}
            value={kpis.plusRevenueDop.toLocaleString('es-DO')}
            delta={kpis.revenueDelta}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel title={es.admin.weeklySignups}>
            <SparkBars indigo={kpis.weekly} wheat={kpis.weeklyPlus} />
            <div className="mt-1.5 text-[11px] text-muted">{es.admin.weeklyLegend}</div>
          </Panel>
          <Panel title={es.admin.needsAttention}>
            {demoAttentionItems.map((item) => (
              <div key={item.text} className="list-row">
                <PriorityChip priority={item.priority} />
                <span className="text-[12.5px]">{item.text}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
