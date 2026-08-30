'use client';

import { useState } from 'react';
import { demoModerationQueue, es } from '@yugo/shared';
import { BarTop, DataTable, Panel, PriorityChip, Td } from '@/components/admin';
import { Segment } from '@/components/ui';

type Queue = 'reports' | 'held' | 'appeals';

export default function ModerationQueuePage() {
  const [queue, setQueue] = useState<Queue>('reports');
  const [taken, setTaken] = useState(3);

  return (
    <div>
      <BarTop
        title={es.admin.moderationQueue}
        right={
          <div className="flex items-center gap-2">
            <span className="chip">{es.admin.assignedToMe(taken)}</span>
            <button type="button" className="btn btn-sm" onClick={() => setTaken((t) => t + 1)}>
              {es.admin.takeNext}
            </button>
          </div>
        }
      />
      <div className="p-6">
        <div className="mb-4 max-w-[520px]">
          <Segment
            value={queue}
            onChange={setQueue}
            options={[
              { value: 'reports', label: es.admin.reportsTab(9) },
              { value: 'held', label: es.admin.heldTab(41) },
              { value: 'appeals', label: es.admin.appealsTab(2) },
            ]}
          />
        </div>

        {queue === 'reports' ? (
          <DataTable
            headers={[
              es.admin.priority,
              es.admin.type,
              es.admin.reported,
              es.admin.reason,
              es.admin.evidence,
              es.admin.age,
              '',
            ]}
          >
            {demoModerationQueue.map((row) => (
              <tr key={row.id}>
                <Td>
                  <PriorityChip priority={row.priority} />
                </Td>
                <Td>{row.type}</Td>
                <Td>{row.reported}</Td>
                <Td>{row.reason}</Td>
                <Td>{row.evidence}</Td>
                <Td>{row.ageLabel}</Td>
                <Td>
                  <button
                    type="button"
                    className={`btn btn-sm ${row.priority === 'NORMAL' || row.priority === 'HIGH' ? 'btn-ghost' : ''}`}
                  >
                    {es.admin.review}
                  </button>
                </Td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Panel>
            <p className="text-sm text-muted">
              {queue === 'held'
                ? '41 mensajes retenidos por IA esperan revisión. Aprueba para entregarlos o recházalos con plantilla.'
                : '2 apelaciones abiertas. Revisa la sanción original y responde con plantilla.'}
            </p>
          </Panel>
        )}

        <div className="mt-4">
          <Panel title={es.admin.decisionsTitle}>
            <div className="flex flex-wrap gap-1.5">
              <span className="chip">{es.admin.decisionNoAction}</span>
              <span className="chip chip-wheat">{es.admin.decisionWarning}</span>
              <span className="chip chip-wheat">{es.admin.decisionSuspend}</span>
              <span className="chip chip-wine">{es.admin.decisionBan}</span>
              <span className="chip">{es.admin.decisionRemove}</span>
              <span className="chip">{es.admin.decisionRevoke}</span>
              <span className="chip chip-olive">{es.admin.decisionEscalate}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">{es.admin.decisionsNote}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
