'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_AFFINITY_WEIGHTS, es, LIMITS, validateWeights } from '@yugo/shared';
import { BarTop, Panel, WeightSlider, DataTable, Td } from '@/components/admin';

const MATRIX_DENOMS = ['Evangélica', 'Bautista', 'Pentecostal', 'Adventista', 'Católica'];
const MATRIX_INITIAL: number[][] = [
  [100, 80, 75, 50, 40],
  [80, 100, 65, 50, 40],
  [75, 65, 100, 45, 35],
];

export default function AlgorithmSettingsPage() {
  const [weights, setWeights] = useState({ ...DEFAULT_AFFINITY_WEIGHTS });
  const [matrix, setMatrix] = useState(MATRIX_INITIAL);
  const [saved, setSaved] = useState(false);

  const sum = useMemo(
    () => Object.values(weights).reduce((a, b) => a + b, 0),
    [weights],
  );
  const valid = validateWeights(weights);

  const setWeight = (key: keyof typeof weights) => (value: number) => {
    setSaved(false);
    setWeights((w) => ({ ...w, [key]: value }));
  };

  return (
    <div>
      <BarTop
        title={es.admin.settingsTitle}
        right={
          <button
            type="button"
            className="btn btn-sm"
            disabled={!valid}
            onClick={() => setSaved(true)}
          >
            {saved ? 'Guardado ✓' : es.admin.saveChanges}
          </button>
        }
      />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel
            title={es.admin.weightsTitle}
            titleExtra={<span className="text-[11px] font-sans font-normal text-muted">{es.admin.weightsMustSum}</span>}
          >
            <WeightSlider label={es.affinity.denomination} value={weights.denomination} onChange={setWeight('denomination')} />
            <WeightSlider label={es.affinity.intention} value={weights.intention} onChange={setWeight('intention')} />
            <WeightSlider label={es.affinity.practices} value={weights.practices} onChange={setWeight('practices')} />
            <WeightSlider label={es.affinity.distance} value={weights.distance} onChange={setWeight('distance')} />
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
            <DataTable headers={['', ...MATRIX_DENOMS]}>
              {matrix.map((row, rowIndex) => (
                <tr key={MATRIX_DENOMS[rowIndex]}>
                  <Td className="font-semibold">{MATRIX_DENOMS[rowIndex]}</Td>
                  {row.map((value, colIndex) => (
                    <Td key={colIndex}>
                      {rowIndex === colIndex ? (
                        <span className="text-muted">100</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={value}
                          aria-label={`${MATRIX_DENOMS[rowIndex]} × ${MATRIX_DENOMS[colIndex]}`}
                          onChange={(event) => {
                            const next = matrix.map((r) => [...r]);
                            next[rowIndex][colIndex] = Number(event.target.value);
                            setMatrix(next);
                            setSaved(false);
                          }}
                          className="w-14 rounded border border-line px-1.5 py-1 text-[12px]"
                        />
                      )}
                    </Td>
                  ))}
                </tr>
              ))}
            </DataTable>
            <p className="mt-1.5 text-[11px] text-muted">{es.admin.matrixNote}</p>
          </Panel>

          <div className="grid gap-4">
            <Panel title={es.admin.limitsTitle}>
              <SettingRow label={es.admin.limitInterests} chip="8 / ∞ / ∞" />
              <SettingRow label={es.admin.limitAgeDefault} chip="−5 / +7 · 3 años" />
              <SettingRow label={es.admin.limitUndo} chip={String(LIMITS.UNDO_PASS_PER_DAY_ORO)} />
              <SettingRow
                label={es.admin.limitSuggested}
                chip={`${LIMITS.DISCOVER_PER_DAY_FREE} · ${LIMITS.DISCOVER_PER_DAY_ORO}`}
              />
              <SettingRow label={es.admin.limitCompleteness} chip={`${LIMITS.MIN_COMPLETENESS_FOR_DISCOVER}%`} />
              <SettingRow label={es.admin.limitPassHidden} chip={String(LIMITS.PASS_HIDE_DAYS)} />
              <SettingRow label={es.admin.limitInactivity} chip={`${LIMITS.INACTIVITY_HIDE_DAYS} días`} />
            </Panel>

            <Panel title={es.admin.aiThresholds}>
              <SettingRow label={es.admin.holdIf} chip="0.70" chipClass="chip-wheat" />
              <SettingRow label={es.admin.rejectIf} chip="0.92" chipClass="chip-wine" />
              <SettingRow label={es.admin.warnAfter} chip={String(LIMITS.REJECTIONS_FOR_WARNING)} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, chip, chipClass = '' }: { label: string; chip: string; chipClass?: string }) {
  return (
    <div className="list-row text-[12.5px]">
      <span>{label}</span>
      <span className={`chip ml-auto ${chipClass}`}>{chip}</span>
    </div>
  );
}
