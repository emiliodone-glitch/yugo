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
import { useProposeStage, useRelationship, useRespondToStage } from '@/lib/hooks';

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
