import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, PROFILE_ANSWERS_TARGET, VOICE_NOTE_MAX_SECONDS } from '@yugo/shared';
import {
  useMyAnswers,
  useMyVoiceNote,
  useProfileQuestions,
  useRemoveAnswer,
  useRemoveVoiceNote,
  useSaveAnswer,
  useUploadVoiceNote,
} from '@yugo/app-core';
import { Button, Card, Chip, Field, Notice, ScreenHeader, Sub } from '../../components/ui';
import { VoicePlayer } from '../../components/voice-player';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/**
 * Tu voz (RF-PER-09/12): tres respuestas cortas y un audio de veinte
 * segundos grabado con el micrófono del teléfono. El audio lo escucha una
 * persona del equipo antes de publicarse; la pantalla lo dice y muestra el
 * estado.
 */
export default function VoiceScreen() {
  const questions = useProfileQuestions();
  const answers = useMyAnswers();
  const save = useSaveAnswer();
  const remove = useRemoveAnswer();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ tone: 'olive' | 'wine'; text: string } | null>(null);

  const answered = new Map((answers.data ?? []).map((row) => [row.question, row.answer]));
  const catalog = questions.data ?? [];
  const visibleKeys = [...new Set([...answered.keys(), ...picked])].filter((key) =>
    catalog.some((q) => q.key === key),
  );
  const remaining = catalog.filter((q) => !visibleKeys.includes(q.key));
  const answeredCount = visibleKeys.filter((key) => answered.has(key)).length;
  const draftOf = (key: string) => drafts[key] ?? answered.get(key) ?? '';

  const saveAnswer = async (key: string) => {
    const question = catalog.find((q) => q.key === key);
    const text = draftOf(key).trim();
    if (!question || !text) return;
    setNotice(null);
    try {
      await save.mutateAsync({ key, answer: text.slice(0, question.maxLength) });
      setNotice({ tone: 'olive', text: es.profile.answerSaved });
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice({
        tone: 'wine',
        text: /answer_rejected|rechaz/i.test(message) ? es.profile.answerRejected : message,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.voiceTitle} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Sub style={{ marginBottom: 10 }}>{es.profile.voiceSub}</Sub>
        {notice ? <Notice tone={notice.tone} text={notice.text} /> : null}

        <Text style={styles.section}>{es.profile.answersTitle}</Text>
        <Sub style={{ fontSize: 12, marginBottom: 8 }}>
          {es.profile.answersHint(answeredCount, PROFILE_ANSWERS_TARGET)}
        </Sub>

        {visibleKeys.map((key) => {
          const question = catalog.find((q) => q.key === key);
          if (!question) return null;
          const value = draftOf(key);
          const dirty = value.trim() !== (answered.get(key) ?? '');
          return (
            <Card key={key} style={{ marginBottom: 10 }}>
              <Text style={styles.question}>{question.question}</Text>
              <Field
                value={value}
                onChangeText={(text) => setDrafts((current) => ({ ...current, [key]: text }))}
                placeholder={es.profile.answerPlaceholder}
                maxLength={question.maxLength}
                multiline
                autoCapitalize="sentences"
                style={{ marginTop: 8 }}
              />
              <View style={styles.rowBetween}>
                <Sub style={{ fontSize: 11 }}>
                  {value.length} / {question.maxLength}
                </Sub>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {answered.has(key) ? (
                    <Button
                      label={es.profile.answerRemove}
                      tone="ghost"
                      small
                      disabled={remove.isPending}
                      onPress={() => {
                        setPicked((current) => current.filter((item) => item !== key));
                        void remove.mutateAsync(key);
                      }}
                    />
                  ) : null}
                  <Button
                    label={es.profile.answerSave}
                    tone="olive"
                    small
                    disabled={!dirty || !value.trim() || save.isPending}
                    onPress={() => void saveAnswer(key)}
                  />
                </View>
              </View>
            </Card>
          );
        })}

        {remaining.length > 0 ? (
          <Card style={{ marginBottom: 10 }}>
            <Text style={styles.question}>{es.profile.answerPick}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {remaining.map((question) => (
                <Pressable
                  key={question.key}
                  onPress={() => setPicked((current) => [...current, question.key])}
                  accessibilityRole="button"
                >
                  <Chip label={question.question} />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <VoiceSection />
      </ScrollView>
    </SafeAreaView>
  );
}

function VoiceSection() {
  const mine = useMyVoiceNote();
  const upload = useUploadVoiceNote();
  const removeVoice = useRemoveVoiceNote();
  const recording = useRef<Audio.Recording | null>(null);
  const stopping = useRef(false);
  const [state, setState] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<{ uri: string; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      void recording.current?.stopAndUnloadAsync().catch(() => undefined);
    },
    [],
  );

  const stop = async () => {
    const current = recording.current;
    if (!current || stopping.current) return;
    stopping.current = true;
    try {
      await current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const status = await current.getStatusAsync();
      const uri = current.getURI();
      recording.current = null;
      if (uri) {
        setTake({
          uri,
          durationMs: Math.min(
            VOICE_NOTE_MAX_SECONDS * 1000,
            Math.max(1000, status.durationMillis),
          ),
        });
        setState('ready');
      } else {
        setState('idle');
      }
    } catch {
      recording.current = null;
      setState('idle');
      setError(es.profile.audioNoMic);
    } finally {
      stopping.current = false;
    }
  };

  const start = async () => {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError(es.profile.audioNoMic);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const created = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (!status.isRecording) return;
          setSeconds(Math.floor(status.durationMillis / 1000));
          if (status.durationMillis >= VOICE_NOTE_MAX_SECONDS * 1000) void stop();
        },
        250,
      );
      recording.current = created.recording;
      setSeconds(0);
      setState('recording');
    } catch {
      setError(es.profile.audioNoMic);
    }
  };

  const reset = () => {
    setTake(null);
    setSeconds(0);
    setState('idle');
  };

  const publish = async () => {
    if (!take) return;
    setError(null);
    try {
      const blob = await (await fetch(take.uri)).blob();
      await upload.mutateAsync({ blob, contentType: 'audio/mp4', durationMs: take.durationMs });
      reset();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const current = mine.data ?? null;

  return (
    <View>
      <Text style={styles.section}>{es.profile.audioTitle}</Text>
      <Sub style={{ fontSize: 12, marginBottom: 8 }}>
        {es.profile.audioHint(VOICE_NOTE_MAX_SECONDS)}
      </Sub>

      {current ? (
        <Card style={{ marginBottom: 10 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.question}>
              {es.affinity.voiceSeconds(Math.round(current.durationMs / 1000))}
            </Text>
            <Chip
              label={
                current.status === 'APPROVED'
                  ? 'Publicado'
                  : current.status === 'REJECTED'
                    ? 'No aprobado'
                    : 'En revisión'
              }
            />
          </View>
          <Sub style={{ fontSize: 12, marginTop: 4 }}>{es.profile.audioStatus[current.status]}</Sub>
          {current.url ? (
            <View style={{ marginTop: 8 }}>
              <VoicePlayer
                url={current.url}
                durationMs={current.durationMs}
                label={es.profile.audioListen}
              />
            </View>
          ) : null}
          <Button
            label={es.profile.audioRemove}
            tone="ghost"
            small
            style={{ marginTop: 8 }}
            disabled={removeVoice.isPending}
            onPress={() => void removeVoice.mutateAsync()}
          />
        </Card>
      ) : null}

      <Card>
        {error ? <Notice tone="wine" text={error} /> : null}
        {state === 'recording' ? (
          <View style={styles.rowBetween}>
            <Text style={styles.timer}>
              ● {seconds} / {VOICE_NOTE_MAX_SECONDS} s
            </Text>
            <Button label={es.profile.audioStop} tone="ink" small onPress={() => void stop()} />
          </View>
        ) : state === 'ready' && take ? (
          <View>
            <VoicePlayer
              url={take.uri}
              durationMs={take.durationMs}
              label={es.profile.audioListen}
            />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Button
                label={upload.isPending ? es.profile.audioUploading : es.profile.audioUpload}
                tone="olive"
                small
                disabled={upload.isPending}
                onPress={() => void publish()}
              />
              <Button label={es.profile.audioRerecord} tone="ghost" small onPress={reset} />
            </View>
          </View>
        ) : (
          <Button
            label={current ? es.profile.audioRerecord : es.profile.audioRecord}
            tone="olive"
            small
            onPress={() => void start()}
          />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 28 },
  section: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 4,
  },
  question: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.oliveText },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  timer: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.wine },
});
