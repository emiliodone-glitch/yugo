/**
 * Etapas del vínculo, en la conversación.
 *
 * Same rules as the web card and the same hooks underneath: a stage is
 * proposed by one person and only takes effect when the other agrees.
 */
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { es, isExclusive, type RelationshipStage } from '@yugo/shared';
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
} from '@yugo/app-core';
import { Button, Field, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

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

  return (
    <View style={styles.card} accessibilityLabel={es.relationship.title}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{es.relationship.title}</Text>
          <Text style={styles.stage}>{stageName(stage)}</Text>
          <Sub style={{ fontSize: 11, marginTop: 2 }}>{es.relationship.stageHints[stage]}</Sub>
        </View>
        {history.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((v) => !v)}
            style={{ padding: 4 }}
          >
            <Text style={styles.link}>{es.relationship.history}</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded
        ? history.map((entry) => (
            <View key={entry.createdAt} style={styles.historyRow}>
              <Sub style={{ fontSize: 11 }}>{stageName(entry.toStage)}</Sub>
              <Sub style={{ fontSize: 11 }}>
                {new Date(entry.createdAt).toLocaleDateString('es-DO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Sub>
            </View>
          ))
        : null}

      {/* Their proposal, waiting on us. */}
      {proposal && !proposal.byMe ? (
        <View style={styles.panel}>
          <Text style={styles.panelText}>
            {es.relationship.proposedByThem(otherName, stageName(proposal.stage))}
          </Text>
          {isExclusive(proposal.stage) ? (
            <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.relationship.exclusiveNotice}</Sub>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={es.relationship.accept}
              style={{ flex: 1 }}
              onPress={() => respond.mutate(true)}
            />
            <Button
              label={es.relationship.decline}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => respond.mutate(false)}
            />
          </View>
        </View>
      ) : null}

      {/* Ours, waiting on them. */}
      {proposal?.byMe ? (
        <Sub style={{ fontSize: 11.5, marginTop: 10 }}>
          {es.relationship.proposedByYou(stageName(proposal.stage))}
        </Sub>
      ) : null}

      {/* Nothing in flight: we can suggest the next step. */}
      {!proposal && nextStage ? (
        confirming ? (
          <View style={styles.panel}>
            <Text style={styles.panelText}>{es.relationship.bothMustAgree}</Text>
            {isExclusive(nextStage) ? (
              <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.relationship.exclusiveNotice}</Sub>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={es.relationship.propose(stageName(nextStage))}
                style={{ flex: 1 }}
                onPress={() => {
                  propose.mutate(nextStage);
                  setConfirming(false);
                }}
              />
              <Button
                label={es.common.cancel}
                tone="ghost"
                style={{ flex: 1 }}
                onPress={() => setConfirming(false)}
              />
            </View>
          </View>
        ) : (
          <Button
            label={es.relationship.propose(stageName(nextStage))}
            tone="ghost"
            style={{ marginTop: 10 }}
            onPress={() => setConfirming(true)}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.wheat,
    padding: 14,
    marginBottom: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.wheatText,
    textTransform: 'uppercase',
  },
  stage: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginTop: 2 },
  link: { fontSize: 11, color: colors.muted, textDecorationLine: 'underline' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
    marginTop: 6,
  },
  panel: {
    backgroundColor: colors.wheatSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  panelText: { fontFamily: fonts.body, fontSize: 12, color: colors.wheatText, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  accompaniment: {
    backgroundColor: colors.oliveSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  storyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.olive,
    padding: 14,
    marginBottom: 12,
  },
  storyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
    marginTop: 6,
  },
  planCard: {
    backgroundColor: colors.wineSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  shareText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.text,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  wineBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
    marginTop: 4,
  },
  oliveBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.oliveText,
    lineHeight: 17,
    marginTop: 4,
  },
});

/**
 * Acompañamiento, en la conversación.
 *
 * Says out loud, every time, that the couple accompanying them never sees
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
  const pairName = current
    ? current.spouseName
      ? `${current.mentorName} y ${current.spouseName}`
      : current.mentorName
    : '';

  const submit = () => {
    setError(null);
    invite.mutate(code, {
      onSuccess: () => {
        setCode('');
        setOpening(false);
      },
      onError: (cause) => {
        const key = cause instanceof Error ? cause.message : 'generic';
        setError(
          key === 'mentor_code_not_found'
            ? 'Ese código no existe o ya no está activo.'
            : key === 'already_accompanied'
              ? es.accompaniment.alreadyAccompanied
              : es.errors.generic,
        );
      },
    });
  };

  return (
    <View style={styles.accompaniment} accessibilityLabel={es.accompaniment.title}>
      <Text style={[styles.eyebrow, { color: colors.oliveText }]}>{es.accompaniment.title}</Text>

      {current?.status === 'ACTIVE' ? (
        <>
          <Text style={styles.oliveBody}>{es.accompaniment.active(pairName)}</Text>
          {current.churchName ? (
            <Sub style={{ fontSize: 11 }}>
              {current.churchName}
              {current.marriedSince
                ? ` · ${es.accompaniment.marriedSince(current.marriedSince)}`
                : ''}
            </Sub>
          ) : null}
          <Text style={[styles.oliveBody, { marginTop: 6 }]}>
            {es.accompaniment.neverSeesChat}
          </Text>
          <Button
            label={es.accompaniment.end}
            tone="ghost"
            style={{ marginTop: 10 }}
            onPress={() =>
              Alert.alert(es.accompaniment.title, es.accompaniment.endConfirm, [
                { text: es.common.cancel, style: 'cancel' },
                {
                  text: es.accompaniment.end,
                  style: 'destructive',
                  onPress: () => end.mutate(current.id),
                },
              ])
            }
          />
        </>
      ) : waitingOnMe ? (
        <>
          <Text style={styles.oliveBody}>{es.accompaniment.partnerInvited(pairName)}</Text>
          <Text style={[styles.oliveBody, { marginTop: 4 }]}>
            {es.accompaniment.neverSeesChat}
          </Text>
          <View style={styles.actions}>
            <Button
              label={es.accompaniment.agree}
              style={{ flex: 1 }}
              onPress={() => consent.mutate(true)}
            />
            <Button
              label={es.accompaniment.refuse}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => consent.mutate(false)}
            />
          </View>
        </>
      ) : current?.status === 'INVITED' ? (
        <Text style={styles.oliveBody}>
          {current.mentorAccepted
            ? es.accompaniment.invitedWaitingPartner
            : es.accompaniment.invitedWaitingMentor}
        </Text>
      ) : data.canInvite ? (
        <>
          <Text style={styles.oliveBody}>{es.accompaniment.intro}</Text>
          {opening ? (
            <>
              <Field
                value={code}
                onChangeText={setCode}
                placeholder={es.accompaniment.codePlaceholder}
                autoCapitalize="characters"
                style={{ marginTop: 8 }}
              />
              <Button
                label={es.accompaniment.invite}
                style={{ marginTop: 8 }}
                disabled={invite.isPending}
                onPress={submit}
              />
            </>
          ) : (
            <Button
              label={es.accompaniment.inviteTitle}
              tone="ghost"
              style={{ marginTop: 10 }}
              onPress={() => setOpening(true)}
            />
          )}
          {error ? (
            <Text style={{ marginTop: 6, fontSize: 11, color: colors.wine }}>{error}</Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.oliveBody}>{es.accompaniment.needsIntentionalFriendship}</Text>
      )}
    </View>
  );
}

/**
 * La historia de la pareja, en la conversación.
 *
 * Solo aparece cuando declararon que se casaron. Nada se publica con el sí de
 * una sola persona, y la tarjeta lo dice antes de que nadie escriba una línea.
 */
export function OurStoryCard({ matchId }: { matchId: string }) {
  const { data } = useOurStory(matchId);
  const submit = useSubmitStory(matchId);
  const consent = useConsentToStory(matchId);
  const [writing, setWriting] = useState(false);
  const [names, setNames] = useState('');
  const [churchNames, setChurchNames] = useState('');
  const [marriedAt, setMarriedAt] = useState('');
  const [body, setBody] = useState('');

  if (!data || (!data.canSubmit && !data.story)) return null;

  const story = data.story;
  const waitingOnMe = story?.status === 'DRAFT' && !story.myConsent;

  return (
    <View style={styles.storyCard} accessibilityLabel={es.stories.title}>
      <Text style={[styles.eyebrow, { color: colors.oliveText }]}>{es.stories.title}</Text>

      {story ? (
        <>
          <Text style={styles.stage}>{story.names}</Text>
          <Text style={styles.storyBody}>{story.body}</Text>
          <Sub style={{ fontSize: 11, marginTop: 8 }}>
            {story.status === 'PUBLISHED'
              ? es.stories.published
              : story.status === 'IN_REVIEW'
                ? es.stories.inReview
                : story.status === 'REJECTED'
                  ? (story.reviewNote ?? es.stories.rejected)
                  : waitingOnMe
                    ? es.stories.partnerWrote
                    : es.stories.waitingPartner}
          </Sub>
          {waitingOnMe ? (
            <View style={styles.actions}>
              <Button
                label={es.stories.agree}
                style={{ flex: 1 }}
                onPress={() => consent.mutate(true)}
              />
              <Button
                label={es.stories.refuse}
                tone="ghost"
                style={{ flex: 1 }}
                onPress={() => consent.mutate(false)}
              />
            </View>
          ) : null}
        </>
      ) : writing ? (
        <>
          <Sub style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}>
            {es.stories.namesLabel}
          </Sub>
          <Field value={names} onChangeText={setNames} placeholder={es.stories.namesPlaceholder} />

          <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            {es.stories.churchesLabel}
          </Sub>
          <Field value={churchNames} onChangeText={setChurchNames} />

          <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            {es.stories.marriedAtLabel}
          </Sub>
          <Field
            value={marriedAt}
            onChangeText={setMarriedAt}
            placeholder="2026-02-14"
            keyboardType="numeric"
            maxLength={10}
          />

          <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>{es.stories.bodyLabel}</Sub>
          <Field value={body} onChangeText={setBody} multiline maxLength={3000} />
          <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.stories.bodyHint}</Sub>

          <View style={styles.actions}>
            <Button
              label={es.stories.submit}
              style={{ flex: 1 }}
              disabled={submit.isPending}
              onPress={() => {
                submit.mutate(
                  { names, churchNames, marriedAt, body },
                  { onSuccess: () => setWriting(false) },
                );
              }}
            />
            <Button
              label={es.common.cancel}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => setWriting(false)}
            />
          </View>
          <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.stories.consentNotice}</Sub>
        </>
      ) : (
        <>
          <Text style={styles.oliveBody}>{es.stories.tellOursIntro}</Text>
          <Button
            label={es.stories.tellOurs}
            style={{ marginTop: 10 }}
            onPress={() => setWriting(true)}
          />
        </>
      )}
    </View>
  );
}

/**
 * Plan del primer encuentro (RF-SEG-06).
 *
 * Dos cosas que esta tarjeta dice en voz alta, porque son la razón por la
 * que se puede confiar en ella: el plan es tuyo y la otra persona no lo ve,
 * y Yugo nunca pide ni guarda el teléfono de tu contacto de confianza. El
 * mensaje está escrito; lo mandas tú.
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
  const [contact, setContact] = useState('');

  return (
    <View style={styles.planCard} accessibilityLabel={es.meetingPlan.title}>
      <Text style={[styles.eyebrow, { color: colors.wine }]}>{es.meetingPlan.title}</Text>

      {plan ? (
        <>
          <Text style={styles.stage}>{plan.place}</Text>
          <Sub style={{ fontSize: 11 }}>
            {new Date(plan.meetsAt).toLocaleString('es-DO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Sub>

          {plan.status === 'CHECKED_IN' ? (
            <Sub style={{ fontSize: 11.5, marginTop: 8 }}>{es.meetingPlan.checkedIn}</Sub>
          ) : plan.awaitingCheckIn ? (
            <View style={styles.panel}>
              <Text style={styles.panelText}>{es.meetingPlan.checkInBody}</Text>
              <Button
                label={es.meetingPlan.checkIn}
                style={{ marginTop: 10 }}
                onPress={() => checkIn.mutate(plan.id)}
              />
            </View>
          ) : (
            <>
              <Text style={styles.shareText}>{plan.shareText}</Text>
              <View style={styles.actions}>
                <Button
                  label={plan.status === 'SHARED' ? es.meetingPlan.shared : es.meetingPlan.share}
                  style={{ flex: 1 }}
                  onPress={async () => {
                    // Lo manda la persona desde su propio teléfono: Yugo no
                    // escribe a nadie que no aceptó estar aquí.
                    await Share.share({ message: plan.shareText });
                    markShared.mutate(plan.id);
                  }}
                />
                <Button
                  label={es.meetingPlan.cancel}
                  tone="ghost"
                  style={{ flex: 1 }}
                  onPress={() => cancel.mutate(plan.id)}
                />
              </View>
              <Sub style={{ fontSize: 11, marginTop: 6 }}>
                {plan.status === 'SHARED'
                  ? plan.trustedContactLabel
                    ? es.meetingPlan.sharedAt(plan.trustedContactLabel)
                    : es.meetingPlan.shared
                  : es.meetingPlan.pendingShare}
              </Sub>
            </>
          )}
          <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.meetingPlan.privateNotice}</Sub>
        </>
      ) : editing ? (
        <>
          <Sub style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}>
            {es.meetingPlan.placeLabel}
          </Sub>
          <Field value={place} onChangeText={setPlace} placeholder={es.meetingPlan.placePlaceholder} />
          <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.meetingPlan.placeHint}</Sub>

          <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            {es.meetingPlan.whenLabel}
          </Sub>
          <Field value={meetsAt} onChangeText={setMeetsAt} placeholder="2026-09-06 19:00" />

          <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
            {es.meetingPlan.contactLabel}
          </Sub>
          <Field
            value={contact}
            onChangeText={setContact}
            placeholder={es.meetingPlan.contactPlaceholder}
          />
          <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.meetingPlan.contactHint}</Sub>

          <View style={styles.actions}>
            <Button
              label={es.meetingPlan.save}
              style={{ flex: 1 }}
              disabled={save.isPending}
              onPress={() => {
                const when = new Date(meetsAt.replace(' ', 'T'));
                if (Number.isNaN(when.getTime())) return;
                save.mutate(
                  {
                    place,
                    meetsAt: when.toISOString(),
                    trustedContactLabel: contact || undefined,
                  },
                  { onSuccess: () => setEditing(false) },
                );
              }}
            />
            <Button
              label={es.common.cancel}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => setEditing(false)}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.wineBody}>{es.meetingPlan.intro}</Text>
          <Button
            label={es.meetingPlan.title}
            tone="ghost"
            style={{ marginTop: 10 }}
            onPress={() => setEditing(true)}
          />
        </>
      )}
    </View>
  );
}
