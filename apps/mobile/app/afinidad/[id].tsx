import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useProfileCard, useSession } from '@yugo/app-core';
import { Card, Chip, H, ScoreBar, ScreenHeader, Sub, YugoLink } from '../../components/ui';
import { PageSkeleton } from '../../components/skeleton';
import { QueryErrorCard } from '../../components/query-error-card';
import { VoicePlayer } from '../../components/voice-player';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const LABELS: Record<string, string> = {
  get denomination() {
    return es.affinity.denomination;
  },
  get intention() {
    return es.affinity.intention;
  },
  get practices() {
    return es.affinity.practices;
  },
  get distance() {
    return es.affinity.distance;
  },
  get age() {
    return es.affinity.age;
  },
};

/**
 * Afinidad de fe con una persona (RF-DES-02): por qué la sugerimos, en
 * componentes explicados y en razones que se pueden comprobar, lo que ya
 * comparten en Yugo, su voz, sus respuestas y su testimonio. Nunca un
 * porcentaje: la afinidad se explica, no se puntúa.
 */
export default function AffinityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = useProfileCard(id ?? '');
  const { data: session } = useSession();
  const profile = card.data;

  if (card.isError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.affinity.title} />
        <View style={{ paddingHorizontal: 18 }}>
          <QueryErrorCard error={card.error} onRetry={() => void card.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  if (card.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.affinity.title} />
        <PageSkeleton cards={2} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.affinity.title} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.notFound.body}</Sub>
      </SafeAreaView>
    );
  }

  const community = profile.community;
  const hasCommunity =
    !!community &&
    !!(
      community.sharedGroup ||
      community.prayedTogether ||
      community.sharedDevotional ||
      community.attendedTogether
    );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.affinity.title} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* The signature: two avatars joined by the yoke arc (sección 11) */}
        <YugoLink nameA={session?.displayName ?? 'Yo'} nameB={profile.displayName} />
        <Sub style={{ textAlign: 'center', marginBottom: 14 }}>
          {es.affinity.summary(profile.displayName)}
        </Sub>

        {profile.affinityReason ? (
          <View style={styles.reason}>
            <Text style={styles.reasonText}>{profile.affinityReason}</Text>
          </View>
        ) : null}

        <Card>
          {profile.affinity.components.map((component) => (
            <ScoreBar
              key={component.key}
              label={LABELS[component.key] ?? component.key}
              value={component.score}
              note={component.note}
            />
          ))}
        </Card>

        {profile.inCommon?.length ? (
          <>
            <H size={15} style={{ marginBottom: 8 }}>
              {es.affinity.inCommon}
            </H>
            <View style={styles.chipWrap}>
              {profile.inCommon.map((item, index) => (
                <Chip key={item} label={item} tone={index < 3 ? 'olive' : 'default'} />
              ))}
            </View>
          </>
        ) : null}

        {profile.affinityReasons && profile.affinityReasons.length > 0 ? (
          <Card style={{ backgroundColor: colors.oliveSoft, borderWidth: 0, marginTop: 14 }}>
            <Text style={[styles.eyebrow, { color: colors.oliveText }]}>
              {es.affinity.reasonsTitle}
            </Text>
            {profile.affinityReasons.map((reason) => (
              <Text key={reason} style={styles.reasonItem}>
                ✦ {reason}
              </Text>
            ))}
          </Card>
        ) : null}

        {hasCommunity && community ? (
          <Card>
            <Text style={styles.eyebrow}>{es.affinity.communityTitle}</Text>
            <View style={[styles.chipWrap, { marginTop: 6 }]}>
              {community.attendedTogether ? (
                <Chip label={es.affinity.communityEvent(community.attendedTogether)} />
              ) : null}
              {community.prayedTogether ? (
                <Chip label={es.affinity.communityPrayed(community.prayedTogether)} tone="wheat" />
              ) : null}
              {community.sharedDevotional ? (
                <Chip label={es.affinity.communityDevotional(community.sharedDevotional)} />
              ) : null}
              {community.sharedGroup ? (
                <Chip label={es.affinity.communityGroup(community.sharedGroup)} tone="olive" />
              ) : null}
            </View>
          </Card>
        ) : null}

        {profile.voiceUrl ? (
          <Card>
            <Text style={styles.eyebrow}>{es.affinity.voice}</Text>
            <View style={{ marginTop: 8 }}>
              <VoicePlayer url={profile.voiceUrl} durationMs={profile.voiceDurationMs} />
            </View>
          </Card>
        ) : null}

        {profile.answers && profile.answers.length > 0 ? (
          <Card>
            <Text style={styles.eyebrow}>{es.affinity.answers}</Text>
            <View style={{ marginTop: 6, gap: 10 }}>
              {profile.answers.map((item) => (
                <View key={item.question}>
                  <Text style={styles.question}>{item.question}</Text>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {profile.testimony ? (
          <Card>
            <Text style={styles.eyebrow}>{es.affinity.testimony}</Text>
            <Text style={styles.testimony}>
              {profile.testimony.replace(/^["“«]+|["”»]+$/g, '')}
            </Text>
          </Card>
        ) : null}

        {profile.verse ? (
          <Card style={{ backgroundColor: colors.wheatSoft, borderWidth: 0 }}>
            <Text style={[styles.eyebrow, { color: colors.wheatText }]}>VERSÍCULO FAVORITO</Text>
            <Text style={styles.verse}>{profile.verse}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  reason: {
    backgroundColor: colors.oliveSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  reasonText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.oliveText,
    textAlign: 'center',
  },
  reasonItem: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.oliveText,
    marginTop: 6,
  },
  question: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.oliveText },
  answer: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text },
  testimony: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
    marginTop: 6,
  },
  verse: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 4 },
});
