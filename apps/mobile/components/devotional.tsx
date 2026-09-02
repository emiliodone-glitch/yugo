/**
 * Devocional del día y muro de oración, en la app.
 *
 * Espejo de `apps/web/src/components/devotional.tsx`. Las mismas ausencias
 * deliberadas: no hay rachas, no se marcan los días que faltó, y una petición
 * sin acompañar nunca muestra un cero.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  constancyLabel,
  es,
  prayerAuthorLabel,
  type PrayerRequestItem,
} from '@yugo/shared';
import {
  useCreatePrayer,
  useCurrentUserId,
  useDevotional,
  useIntercede,
  useMarkPrayerAnswered,
  usePrayerWall,
  useReadDevotional,
} from '@yugo/app-core';
import { Button, Card, Chip, Field, H, Notice, Segment, Sub, Toggle } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

// ---------------------------------------------------------------------------
// Devocional
// ---------------------------------------------------------------------------

export function DevotionalCard({ compact = false }: { compact?: boolean }) {
  const { data } = useDevotional();
  const read = useReadDevotional();
  const [draft, setDraft] = useState('');

  if (!data) return null;

  const held = data.myReflectionStatus !== null && data.myReflectionStatus !== 'APPROVED';

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{es.devotional.title}</Text>
          <H size={14}>{data.title}</H>
          <Sub style={{ fontSize: 11 }}>{data.reference}</Sub>
        </View>
        {data.readByMe ? <Chip label={es.devotional.readByMe} tone="olive" /> : null}
      </View>

      {/* Honesto cuando hay un hueco en la programación, en vez de fingir. */}
      {!data.isToday ? (
        <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.devotional.notTodayYet}</Sub>
      ) : null}

      <Text style={styles.body}>{data.body}</Text>

      <View style={styles.question}>
        <Text style={[styles.eyebrow, { color: colors.wheatText }]}>{es.devotional.toThink}</Text>
        <Text style={[styles.body, { marginTop: 4 }]}>{data.question}</Text>
      </View>

      {/*
        El número de la congregación es lo que hace comunal una lectura
        solitaria: importa que los de tu iglesia leyeron lo mismo que tú.
      */}
      <Sub style={{ marginTop: 12 }}>{es.devotional.churchRead(data.churchReadCount)}</Sub>
      <Sub style={{ fontSize: 11 }}>{constancyLabel(data.constancy)}</Sub>

      {compact ? (
        !data.readByMe ? (
          <Button
            label={es.devotional.readIt}
            tone="olive"
            small
            style={{ marginTop: 12 }}
            onPress={() => read.mutate({ id: data.id })}
          />
        ) : null
      ) : (
        <>
          {data.myReflection ? (
            <View style={styles.mine}>
              <Text style={styles.eyebrow}>{es.devotional.reflectionLabel}</Text>
              <Text style={[styles.body, { marginTop: 4 }]}>{data.myReflection}</Text>
              {held ? <Notice text={es.devotional.reflectionHeld} tone="wine" /> : null}
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.eyebrow}>{es.devotional.reflectionLabel}</Text>
              <Field
                value={draft}
                onChangeText={setDraft}
                placeholder={es.devotional.reflectionPlaceholder}
                autoCapitalize="sentences"
                maxLength={280}
                multiline
                style={{ marginTop: 4 }}
              />
              <Sub style={{ fontSize: 11 }}>{es.devotional.reflectionHelp}</Sub>
              <Button
                label={draft.trim() ? es.devotional.save : es.devotional.readIt}
                tone="olive"
                small
                style={{ marginTop: 8 }}
                onPress={() => {
                  read.mutate({ id: data.id, reflection: draft.trim() || undefined });
                  setDraft('');
                }}
              />
            </View>
          )}

          {data.reflections.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.eyebrow}>{es.devotional.fromYourChurch}</Text>
              {data.reflections.map((item) => (
                <View key={item.userId} style={styles.reflection}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={[styles.body, { fontSize: 12 }]}>{item.reflection}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Sub style={{ fontSize: 11, marginTop: 16 }}>{es.devotional.noReflectionsYet}</Sub>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Muro de oración
// ---------------------------------------------------------------------------

export function PrayerWall() {
  const [scope, setScope] = useState<'community' | 'church'>('community');
  const { data } = usePrayerWall(scope);
  const viewerId = useCurrentUserId();
  const items = data ?? [];

  return (
    <View>
      <Segment
        value={scope}
        onChange={setScope}
        options={[
          { value: 'community', label: es.prayer.tabAll },
          { value: 'church', label: es.prayer.tabChurch },
        ]}
      />

      <PrayerComposer />

      {items.length === 0 ? (
        <Sub style={{ paddingVertical: 20, textAlign: 'center' }}>
          {scope === 'church' ? es.prayer.emptyChurch : es.prayer.empty}
        </Sub>
      ) : (
        items.map((item) => (
          <PrayerCard key={item.id} item={item} viewerId={viewerId ?? null} />
        ))
      )}
    </View>
  );
}

function PrayerComposer() {
  const create = useCreatePrayer();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [held, setHeld] = useState(false);

  if (!open) {
    return (
      <Button
        label={es.prayer.write}
        tone="olive"
        small
        style={{ marginTop: 12 }}
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <Card>
      <Text style={styles.eyebrow}>{es.prayer.bodyLabel}</Text>
      <Field
        value={body}
        onChangeText={setBody}
        placeholder={es.prayer.bodyPlaceholder}
        autoCapitalize="sentences"
        maxLength={600}
        multiline
        style={{ marginTop: 4 }}
      />

      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.name}>{es.prayer.anonymous}</Text>
          <Sub style={{ fontSize: 11 }}>{es.prayer.anonymousHelp}</Sub>
        </View>
        <Toggle on={anonymous} onChange={setAnonymous} label={es.prayer.anonymous} />
      </View>

      {held ? <Notice text={es.prayer.held} tone="wine" /> : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Button
          label={es.prayer.publish}
          tone="olive"
          small
          style={{ flex: 1 }}
          onPress={async () => {
            if (body.trim().length < 10) return;
            const result = await create.mutateAsync({ body: body.trim(), anonymous });
            setHeld(!result.published);
            if (result.published) {
              setBody('');
              setAnonymous(false);
              setOpen(false);
            }
          }}
        />
        <Button
          label={es.common.cancel}
          tone="ghost"
          small
          style={{ flex: 1 }}
          onPress={() => setOpen(false)}
        />
      </View>
    </Card>
  );
}

function PrayerCard({ item, viewerId }: { item: PrayerRequestItem; viewerId: string | null }) {
  const intercede = useIntercede();
  const markAnswered = useMarkPrayerAnswered();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const [noteHeld, setNoteHeld] = useState(false);

  // La autoría se decide por id y nunca por nombre: dos personas se pueden
  // llamar Ana, y cada una vería la petición de la otra como suya.
  const isMine = item.authorId !== null && item.authorId === viewerId;
  const label = prayerAuthorLabel(item, viewerId);

  return (
    <Card style={item.answeredAt ? { borderColor: colors.olive, borderWidth: 1.5 } : undefined}>
      <View style={styles.rowBetween}>
        <Text style={styles.name}>
          {label}
          {item.churchName ? <Text style={styles.church}> · {item.churchName}</Text> : null}
        </Text>
        {item.answeredAt ? <Chip label={es.prayer.answered} tone="olive" /> : null}
      </View>

      <Text style={styles.body}>{item.body}</Text>

      {item.answeredNote ? (
        <View style={styles.answered}>
          <Text style={[styles.body, { fontSize: 12, color: colors.oliveText }]}>
            {item.answeredNote}
          </Text>
        </View>
      ) : null}
      {noteHeld ? <Notice text={es.prayer.answeredNoteHeld} tone="wine" /> : null}

      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        {/* Nunca imprime un cero: eso lo resuelve `intercessionCount`. */}
        <Sub style={{ fontSize: 11 }}>{es.prayer.intercessionCount(item.intercessions)}</Sub>
        {!item.answeredAt ? (
          <Button
            label={item.iPrayed ? es.prayer.prayingDone : es.prayer.praying}
            tone={item.iPrayed ? 'ghost' : 'olive'}
            small
            onPress={() => intercede.mutate(item.id)}
          />
        ) : null}
      </View>

      {isMine && !item.answeredAt ? (
        closing ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.eyebrow}>{es.prayer.answeredNoteLabel}</Text>
            <Field
              value={note}
              onChangeText={setNote}
              placeholder={es.prayer.answeredNotePlaceholder}
              autoCapitalize="sentences"
              maxLength={600}
              multiline
              style={{ marginTop: 4 }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button
                label={es.prayer.markAnswered}
                tone="olive"
                small
                style={{ flex: 1 }}
                onPress={async () => {
                  const result = await markAnswered.mutateAsync({
                    id: item.id,
                    note: note.trim() || undefined,
                  });
                  setNoteHeld(result.noteHeld);
                  setClosing(false);
                }}
              />
              <Button
                label={es.common.cancel}
                tone="ghost"
                small
                style={{ flex: 1 }}
                onPress={() => setClosing(false)}
              />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setClosing(true)} style={{ marginTop: 8 }}>
            <Sub style={{ fontSize: 11, textDecorationLine: 'underline' }}>
              {es.prayer.markAnswered}
            </Sub>
          </Pressable>
        )
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginTop: 8, lineHeight: 19 },
  question: { backgroundColor: colors.wheatSoft, borderRadius: 10, padding: 12, marginTop: 12 },
  mine: { backgroundColor: colors.linen2, borderRadius: 10, padding: 12, marginTop: 12 },
  reflection: { backgroundColor: colors.linen2, borderRadius: 10, padding: 10, marginTop: 8 },
  answered: { backgroundColor: colors.oliveSoft, borderRadius: 10, padding: 10, marginTop: 8 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
  church: { fontFamily: fonts.body },
});
