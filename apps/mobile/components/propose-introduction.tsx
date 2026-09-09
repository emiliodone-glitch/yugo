import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { useProposeIntroduction, useProposedIntroductions } from '@yugo/app-core';
import { Button, Card, Chip, Field, Notice, Sub } from './ui';
import { errorMessage } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Presentación por padrino (RF-ACO-05), del lado del padrino: dos personas
 * que conoce, una nota con el porqué, y lo que propuso con su resultado.
 */
export function ProposeIntroduction({ enabled }: { enabled: boolean }) {
  const proposed = useProposedIntroductions(enabled);
  const propose = useProposeIntroduction();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<{ tone: 'olive' | 'wine'; text: string } | null>(null);

  if (!enabled) return null;
  const valid = a.trim().length >= 3 && b.trim().length >= 3 && note.trim().length >= 20;

  const submit = async () => {
    setNotice(null);
    try {
      await propose.mutateAsync({ a: a.trim(), b: b.trim(), note: note.trim() });
      setA('');
      setB('');
      setNote('');
      setNotice({ tone: 'olive', text: es.accompaniment.introSent });
    } catch (caught) {
      const message = errorMessage(caught);
      const key = Object.keys(es.accompaniment.introErrors).find((code) => message.includes(code));
      setNotice({ tone: 'wine', text: key ? es.accompaniment.introErrors[key] : message });
    }
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Card>
        <Text style={styles.title}>{es.accompaniment.introTitle}</Text>
        <Sub style={{ fontSize: 11.5, marginTop: 4, marginBottom: 10 }}>
          {es.accompaniment.introIntro}
        </Sub>
        <Sub style={{ fontSize: 11, marginBottom: 4 }}>{es.accompaniment.introPersonA}</Sub>
        <Field value={a} onChangeText={setA} keyboardType="email-address" />
        <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
          {es.accompaniment.introPersonB}
        </Sub>
        <Field value={b} onChangeText={setB} keyboardType="email-address" />
        <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
          {es.accompaniment.introNote}
        </Sub>
        <Field
          value={note}
          onChangeText={setNote}
          placeholder={es.accompaniment.introNotePlaceholder}
          multiline
          maxLength={500}
          autoCapitalize="sentences"
        />
        {notice ? (
          <View style={{ marginTop: 8 }}>
            <Notice tone={notice.tone} text={notice.text} />
          </View>
        ) : null}
        <Button
          label={es.accompaniment.introSend}
          tone="olive"
          style={{ marginTop: 12 }}
          disabled={!valid || propose.isPending}
          onPress={() => void submit()}
        />
      </Card>

      {(proposed.data ?? []).length > 0 ? (
        <>
          <Text style={styles.section}>{es.accompaniment.introMine}</Text>
          {(proposed.data ?? []).map((item) => (
            <Card key={item.id} style={{ marginBottom: 8 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.names}>{item.names.join(' y ')}</Text>
                <Chip
                  label={es.accompaniment.introStatus[item.status]}
                  tone={
                    item.status === 'MATCHED'
                      ? 'olive'
                      : item.status === 'PENDING'
                        ? 'wheat'
                        : 'default'
                  }
                />
              </View>
              <Sub style={{ fontSize: 12, marginTop: 4 }}>«{item.note}»</Sub>
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
  section: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.muted,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  names: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.ink, flex: 1 },
});
