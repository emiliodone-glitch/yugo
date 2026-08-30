import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useProfileCard, useSession } from '@yugo/app-core';
import { Card, Chip, H, ScoreBar, ScreenHeader, Sub, YugoLink } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const LABELS: Record<string, string> = {
  denomination: es.affinity.denomination,
  intention: es.affinity.intention,
  practices: es.affinity.practices,
  distance: es.affinity.distance,
  age: es.affinity.age,
};

/** Explains the affinity score component by component — never a black box. */
export default function AffinityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: profile, isLoading } = useProfileCard(id ?? '');
  const { data: session } = useSession();

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.affinity.title} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>
          {isLoading ? es.common.loading : 'Este perfil ya no está disponible.'}
        </Sub>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.affinity.title} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* The signature: two avatars joined by the yoke arc (sección 11) */}
        <YugoLink nameA={session?.displayName ?? 'Yo'} nameB={profile.displayName} />

        <Text style={styles.score}>
          {profile.affinity.total}
          <Text style={styles.scoreTotal}> / 100</Text>
        </Text>
        <Sub style={{ textAlign: 'center', marginBottom: 14 }}>
          {es.affinity.summary(profile.displayName)}
        </Sub>

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

        {profile.verse ? (
          <Card style={{ backgroundColor: colors.wheatSoft, borderWidth: 0, marginTop: 14 }}>
            <Text style={styles.verseLabel}>VERSÍCULO FAVORITO</Text>
            <Text style={styles.verse}>{profile.verse}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  score: { textAlign: 'center', fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  scoreTotal: { fontSize: 15, color: colors.muted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  verseLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.wheatText },
  verse: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 4 },
});
