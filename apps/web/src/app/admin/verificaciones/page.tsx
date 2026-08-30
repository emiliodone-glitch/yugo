'use client';

import { useState } from 'react';
import { demoVerificationCase, es } from '@yugo/shared';
import { BarTop, Panel } from '@/components/admin';
import { PhotoPlaceholder } from '@/components/ui';
import { PersonSilhouette } from '@/components/icons';

export default function VerificationQueuePage() {
  const c = demoVerificationCase;
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div>
      <BarTop
        title={es.admin.verificationCase(c.index, c.total)}
        right={<span className="chip">{c.memberLabel}</span>}
      />
      <div className="p-6">
        {decision ? (
          <div
            className={`mb-4 rounded-field px-4 py-3 text-sm ${
              decision === 'APPROVE'
                ? 'bg-olive-soft text-olive-text'
                : decision === 'REJECT'
                  ? 'bg-wheat-soft text-wheat-text'
                  : 'bg-wine-soft text-wine'
            }`}
          >
            {decision === 'APPROVE'
              ? 'Identidad aprobada. El caso quedó registrado en la bitácora.'
              : decision === 'REJECT'
                ? 'Selfie rechazada; se pidió una nueva al miembro.'
                : 'Caso escalado como posible menor: perfil oculto preventivamente (SLA 12 h).'}
          </div>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 text-[11px] text-muted">
                  {es.admin.selfieLive} · {c.selfieTakenAt}
                </div>
                <PhotoPlaceholder className="h-[200px] rounded-card">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PersonSilhouette className="h-16 w-16 text-white/50" />
                  </div>
                </PhotoPlaceholder>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] text-muted">{es.admin.mainPhoto}</div>
                <PhotoPlaceholder
                  className="h-[200px] rounded-card"
                  gradient="linear-gradient(160deg,#B8AE9C,#7C766C)"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PersonSilhouette className="h-16 w-16 text-white/50" />
                  </div>
                </PhotoPlaceholder>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12.5px]">
              <span>{es.admin.similarity}</span>
              <span className="chip chip-olive">{c.similarity} · alta</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
              <span>{es.admin.liveness}</span>
              <span className="chip chip-olive">{es.admin.livenessPassed}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
              <span>{es.admin.declaredBirth}</span>
              <span className="chip">{c.declaredBirth}</span>
            </div>
          </Panel>

          <Panel title={es.admin.decision}>
            <textarea
              className="field mb-3 h-20 resize-none"
              placeholder={es.admin.internalNote}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <button type="button" className="btn btn-olive" onClick={() => setDecision('APPROVE')}>
              {es.admin.approveIdentity}
            </button>
            <button
              type="button"
              className="btn btn-ghost mt-2"
              onClick={() => setDecision('REJECT')}
            >
              {es.admin.rejectSelfie}
            </button>
            <button type="button" className="btn btn-wine mt-2" onClick={() => setDecision('ESCALATE')}>
              {es.admin.escalateMinor}
            </button>
            <p className="mt-3 text-[11px] text-muted">
              {es.admin.memberHistory(c.history.reports, c.history.sanctions, c.history.since)}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
