'use client';

/**
 * Reportes (RF-ADM-12).
 *
 * The page used to lead with "Conversión gratuito → Plus" and "Plus → Oro",
 * which told the team that money was the outcome. The funnel now runs from
 * sign-up to bonds that advanced, and subscriptions are their own report —
 * still measured, no longer the finish line.
 */
import { useState } from 'react';
import { es } from '@yugo/shared';
import { useAdminReport } from '@/lib/hooks';
import { BarTop, Kpi, Panel, SparkBars } from '@/components/admin';

const REPORTS = [
  { kind: 'funnel', label: 'Del registro al vínculo' },
  { kind: 'retention', label: 'Retención por cohorte' },
  { kind: 'province', label: 'Por provincia' },
  { kind: 'subscriptions', label: 'Suscripciones' },
  { kind: 'activation', label: 'Activación (eventos anónimos)' },
  { kind: 'events', label: 'Eventos de producto' },
  { kind: 'closures', label: 'Cierres: con mensaje o en silencio' },
] as const;

export default function ReportsPage() {
  const [kind, setKind] = useState<string>('funnel');
  const { data: report, isLoading } = useAdminReport(kind);
  const { data: funnel } = useAdminReport('funnel');
  const { data: growth } = useAdminReport('growth');

  // Las barras se escalan contra la semana más alta de cada serie: lo que se
  // lee es la forma de la curva, no un número absoluto.
  const growthRows = growth?.rows ?? [];
  const series = (column: string) => {
    const values = growthRows.map((row) => Number(row[column] ?? 0));
    const max = Math.max(1, ...values);
    return values.map((value) => Math.max(4, Math.round((value / max) * 100)));
  };
  const registrations = series('Registros');
  const subscriptions = series('Suscripciones');
  const totalRegistrations = growthRows.reduce((sum, row) => sum + Number(row.Registros ?? 0), 0);

  const funnelRows = funnel?.rows ?? [];
  const stageValue = (label: string) =>
    Number(funnelRows.find((row) => row.Etapa === label)?.Miembros ?? 0);
  const stagePct = (label: string) =>
    Number(funnelRows.find((row) => row.Etapa === label)?.['Del total (%)'] ?? 0);

  const registered = stageValue('Registrados');
  const connected = stageValue('Con al menos una conexión');
  const advanced = stageValue('En un vínculo que avanzó');

  const columns = report?.rows[0] ? Object.keys(report.rows[0]) : [];

  return (
    <div>
      <BarTop
        title={es.admin.reports}
        right={
          <a
            className="chip"
            href={`/api/admin/reports/${kind}/export.csv`}
            download
            rel="nofollow"
          >
            Exportar CSV
          </a>
        }
      />
      <div className="p-6">
        {/* Los KPI que encabezan la página son los que el equipo persigue.
            Por eso ninguno es de ingresos. */}
        <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Kpi
            label="Registro → perfil completo"
            value={`${stagePct('Perfil completo (≥60%)')}%`}
            small="Meta 70%"
          />
          <Kpi
            label="Verificados nivel 2+"
            value={`${stagePct('Verificados nivel 2+')}%`}
            small="Meta 50%"
          />
          <Kpi
            label="De conexión a vínculo que avanza"
            value={connected === 0 ? '—' : `${Math.round((advanced / connected) * 1000) / 10}%`}
            small="La razón de ser del producto"
          />
          <Kpi
            label="En noviazgo o compromiso"
            value={stageValue('En noviazgo o compromiso').toLocaleString('es-DO')}
            small="Personas que salieron de Descubrir"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {REPORTS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => setKind(option.kind)}
              aria-pressed={kind === option.kind}
              className={`chip ${kind === option.kind ? 'chip-wheat' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title={report?.title ?? es.common.loading}>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted">{es.common.loading}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] text-muted">
                      {columns.map((column) => (
                        <th key={column} className="py-1.5 pr-3 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report?.rows.map((row, index) => (
                      <tr key={index} className="border-b border-line last:border-0">
                        {columns.map((column) => (
                          <td key={column} className="py-1.5 pr-3">
                            {typeof row[column] === 'number'
                              ? row[column].toLocaleString('es-DO')
                              : row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Del registro al vínculo">
            {/* Cada barra se lee contra el total de registrados, para que la
                caída entre etapas se vea sin tener que calcularla. */}
            {funnelRows.map((row) => {
              const pct = Number(row['Del total (%)'] ?? 0);
              return (
                <div key={String(row.Etapa)} className="mb-2.5">
                  <div className="flex justify-between text-[12.5px]">
                    <span>{row.Etapa}</span>
                    <b>
                      {Number(row.Miembros).toLocaleString('es-DO')} · {pct}%
                    </b>
                  </div>
                  <div className="bar mt-1">
                    <i style={{ width: `${Math.max(pct, 0.5)}%`, background: '#22315C' }} />
                  </div>
                </div>
              );
            })}
            {registered === 0 && !isLoading ? (
              <div className="py-4 text-center text-sm text-muted">
                Todavía no hay datos suficientes.
              </div>
            ) : null}
          </Panel>

          <Panel title="Crecimiento semanal">
            {growthRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">{es.common.loading}</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] text-muted">Registros por semana</div>
                    <SparkBars indigo={registrations} wheat={[]} />
                  </div>
                  <div>
                    <div className="text-[11px] text-muted">Suscripciones nuevas por semana</div>
                    <SparkBars indigo={[]} wheat={subscriptions} />
                  </div>
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                  <span>{es.admin.weeklyLegend}</span>
                  <span>
                    {growthRows.length} semanas · {totalRegistrations.toLocaleString('es-DO')}{' '}
                    registros
                  </span>
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
