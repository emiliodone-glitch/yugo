/**
 * Ruta de pareja después del sí (RF-REL-05), en la conversación.
 *
 * Mismas reglas y mismos hooks que la web: cerrada antes del noviazgo, pasos
 * con fecha sin porcentaje, recursos neutrales y consejería que la iglesia
 * solo ve cuando la firman los dos.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  es,
  STAGE_ORDER,
  type CoupleMilestoneState,
  type RelationshipStage,
  intlLocale,
} from '@yugo/shared';
import {
  isDemoMode,
  useCoupleJourney,
  useRequestCounseling,
  useRespondCounseling,
  useSetMilestone,
} from '@yugo/app-core';
import { Button, Chip, Field, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

export function CoupleJourneyCard({ matchId, otherName }: { matchId: string; otherName: string }) {
  const { data } = useCoupleJourney(matchId, otherName);
  const setMilestone = useSetMilestone(matchId);
  const [showResources, setShowResources] = useState(false);

  if (!data) return null;

  if (!data.unlocked) {
    return (
      <View style={styles.lockedCard} accessibilityLabel={es.journey.title}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>{es.journey.title}</Text>
        <Sub style={{ fontSize: 11.5, marginTop: 4 }}>
          {es.journey.locked(stageName(data.opensAt))}
        </Sub>
      </View>
    );
  }

  const open = data.milestones.filter((m) => STAGE_ORDER[m.stage] <= STAGE_ORDER[data.stage]);
  const later = data.milestones.filter((m) => STAGE_ORDER[m.stage] > STAGE_ORDER[data.stage]);

  return (
    <View style={styles.card} accessibilityLabel={es.journey.title}>
      <Text style={styles.eyebrow}>{es.journey.title}</Text>
      <Sub style={{ fontSize: 11.5, marginTop: 4 }}>{es.journey.intro}</Sub>

      <View style={{ marginTop: 10, gap: 6 }}>
        {open.map((milestone) => (
          <MilestoneRow
            key={milestone.key}
            milestone={milestone}
            pending={setMilestone.isPending}
            onToggle={(done) => setMilestone.mutate({ key: milestone.key, done })}
          />
        ))}
      </View>
      {later.length > 0 ? (
        <Sub style={{ fontSize: 11, marginTop: 8 }}>
          {later
            .map((m) => `${m.title} (${es.journey.opensLater(stageName(m.stage))})`)
            .join(' · ')}
        </Sub>
      ) : null}

      <Pressable
        onPress={() => setShowResources((v) => !v)}
        accessibilityRole="button"
        style={{ marginTop: 12 }}
      >
        <Text style={styles.link}>{es.journey.resourcesTitle}</Text>
      </Pressable>
      {showResources ? (
        <View style={styles.resources}>
          <Sub style={{ fontSize: 11 }}>{es.journey.resourcesIntro}</Sub>
          {data.resources.forYou.length > 0 ? (
            <ResourceList title={es.journey.forYou} items={data.resources.forYou} />
          ) : null}
          <ResourceList title={es.journey.general} items={data.resources.general} />
        </View>
      ) : null}

      <CounselingPanel matchId={matchId} otherName={otherName} data={data} />
    </View>
  );
}

function MilestoneRow({
  milestone,
  pending,
  onToggle,
}: {
  milestone: CoupleMilestoneState;
  pending: boolean;
  onToggle: (done: boolean) => void;
}) {
  const done = !!milestone.doneAt;
  return (
    <View style={[styles.milestone, done && { backgroundColor: colors.oliveSoft }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.milestoneTitle, done && { color: colors.oliveText }]}>
          {done ? '✓ ' : ''}
          {milestone.title}
        </Text>
        <Sub style={{ fontSize: 11 }}>
          {done && milestone.doneAt
            ? milestone.doneByMe
              ? es.journey.doneByYou(formatDate(milestone.doneAt))
              : es.journey.doneBy(
                  milestone.doneByName ?? 'Tu conexión',
                  formatDate(milestone.doneAt),
                )
            : `${es.journey.whyThis}: ${milestone.why}`}
        </Sub>
      </View>
      {done ? (
        <Pressable onPress={() => onToggle(false)} disabled={pending} accessibilityRole="button">
          <Text style={styles.link}>{es.journey.undo}</Text>
        </Pressable>
      ) : (
        <Button
          label={es.journey.markDone}
          small
          tone="ghost"
          disabled={pending}
          onPress={() => onToggle(true)}
        />
      )}
    </View>
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
    <View style={{ marginTop: 8 }}>
      <Text style={[styles.eyebrow, { color: colors.muted, fontSize: 10.5 }]}>{title}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.resource}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Chip label={es.journey.kinds[item.kind] ?? item.kind} />
            <Text style={styles.milestoneTitle}>{item.title}</Text>
          </View>
          <Sub style={{ fontSize: 11 }}>{item.by}</Sub>
          <Text style={styles.body}>{item.summary}</Text>
        </View>
      ))}
    </View>
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

  const submit = async () => {
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
    <View style={styles.counseling}>
      <Text style={[styles.eyebrow, { color: colors.wheatText }]}>
        {es.journey.counselingTitle}
      </Text>

      {current && active ? (
        <>
          <Text style={styles.wheatBody}>
            {current.status === 'PENDING_PARTNER'
              ? current.requestedByMe
                ? es.journey.requestedByYou(current.churchName)
                : es.journey.requestedByThem(otherName, current.churchName)
              : current.status === 'REQUESTED'
                ? es.journey.waitingChurch(current.churchName)
                : es.journey.accepted(current.churchName)}
          </Text>
          {current.responseNote ? (
            <Text style={styles.body}>
              {es.journey.churchSaid} {current.responseNote}
            </Text>
          ) : null}
          {current.status === 'PENDING_PARTNER' && !current.requestedByMe ? (
            <View style={styles.actions}>
              <Button
                label={es.journey.confirm}
                small
                disabled={respond.isPending}
                onPress={() => respond.mutate(true)}
              />
              <Button
                label={es.journey.notNow}
                small
                tone="ghost"
                disabled={respond.isPending}
                onPress={() => respond.mutate(false)}
              />
            </View>
          ) : null}
          {current.status === 'PENDING_PARTNER' && current.requestedByMe && isDemoMode() ? (
            <Pressable
              onPress={() => respond.mutate(true)}
              accessibilityRole="button"
              style={{ marginTop: 6 }}
            >
              <Text style={styles.link}>{es.relationship.demoRespondForThem}</Text>
            </Pressable>
          ) : null}
          <Sub style={{ fontSize: 11, marginTop: 6 }}>{es.journey.counselingVisibility}</Sub>
        </>
      ) : opening ? (
        <View style={{ marginTop: 8 }}>
          <Sub style={{ fontSize: 11 }}>{es.journey.counselingChurchLabel}</Sub>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            {data.churches.map((church) => (
              <Chip
                key={church.id}
                label={church.name}
                tone={church.id === churchId ? 'olive' : 'default'}
                onPress={() => setChurchId(church.id)}
              />
            ))}
          </View>
          <Sub style={{ fontSize: 11 }}>{es.journey.counselingNoteLabel}</Sub>
          <Field
            value={note}
            onChangeText={setNote}
            placeholder={es.journey.counselingNotePlaceholder}
            multiline
            maxLength={600}
            autoCapitalize="sentences"
          />
          <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.journey.counselingVisibility}</Sub>
          <View style={styles.actions}>
            <Button
              label={es.journey.request}
              small
              disabled={request.isPending || note.trim().length < 10}
              onPress={() => void submit()}
            />
            <Button label={es.common.cancel} small tone="ghost" onPress={() => setOpening(false)} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : (
        <>
          <Text style={styles.wheatBody}>{es.journey.counselingIntro}</Text>
          {current?.status === 'DECLINED' ? (
            <Sub style={{ fontSize: 11, marginTop: 4 }}>
              {current.responseNote
                ? `${es.journey.declinedByChurch(current.churchName)} ${current.responseNote}`
                : es.journey.declinedByPartner}
            </Sub>
          ) : null}
          {data.churches.length === 0 ? (
            <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.journey.counselingNoChurch}</Sub>
          ) : (
            <View style={styles.actions}>
              <Button
                label={current?.status === 'DECLINED' ? es.journey.askAgain : es.journey.request}
                small
                onPress={() => setOpening(true)}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.olive,
    padding: 14,
    marginBottom: 12,
  },
  lockedCard: { backgroundColor: colors.linen2, borderRadius: 18, padding: 14, marginBottom: 12 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.oliveText,
    textTransform: 'uppercase',
  },
  link: { fontSize: 11.5, color: colors.oliveText, textDecorationLine: 'underline' },
  milestone: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.linen,
    borderRadius: 12,
    padding: 10,
  },
  milestoneTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  body: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.text,
    marginTop: 2,
    lineHeight: 16,
  },
  resources: { backgroundColor: colors.linen, borderRadius: 12, padding: 10, marginTop: 8 },
  resource: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 6 },
  counseling: { backgroundColor: colors.wheatSoft, borderRadius: 12, padding: 12, marginTop: 12 },
  wheatBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.wheatText,
    marginTop: 4,
    lineHeight: 17,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.wine, marginTop: 6 },
});
