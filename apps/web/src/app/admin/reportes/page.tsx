'use client';

import { es } from '@yugo/shared';
import { BarTop, Kpi, Panel, SparkBars } from '@/components/admin';

export default function ReportsPage() {
  return (
    <div>
      <BarTop title={es.admin.reports} right={<span className="chip">Exportar</span>} />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi label="Registro → perfil completo" value="71%" delta="Meta 70% ✓" />
          <Kpi label="Retención a 30 días" value="37%" delta="Meta 35% ✓" />
          <Kpi label="Conversión gratuito → Plus" value="4.6%" delta="Meta 4% ✓" />
          <Kpi label="Plus → Oro" value="15.2%" delta="Meta 15% ✓" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Crecimiento semanal">
            <SparkBars indigo={[35, 42, 51, 48, 60, 66, 74, 88]} wheat={[10, 14, 18, 24]} />
            <div className="mt-1.5 text-[11px] text-muted">{es.admin.weeklyLegend}</div>
          </Panel>
          <Panel title="Actividad por provincia">
            {[
              ['Distrito Nacional', 38],
              ['Santo Domingo', 31],
              ['Santiago', 17],
              ['La Vega', 8],
              ['Otras', 6],
            ].map(([province, pct]) => (
              <div key={province} className="mb-2.5">
                <div className="flex justify-between text-[12.5px]">
                  <span>{province}</span>
                  <b>{pct}%</b>
                </div>
                <div className="bar mt-1">
                  <i style={{ width: `${pct}%`, background: '#22315C' }} />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
