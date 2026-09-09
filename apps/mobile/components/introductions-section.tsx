import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { useIntroductions, useRespondIntroduction } from '@yugo/app-core';
import { Button, Card, Notice, Sub } from './ui';
import { errorMessage } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Presentación por padrino (RF-ACO-05), del lado de quien la recibe: quién
 * presenta, su nota y la iglesia de la otra persona. Nada que la identifique
 * hasta que los dos dicen que sí.
 */
export function IntroductionsSection() {
  const { data: introductions = [] } = useIntroductions();
  const respond = useRespondIntroduction();
  const [notice, setNotice] = useState<string | null>(null);

  if (introductions.length === 0 && !notice) return null;

  const answer = async (id: string, accept: boolean) => {
    setNotice(null);
    try {
      const result = await respond.mutateAsync({ id, accept });
      if (result.matched) {
        setNotice(es.accompaniment.introMatched);
        if (result.conversationId) {
          router.push({ pathname: '/chat/[id]', params: { id: result.conversationId } });
        }
      } else if (accept) setNotice(es.accompaniment.introWaitingOther);
      else setNotice(es.accompaniment.introDeclined);
    } catch (caught) {
      setNotice(errorMessage(caught));
    }
  };

  return (
    <View style={{ marginBottom: 12 }} accessibilityLabel={es.accompaniment.introReceivedTitle}>
      {notice ? <Notice tone="olive" text={notice} /> : null}
      {introductions.map((item) => (
        <Card key={item.id} style={styles.card}>
          <Text style={styles.eyebrow}>{es.accompaniment.introReceivedTitle.toUpperCase()}</Text>
          <Text style={styles.title}>
            {es.accompaniment.introReceivedBy(item.proposer.displayName)}
          </Text>
          <Text style={styles.note}>«{item.note}»</Text>
          <Sub style={{ fontSize: 11.5, marginTop: 6 }}>
            {es.accompaniment.introReceivedHint(item.otherHint.churchName, item.otherHint.city)}.{' '}
            {es.accompaniment.introReceivedRule}
          </Sub>
          {item.myStatus === 'ACCEPTED' ? (
            <Text style={styles.waiting}>{es.accompaniment.introWaitingOther}</Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button
                label={es.accompaniment.introAccept}
                tone="olive"
                small
                disabled={respond.isPending}
                onPress={() => void answer(item.id, true)}
              />
              <Button
                label={es.accompaniment.introDecline}
                tone="ghost"
                small
                disabled={respond.isPending}
                onPress={() => void answer(item.id, false)}
              />
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderColor: colors.wheat, marginBottom: 8 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.wheatText,
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink, marginTop: 4 },
  note: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text,
    marginTop: 4,
  },
  waiting: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.oliveText,
    marginTop: 8,
  },
});
