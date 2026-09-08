'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_AFFINITY_WEIGHTS, es, LIMITS, validateWeights } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useAdminSettings,
  useDenominationMatrix,
  useUpdateMatrixCell,
  useUpdateWeights,
} from '@/lib/hooks';
import { BarTop, Panel, WeightSlider, DataTable, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

type Weights = { -readonly [K in keyof typeof DEFAULT_AFFINITY_WEIGHTS]: number };
const WEIGHT_KEYS = Object.keys(DEFAULT_AFFINITY_WEIGHTS) as Array<keyof Weights>;

/**
 * Parámetros del algoritmo (RF-ADM-08): pesos reales de la tabla Setting,
 * matriz de afinidad interdenominacional editable celda a celda y los límites
 * vigentes. Antes los pesos y la matriz eran constantes de la pantalla.
 */
export default function AlgorithmSettingsPage() {
  const settings = useAdminSettings();
  const matrix = useDenominationMatrix();
  const updateWeights = useUpdateWeights();
  const updateCell = useUpdateMatrixCell();

  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_AFFINITY_WEIGHTS });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Los pesos guardados llegan después del primer render: se cargan una vez
  // y no pisan lo que la persona ya empezó a mover.
  useEffect(() => {
    if (!settings.data || dirty) return;
    const next: Weights = { ...DEFAULT_AFFINITY_WEIGHTS };
    for (const key of WEIGHT_KEYS) {
      const value = settings.data.weights[key];
      if (typeof value === 'number') next[key] = value;
    }
    setWeights(next);
  }, [settings.data, dirty]);

  const sum = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);
  const valid = validateWeights(weights);

  const setWeight = (key: keyof Weights) => (value: number) => {
    setSaved(false);
    setDirty(true);
    setWeights((w) => ({ ...w, [key]: value }));
  };

  const save = async () => {
    setNotice(null);
    try {
      await updateWeights.mutateAsync(weights);
      setSaved(true);
      setDirty(false);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const thresholds = settings.data?.thresholds ?? {};
  const holdAbove = typeof thresholds.holdAbove === 'number' ? thresholds.holdAbove : 0.7;
  const rejectAbove = typeof thresholds.rejectAbove === 'number' ? thresholds.rejectAbove : 0.92;

  return (
    <div>
      <BarTop
        title={es.admin.settingsTitle}
        right={
          <button
            type="button"
            className="btn btn-sm"
            disabled={!valid || updateWeights.isPending}
            onClick={() => void save()}
          >
            {saved ? 'Guardado ✓' : es.admin.saveChanges}
          </button>
        }
      />
      <div className="p-6">
        {notice ? (
          <div role="alert" className="mb-4 rounded-field bg-wine-soft px-4 py-3 text-sm text-wine">
            {notice}
          </div>
        ) : null}
        {settings.isError ? (
          <QueryError error={settings.error} onRetry={() => void settings.refetch()} />
        ) : null}
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel
            title={es.admin.weightsTitle}
            titleExtra={
              <span className="text-[11px] font-sans font-normal text-muted">
                {es.admin.weightsMustSum}
              </span>
            }
          >
            <WeightSlider
              label={es.affinity.denomination}
              value={weights.denomination}
              onChange={setWeight('denomination')}
            />
            <WeightSlider
              label={es.affinity.intention}
              value={weights.intention}
              onChange={setWeight('intention')}
            />
            <WeightSlider
              label={es.affinity.practices}
              value={weights.practices}
              onChange={setWeight('practices')}
            />
            <WeightSlider
              label={es.affinity.distance}
              value={weights.distance}
              onChange={setWeight('distance')}
            />
            <WeightSlider label={es.affinity.age} value={weights.age} onChange={setWeight('age')} />

            <div
              className={`mt-1 rounded-field px-3 py-2 text-[12px] font-semibold ${
                valid ? 'bg-olive-soft text-olive-text' : 'bg-wine-soft text-wine'
              }`}
            >
              Suma: {sum} / 100 {valid ? '✓' : `— ${es.admin.weightsSumError}`}
            </div>

            <div className="mt-3 flex items-center justify-between text-[12.5px]">
              <span>{es.admin.level3Bonus}</span>
              <span className="chip">+{LIMITS.LEVEL3_POSITION_BONUS}</span>
            </div>

            <div className="h-display mb-2 mt-5 text-[15px]">{es.admin.matrixTitle}</div>
            {matrix.isError ? (
              <QueryError error={matrix.error} onRetry={() => void matrix.refetch()} />
            ) : null}
            {matrix.data ? (
              <AffinityMatrix
                data={matrix.data}
                pending={updateCell.isPending}
                onChange={(aId, bId, value) => {
                  setSaved(false);
                  updateCell.mutate(
                    { aId, bId, value },
                    { onError: (error) => setNotice(errorMessage(error)) },
                  );
                }}
              />
            ) : (
              <p className="text-sm text-muted">{es.common.loading}</p>
            )}
            <p className="mt-1.5 text-[11px] text-muted">{es.admin.matrixNote}</p>
          </Panel>

          <div className="grid gap-4">
            <Panel title={es.admin.limitsTitle}>
              <SettingRow
                label={es.admin.limitInterests}
                chip={`${LIMITS.DAILY_INTERESTS_FREE} / ∞ / ∞`}
              />
              <SettingRow
                label={es.admin.limitAgeDefault}
                chip={`${LIMITS.AGE_RANGE_DEFAULT_OFFSET_MIN} / +${LIMITS.AGE_RANGE_DEFAULT_OFFSET_MAX} · ${LIMITS.AGE_RANGE_MIN_SPAN} años`}
              />
              <SettingRow label={es.admin.limitUndo} chip={String(LIMITS.UNDO_PASS_PER_DAY_ORO)} />
              <SettingRow
                label={es.admin.limitSuggested}
                chip={`${LIMITS.DISCOVER_PER_DAY_FREE} · ${LIMITS.DISCOVER_PER_DAY_ORO}`}
              />
              <SettingRow
                label={es.admin.limitCompleteness}
                chip={`${LIMITS.MIN_COMPLETENESS_FOR_DISCOVER}%`}
              />
              <SettingRow label={es.admin.limitPassHidden} chip={String(LIMITS.PASS_HIDE_DAYS)} />
              <SettingRow
                label={es.admin.limitInactivity}
                chip={`${LIMITS.INACTIVITY_HIDE_DAYS} días`}
              />
            </Panel>

            <Panel title={es.admin.aiThresholds}>
              <SettingRow
                label={es.admin.holdIf}
                chip={holdAbove.toFixed(2)}
                chipClass="chip-wheat"
              />
              <SettingRow
                label={es.admin.rejectIf}
                chip={rejectAbove.toFixed(2)}
                chipClass="chip-wine"
              />
              <SettingRow label={es.admin.warnAfter} chip={String(LIMITS.REJECTIONS_FOR_WARNING)} />
            </Panel>

            {settings.data ? (
              <Panel title="Convenio vigente">
                <SettingRow
                  label="Versión que aceptan los nuevos miembros"
                  chip={`v${settings.data.covenantVersion}`}
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  Cambiar la versión obliga a volver a aceptar el convenio en el próximo inicio de
                  sesión.
                </p>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * La matriz se guarda celda a celda: cada cambio va a la API al soltar el
 * campo, así una edición no arrastra a las demás si algo falla.
 */
function AffinityMatrix({
  data,
  pending,
  onChange,
}: {
  data: {
    denominations: Array<{ id: string; name: string }>;
    affinities: Array<{ aId: string; bId: string; value: number }>;
  };
  pending: boolean;
  onChange: (aId: string, bId: string, value: number) => void;
}) {
  const denominations = data.denominations.slice(0, 8);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const valueOf = (a: string, b: string) => {
    const found = data.affinities.find((cell) => key(cell.aId, cell.bId) === key(a, b));
    return found ? found.value : 50;
  };

  if (denominations.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay denominaciones registradas.</p>;
  }

  return (
    <DataTable headers={['', ...denominations.map((d) => d.name)]}>
      {denominations.map((row) => (
        <tr key={row.id}>
          <Td className="font-semibold">{row.name}</Td>
          {denominations.map((col) => {
            const cellKey = key(row.id, col.id);
            const draft = drafts[cellKey];
            return (
              <Td key={col.id}>
                {row.id === col.id ? (
                  <span className="text-muted">100</span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={pending}
                    value={draft ?? valueOf(row.id, col.id)}
                    aria-label={`${row.name} × ${col.name}`}
                    onChange={(event) =>
                      setDrafts((d) => ({ ...d, [cellKey]: event.target.value }))
                    }
                    onBlur={() => {
                      if (draft === undefined) return;
                      const value = Math.max(0, Math.min(100, Number(draft)));
                      setDrafts((d) => {
                        const next = { ...d };
                        delete next[cellKey];
                        return next;
                      });
                      if (!Number.isNaN(value) && value !== valueOf(row.id, col.id)) {
                        onChange(row.id, col.id, value);
                      }
                    }}
                    className="w-14 rounded border border-line px-1.5 py-1 text-[12px]"
                  />
                )}
              </Td>
            );
          })}
        </tr>
      ))}
    </DataTable>
  );
}

function SettingRow({
  label,
  chip,
  chipClass = '',
}: {
  label: string;
  chip: string;
  chipClass?: string;
}) {
  return (
    <div className="list-row text-[12.5px]">
      <span>{label}</span>
      <span className={`chip ml-auto ${chipClass}`}>{chip}</span>
    </div>
  );
}
