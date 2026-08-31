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
import { isDemoMode } from '@yugo/app-core';
import {
  useAccompaniment,
  useConsentToMentor,
  useEndAccompaniment,
  useInviteMentor,
  useCancelMeetingPlan,
  useConsentToStory,
  useMarkPlanShared,
  useMeetingPlan,
  useOurStory,
  usePlanCheckIn,
  useSaveMeetingPlan,
  useProposeStage,
  useRelationship,
  useRespondToStage,
  useSubmitStory,
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
        <div className="mt-2.5 rounded-field bg-linen px-3 py-2">
          <p className="text-[11.5px] text-muted">
            {es.relationship.proposedByYou(stageName(proposal.stage))}
          </p>
          {/* En producción responde la otra persona. La demo necesita una
              forma de ver el flujo completo, y lo dice en vez de fingir que
              la app avanza sola. */}
          {isDemoMode() ? (
            <button
              type="button"
              className="mt-1.5 text-[11px] text-muted underline"
              onClick={() => respond.mutate(true)}
            >
              {es.relationship.demoRespondForThem}
            </button>
          ) : null}
        </div>
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

/**
 * La historia de la pareja, en la conversación.
 *
 * Only appears once they declared they married, which is the only stage that
 * can produce one. Nothing is published on one person's say-so, and the card
 * says so before anybody types a word.
 */
export function OurStoryCard({ matchId }: { matchId: string }) {
  const { data } = useOurStory(matchId);
  const submit = useSubmitStory(matchId);
  const consent = useConsentToStory(matchId);
  const [writing, setWriting] = useState(false);
  const [names, setNames] = useState('');
  const [churchNames, setChurchNames] = useState('');
  const [city, setCity] = useState('');
  const [marriedAt, setMarriedAt] = useState('');
  const [body, setBody] = useState('');

  // Antes de casarse no hay nada que contar, y decirlo aquí sería ruido.
  if (!data || (!data.canSubmit && !data.story)) return null;

  const story = data.story;
  const waitingOnMe = story?.status === 'DRAFT' && !story.myConsent;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit.mutateAsync({ names, churchNames, city, marriedAt, body });
    setWriting(false);
  };

  return (
    <section className="card mb-3 border-[1.5px] border-olive" aria-label={es.stories.tellOurs}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-olive-text">
        {es.stories.title}
      </div>

      {story ? (
        <>
          <b className="text-[13px]">{story.names}</b>
          <p className="mt-1 whitespace-pre-line text-[12px] text-body">{story.body}</p>
          <p className="mt-2 text-[11px] text-muted">
            {story.status === 'PUBLISHED'
              ? es.stories.published
              : story.status === 'IN_REVIEW'
                ? es.stories.inReview
                : story.status === 'REJECTED'
                  ? (story.reviewNote ?? es.stories.rejected)
                  : waitingOnMe
                    ? es.stories.partnerWrote
                    : es.stories.waitingPartner}
          </p>
          {waitingOnMe ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={consent.isPending}
                onClick={() => consent.mutate(true)}
              >
                {es.stories.agree}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={consent.isPending}
                onClick={() => consent.mutate(false)}
              >
                {es.stories.refuse}
              </button>
            </div>
          ) : null}
        </>
      ) : writing ? (
        <form className="mt-2" onSubmit={send}>
          <label className="mb-1 block text-[11px] text-muted" htmlFor="story-names">
            {es.stories.namesLabel}
          </label>
          <input
            id="story-names"
            className="field mb-2 w-full"
            placeholder={es.stories.namesPlaceholder}
            value={names}
            onChange={(event) => setNames(event.target.value)}
            required
          />

          <label className="mb-1 block text-[11px] text-muted" htmlFor="story-churches">
            {es.stories.churchesLabel}
          </label>
          <input
            id="story-churches"
            className="field w-full"
            value={churchNames}
            onChange={(event) => setChurchNames(event.target.value)}
          />
          <p className="mb-2 mt-1 text-[11px] text-muted">{es.stories.churchesHint}</p>

          <div className="mb-2 flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-muted" htmlFor="story-city">
                {es.stories.cityLabel}
              </label>
              <input
                id="story-city"
                className="field w-full"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-muted" htmlFor="story-date">
                {es.stories.marriedAtLabel}
              </label>
              <input
                id="story-date"
                type="date"
                className="field w-full"
                value={marriedAt}
                onChange={(event) => setMarriedAt(event.target.value)}
                required
              />
            </div>
          </div>

          <label className="mb-1 block text-[11px] text-muted" htmlFor="story-body">
            {es.stories.bodyLabel}
          </label>
          <textarea
            id="story-body"
            className="field w-full"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            minLength={80}
            maxLength={3000}
            required
          />
          <p className="mb-2 mt-1 text-[11px] text-muted">{es.stories.bodyHint}</p>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm" disabled={submit.isPending}>
              {es.stories.submit}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setWriting(false)}>
              {es.common.cancel}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">{es.stories.consentNotice}</p>
        </form>
      ) : (
        <>
          <p className="mt-1 text-[11.5px] text-olive-text">{es.stories.tellOursIntro}</p>
          <button type="button" className="btn btn-sm mt-2" onClick={() => setWriting(true)}>
            {es.stories.tellOurs}
          </button>
        </>
      )}
    </section>
  );
}

/**
 * Plan del primer encuentro (RF-SEG-06).
 *
 * Two things this card must say out loud, because they are the reason it can
 * be trusted: the plan is yours alone — the other person never sees it — and
 * Yugo never asks for, stores, or writes to your trusted contact. The message
 * is written for you; you send it yourself.
 */
export function MeetingPlanCard({ matchId }: { matchId: string }) {
  const { data } = useMeetingPlan(matchId);
  const save = useSaveMeetingPlan(matchId);
  const markShared = useMarkPlanShared(matchId);
  const checkIn = usePlanCheckIn(matchId);
  const cancel = useCancelMeetingPlan(matchId);

  const plan = data?.plan ?? null;
  const [editing, setEditing] = useState(false);
  const [place, setPlace] = useState('');
  const [meetsAt, setMeetsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [contact, setContact] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      place,
      meetsAt: new Date(meetsAt).toISOString(),
      notes: notes || undefined,
      trustedContactLabel: contact || undefined,
    });
    setEditing(false);
  };

  return (
    <section className="card mb-3 border-0 bg-wine-soft" aria-label={es.meetingPlan.title}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-wine">
        {es.meetingPlan.title}
      </div>

      {plan ? (
        <>
          <p className="mt-1 text-[12.5px] text-body">
            <b>{plan.place}</b>
            <span className="block text-[11.5px] text-muted">
              {new Date(plan.meetsAt).toLocaleString('es-DO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </p>

          {plan.status === 'CHECKED_IN' ? (
            <p className="mt-2 text-[11.5px] text-olive-text">{es.meetingPlan.checkedIn}</p>
          ) : plan.awaitingCheckIn ? (
            <div className="mt-2 rounded-field bg-white px-3 py-2.5">
              <b className="text-[12.5px]">{es.meetingPlan.checkInPrompt}</b>
              <p className="mt-0.5 text-[11.5px] text-muted">{es.meetingPlan.checkInBody}</p>
              <button
                type="button"
                className="btn btn-sm mt-2"
                onClick={() => checkIn.mutate(plan.id)}
              >
                {es.meetingPlan.checkIn}
              </button>
            </div>
          ) : (
            <>
              {/* El mensaje lo manda la persona, no Yugo: nunca pedimos ni
                  guardamos el teléfono de un tercero. */}
              <pre className="mt-2 whitespace-pre-wrap rounded-field bg-white px-3 py-2 font-sans text-[11.5px] text-body">
                {plan.shareText}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(plan.shareText).catch(() => {});
                    setCopied(true);
                    markShared.mutate(plan.id);
                  }}
                >
                  {plan.status === 'SHARED' ? es.meetingPlan.shared : es.meetingPlan.share}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => cancel.mutate(plan.id)}
                >
                  {es.meetingPlan.cancel}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {copied || plan.status === 'SHARED'
                  ? plan.trustedContactLabel
                    ? es.meetingPlan.sharedAt(plan.trustedContactLabel)
                    : es.meetingPlan.shared
                  : es.meetingPlan.pendingShare}
              </p>
            </>
          )}
          <p className="mt-2 text-[11px] text-muted">{es.meetingPlan.privateNotice}</p>
        </>
      ) : editing ? (
        <form className="mt-2" onSubmit={submit}>
          <label className="mb-1 block text-[11px] text-muted" htmlFor="plan-place">
            {es.meetingPlan.placeLabel}
          </label>
          <input
            id="plan-place"
            className="field w-full"
            placeholder={es.meetingPlan.placePlaceholder}
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            required
          />
          <p className="mb-2 mt-1 text-[11px] text-muted">{es.meetingPlan.placeHint}</p>

          <label className="mb-1 block text-[11px] text-muted" htmlFor="plan-when">
            {es.meetingPlan.whenLabel}
          </label>
          <input
            id="plan-when"
            type="datetime-local"
            className="field mb-2 w-full"
            value={meetsAt}
            onChange={(event) => setMeetsAt(event.target.value)}
            required
          />

          <label className="mb-1 block text-[11px] text-muted" htmlFor="plan-contact">
            {es.meetingPlan.contactLabel}
          </label>
          <input
            id="plan-contact"
            className="field w-full"
            placeholder={es.meetingPlan.contactPlaceholder}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
          <p className="mb-2 mt-1 text-[11px] text-muted">{es.meetingPlan.contactHint}</p>

          <label className="mb-1 block text-[11px] text-muted" htmlFor="plan-notes">
            {es.meetingPlan.notesLabel}
          </label>
          <input
            id="plan-notes"
            className="field mb-2 w-full"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={300}
          />

          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm" disabled={save.isPending}>
              {es.meetingPlan.save}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
              {es.common.cancel}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-1 text-[11.5px] text-body">{es.meetingPlan.intro}</p>
          <button
            type="button"
            className="btn btn-sm btn-ghost mt-2"
            onClick={() => setEditing(true)}
          >
            {es.meetingPlan.title}
          </button>
        </>
      )}
    </section>
  );
}
