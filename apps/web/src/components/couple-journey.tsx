'use client';

/**
 * Ruta de pareja después del sí (RF-REL-05), en la conversación.
 *
 * Aparece cerrada antes del noviazgo y dice cuándo se abre, igual que las
 * conversaciones que importan. Abierta, son tres cosas: los pasos con fecha
 * (sin porcentaje), los recursos prematrimoniales y la consejería con la
 * iglesia, que la iglesia solo ve cuando la firman los dos.
 */
import { useState } from 'react';
import { es, STAGE_ORDER, type CoupleMilestoneState, type RelationshipStage } from '@yugo/shared';
import { isDemoMode } from '@yugo/app-core';
import {
  useCoupleJourney,
  useRequestCounseling,
  useRespondCounseling,
  useSetMilestone,
} from '@/lib/hooks';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });

const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

export function CoupleJourneyCard({ matchId, otherName }: { matchId: string; otherName: string }) {
  const { data } = useCoupleJourney(matchId, otherName);
  const setMilestone = useSetMilestone(matchId);
  const [showResources, setShowResources] = useState(false);

  if (!data) return null;

  if (!data.unlocked) {
    return (
      <section className="card mb-3 border-0 bg-linen2" aria-label={es.journey.title}>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {es.journey.title}
        </div>
        <p className="mt-1 text-[11.5px] text-muted">
          {es.journey.locked(stageName(data.opensAt))}
        </p>
      </section>
    );
  }

  const open = data.milestones.filter((m) => STAGE_ORDER[m.stage] <= STAGE_ORDER[data.stage]);
  const later = data.milestones.filter((m) => STAGE_ORDER[m.stage] > STAGE_ORDER[data.stage]);

  return (
    <section className="card mb-3 border-[1.5px] border-olive" aria-label={es.journey.title}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-olive-text">
        {es.journey.title}
      </div>
      <p className="mt-1 text-[11.5px] text-muted">{es.journey.intro}</p>

      <ul className="mt-2.5 space-y-1.5" aria-label={es.journey.title}>
        {open.map((milestone) => (
          <MilestoneRow
            key={milestone.key}
            milestone={milestone}
            pending={setMilestone.isPending}
            onToggle={(done, doneAt) => setMilestone.mutate({ key: milestone.key, done, doneAt })}
          />
        ))}
      </ul>
      {later.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted">
          {later
            .map((m) => `${m.title} (${es.journey.opensLater(stageName(m.stage))})`)
            .join(' · ')}
        </p>
      ) : null}

      {/* Recursos: los generales para todos; los de su tradición, porque alguno lo es. */}
      <button
        type="button"
        className="mt-3 text-[11.5px] font-semibold text-olive-text underline"
        onClick={() => setShowResources((v) => !v)}
        aria-expanded={showResources}
      >
        {es.journey.resourcesTitle}
      </button>
      {showResources ? (
        <div className="mt-2 rounded-field bg-linen px-3 py-2.5">
          <p className="text-[11px] text-muted">{es.journey.resourcesIntro}</p>
          {data.resources.forYou.length > 0 ? (
            <ResourceList title={es.journey.forYou} items={data.resources.forYou} />
          ) : null}
          <ResourceList title={es.journey.general} items={data.resources.general} />
        </div>
      ) : null}

      <CounselingPanel matchId={matchId} otherName={otherName} data={data} />
    </section>
  );
}

function MilestoneRow({
  milestone,
  pending,
  onToggle,
}: {
  milestone: CoupleMilestoneState;
  pending: boolean;
  onToggle: (done: boolean, doneAt?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const done = !!milestone.doneAt;
  return (
    <li className={`rounded-field px-3 py-2 ${done ? 'bg-olive-soft' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <b className={`text-[12.5px] ${done ? 'text-olive-text' : ''}`}>
            {done ? '✓ ' : ''}
            {milestone.title}
          </b>
          <p className="text-[11px] text-muted">
            {done && milestone.doneAt
              ? milestone.doneByMe
                ? es.journey.doneByYou(formatDate(milestone.doneAt))
                : es.journey.doneBy(
                    milestone.doneByName ?? 'Tu conexión',
                    formatDate(milestone.doneAt),
                  )
              : `${es.journey.whyThis}: ${milestone.why}`}
          </p>
        </div>
        {done ? (
          <button
            type="button"
            className="shrink-0 text-[11px] text-muted underline"
            disabled={pending}
            onClick={() => onToggle(false)}
          >
            {es.journey.undo}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-ghost shrink-0"
            disabled={pending}
            onClick={() => setPicking((v) => !v)}
          >
            {es.journey.markDone}
          </button>
        )}
      </div>
      {picking && !done ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onToggle(true, new Date(`${date}T12:00:00`).toISOString());
            setPicking(false);
          }}
        >
          <label className="sr-only" htmlFor={`ms-${milestone.key}`}>
            {milestone.title}
          </label>
          <input
            id={`ms-${milestone.key}`}
            type="date"
            className="field"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          <button type="submit" className="btn btn-sm" disabled={pending}>
            {es.common.save}
          </button>
        </form>
      ) : null}
    </li>
  );
}

function ResourceList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; title: string; kind: string; by: string; summary: string }>;
}) {
  return (
    <div className="mt-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{title}</div>
      <ul className="mt-1 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-[10px] bg-white px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="chip">{es.journey.kinds[item.kind] ?? item.kind}</span>
              <b className="text-[12px]">{item.title}</b>
            </div>
            <p className="text-[11px] text-muted">{item.by}</p>
            <p className="mt-0.5 text-[11.5px] text-body">{item.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CounselingPanel({
  matchId,
  otherName,
  data,
}: {
  matchId: string;
  otherName: string;
  data: NonNullable<ReturnType<typeof useCoupleJourney>['data']>;
}) {
  const request = useRequestCounseling(matchId);
  const respond = useRespondCounseling(matchId);
  const [opening, setOpening] = useState(false);
  const [churchId, setChurchId] = useState(data.churches[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = data.counseling;
  const active =
    current &&
    (current.status === 'PENDING_PARTNER' ||
      current.status === 'REQUESTED' ||
      current.status === 'ACCEPTED');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await request.mutateAsync({ churchId, note });
      setOpening(false);
      setNote('');
    } catch (cause) {
      const key = cause instanceof Error ? cause.message : 'generic';
      setError(key === 'note_rejected' ? es.errors.noteRejected : es.errors.generic);
    }
  };

  return (
    <div className="mt-3 rounded-field bg-wheat-soft px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-wheat-text">
        {es.journey.counselingTitle}
      </div>

      {current && active ? (
        <>
          <p className="mt-1 text-[12px] text-wheat-text">
            {current.status === 'PENDING_PARTNER'
              ? current.requestedByMe
                ? es.journey.requestedByYou(current.churchName)
                : es.journey.requestedByThem(otherName, current.churchName)
              : current.status === 'REQUESTED'
                ? es.journey.waitingChurch(current.churchName)
                : es.journey.accepted(current.churchName)}
          </p>
          {current.responseNote ? (
            <p className="mt-1 text-[11.5px] text-body">
              <b>{es.journey.churchSaid}</b> {current.responseNote}
            </p>
          ) : null}
          {current.status === 'PENDING_PARTNER' && !current.requestedByMe ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={respond.isPending}
                onClick={() => respond.mutate(true)}
              >
                {es.journey.confirm}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={respond.isPending}
                onClick={() => respond.mutate(false)}
              >
                {es.journey.notNow}
              </button>
            </div>
          ) : null}
          {current.status === 'PENDING_PARTNER' && current.requestedByMe && isDemoMode() ? (
            <button
              type="button"
              className="mt-1.5 text-[11px] text-muted underline"
              onClick={() => respond.mutate(true)}
            >
              {es.relationship.demoRespondForThem}
            </button>
          ) : null}
          <p className="mt-1.5 text-[11px] text-muted">{es.journey.counselingVisibility}</p>
        </>
      ) : opening ? (
        <form className="mt-2" onSubmit={submit}>
          <label className="mb-1 block text-[11px] text-muted" htmlFor="counseling-church">
            {es.journey.counselingChurchLabel}
          </label>
          <select
            id="counseling-church"
            className="field mb-2 w-full"
            value={churchId}
            onChange={(event) => setChurchId(event.target.value)}
            required
          >
            {data.churches.map((church) => (
              <option key={church.id} value={church.id}>
                {church.name}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-[11px] text-muted" htmlFor="counseling-note">
            {es.journey.counselingNoteLabel}
          </label>
          <textarea
            id="counseling-note"
            className="field w-full"
            rows={3}
            placeholder={es.journey.counselingNotePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            minLength={10}
            maxLength={600}
            required
          />
          <p className="mb-2 mt-1 text-[11px] text-muted">{es.journey.counselingVisibility}</p>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm" disabled={request.isPending}>
              {es.journey.request}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setOpening(false)}
            >
              {es.common.cancel}
            </button>
          </div>
          {error ? <p className="mt-1.5 text-[11px] text-wine">{error}</p> : null}
        </form>
      ) : (
        <>
          <p className="mt-1 text-[11.5px] text-wheat-text">{es.journey.counselingIntro}</p>
          {current?.status === 'DECLINED' ? (
            <p className="mt-1 text-[11px] text-muted">
              {current.respondedAt && current.responseNote
                ? `${es.journey.declinedByChurch(current.churchName)} ${current.responseNote}`
                : current.responseNote
                  ? current.responseNote
                  : es.journey.declinedByPartner}
            </p>
          ) : null}
          {data.churches.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">{es.journey.counselingNoChurch}</p>
          ) : (
            <button type="button" className="btn btn-sm mt-2" onClick={() => setOpening(true)}>
              {current?.status === 'DECLINED' ? es.journey.askAgain : es.journey.request}
            </button>
          )}
        </>
      )}
    </div>
  );
}
