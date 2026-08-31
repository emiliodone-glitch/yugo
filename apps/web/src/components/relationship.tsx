'use client';

/**
 * Etapas del vínculo, en la conversación.
 *
 * It sits in the chat because that is where the couple already is when they
 * decide something. A stage is never applied by one tap: proposing shows the
 * other person a card, and only their agreement moves it.
 */
import { useState } from 'react';
import { es, isExclusive, type RelationshipStage } from '@yugo/shared';
import {
  useAccompaniment,
  useConsentToMentor,
  useEndAccompaniment,
  useInviteMentor,
  useProposeStage,
  useRelationship,
  useRespondToStage,
} from '@/lib/hooks';

const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

export function RelationshipStageCard({
  matchId,
  otherName,
}: {
  matchId: string;
  otherName: string;
}) {
  const { data } = useRelationship(matchId, otherName);
  const propose = useProposeStage(matchId);
  const respond = useRespondToStage(matchId);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const { stage, nextStage, proposal, history } = data;
  const proposedByThem = proposal && !proposal.byMe;

  return (
    <section className="card mb-3 border-[1.5px] border-wheat" aria-label={es.relationship.title}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-wheat-text">
            {es.relationship.title}
          </div>
          <b className="text-[13px]">{stageName(stage)}</b>
          <p className="mt-0.5 text-[11px] text-muted">{es.relationship.stageHints[stage]}</p>
        </div>
        {history.length > 0 ? (
          <button
            type="button"
            className="shrink-0 text-[11px] text-muted underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {es.relationship.history}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <ul className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
          {history.map((entry) => (
            <li key={entry.createdAt} className="flex justify-between py-0.5">
              <span>{stageName(entry.toStage)}</span>
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleDateString('es-DO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Their proposal, waiting on us. */}
      {proposedByThem ? (
        <div className="mt-2.5 rounded-field bg-wheat-soft px-3 py-2.5">
          <p className="text-[12px] text-wheat-text">
            {es.relationship.proposedByThem(otherName, stageName(proposal.stage))}
          </p>
          {isExclusive(proposal.stage) ? (
            <p className="mt-1 text-[11px] text-muted">{es.relationship.exclusiveNotice}</p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={respond.isPending}
              onClick={() => respond.mutate(true)}
            >
              {es.relationship.accept}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={respond.isPending}
              onClick={() => respond.mutate(false)}
            >
              {es.relationship.decline}
            </button>
          </div>
        </div>
      ) : null}

      {/* Ours, waiting on them. */}
      {proposal && proposal.byMe ? (
        <p className="mt-2.5 rounded-field bg-linen px-3 py-2 text-[11.5px] text-muted">
          {es.relationship.proposedByYou(stageName(proposal.stage))}
        </p>
      ) : null}

      {/* Nothing in flight: we can suggest the next step. */}
      {!proposal && nextStage ? (
        confirming ? (
          <div className="mt-2.5 rounded-field bg-wheat-soft px-3 py-2.5">
            <p className="text-[11.5px] text-wheat-text">{es.relationship.bothMustAgree}</p>
            {isExclusive(nextStage) ? (
              <p className="mt-1 text-[11px] text-muted">{es.relationship.exclusiveNotice}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={propose.isPending}
                onClick={async () => {
                  await propose.mutateAsync(nextStage);
                  setConfirming(false);
                }}
              >
                {es.relationship.propose(stageName(nextStage))}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setConfirming(false)}
              >
                {es.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-ghost mt-2.5"
            onClick={() => setConfirming(true)}
          >
            {es.relationship.propose(stageName(nextStage))}
          </button>
        )
      ) : null}
    </section>
  );
}

/**
 * Acompañamiento, en la conversación.
 *
 * The line this card has to hold in the interface, not only in the API: it
 * says plainly, every time, that the couple who accompanies them never sees
 * what they write. A privacy guarantee nobody is told about is not a feature.
 */
export function AccompanimentCard({ matchId }: { matchId: string }) {
  const { data } = useAccompaniment(matchId);
  const invite = useInviteMentor(matchId);
  const consent = useConsentToMentor(matchId);
  const end = useEndAccompaniment(matchId);
  const [code, setCode] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const current = data.items[0];
  const waitingOnMe = current?.status === 'INVITED' && !current.myConsent;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await invite.mutateAsync(code);
      setCode('');
      setOpening(false);
    } catch (cause) {
      const key = cause instanceof Error ? cause.message : 'generic';
      setError(
        key === 'mentor_code_not_found'
          ? 'Ese código no existe o ya no está activo.'
          : key === 'already_accompanied'
            ? es.accompaniment.alreadyAccompanied
            : es.errors.generic,
      );
    }
  };

  return (
    <section className="card mb-3 border-0 bg-olive-soft" aria-label={es.accompaniment.title}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-olive-text">
        {es.accompaniment.title}
      </div>

      {current?.status === 'ACTIVE' ? (
        <>
          <p className="mt-1 text-[12.5px] text-olive-text">
            {es.accompaniment.active(
              current.spouseName ? `${current.mentorName} y ${current.spouseName}` : current.mentorName,
            )}
          </p>
          {current.churchName ? (
            <p className="text-[11px] text-muted">
              {current.churchName}
              {current.marriedSince ? ` · ${es.accompaniment.marriedSince(current.marriedSince)}` : ''}
            </p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-olive-text">{es.accompaniment.neverSeesChat}</p>
          <button
            type="button"
            className="btn btn-sm btn-ghost mt-2"
            onClick={() => {
              if (window.confirm(es.accompaniment.endConfirm)) end.mutate(current.id);
            }}
          >
            {es.accompaniment.end}
          </button>
        </>
      ) : waitingOnMe ? (
        <>
          <p className="mt-1 text-[12.5px] text-olive-text">
            {es.accompaniment.partnerInvited(
              current.spouseName ? `${current.mentorName} y ${current.spouseName}` : current.mentorName,
            )}
          </p>
          <p className="mt-1 text-[11px] text-olive-text">{es.accompaniment.neverSeesChat}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={consent.isPending}
              onClick={() => consent.mutate(true)}
            >
              {es.accompaniment.agree}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={consent.isPending}
              onClick={() => consent.mutate(false)}
            >
              {es.accompaniment.refuse}
            </button>
          </div>
        </>
      ) : current?.status === 'INVITED' ? (
        <p className="mt-1 text-[12px] text-olive-text">
          {current.mentorAccepted
            ? es.accompaniment.invitedWaitingPartner
            : es.accompaniment.invitedWaitingMentor}
        </p>
      ) : data.canInvite ? (
        <>
          <p className="mt-1 text-[11.5px] text-olive-text">{es.accompaniment.intro}</p>
          {opening ? (
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={submit}>
              <label className="sr-only" htmlFor="mentor-code">
                {es.accompaniment.codeLabel}
              </label>
              <input
                id="mentor-code"
                className="field flex-1"
                placeholder={es.accompaniment.codePlaceholder}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-sm" disabled={invite.isPending}>
                {es.accompaniment.invite}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-ghost mt-2"
              onClick={() => setOpening(true)}
            >
              {es.accompaniment.inviteTitle}
            </button>
          )}
          {error ? <p className="mt-1.5 text-[11px] text-wine">{error}</p> : null}
        </>
      ) : (
        <p className="mt-1 text-[11.5px] text-olive-text">
          {es.accompaniment.needsIntentionalFriendship}
        </p>
      )}
    </section>
  );
}
