import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, demoDiscover, es } from '@yugo/shared';
import { AvatarCircle, Button, Card, Chip, H, ProgressBar, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const LABELS: Record<string, string> = {
  denomination: es.affinity.denomination,
  intention: es.affinity.intention,
  practices: es.affinity.practices,
  distance: es.affinity.distance,
  age: es.affinity.age,
};

export default function AffinityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = demoDiscover.find((p) => p.userId === id) ?? demoDiscover[0];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Button label={`‹ ${es.common.back}`} tone="ghost" small onPress={() => router.back()} />
          <H size={15}>{es.affinity.title}</H>
          <View style={{ width: 60 }} />
        </View>

        {/* Yoke arc joining the two avatars (sección 11) */}
        <View style={styles.yugoLink}>
          <View style={styles.arc} />
          <AvatarCircle name={demoCurrentUser.displayName} size={64} />
          <View style={{ width: 50 }} />
          <AvatarCircle name={profile.displayName} size={64} />
        </View>

        <Text style={styles.score}>
          {profile.affinity.total}
          <Text style={styles.scoreTotal}> / 100</Text>
        </Text>
        <Sub style={{ textAlign: 'center', marginBottom: 12 }}>{es.affinity.summary(profile.displayName)}</Sub>

        <Card>
          {profile.affinity.components.map((component) => (
            <View key={component.key} style={{ marginBottom: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.componentLabel}>{LABELS[component.key]}</Text>
                <Text style={[styles.componentLabel, { fontFamily: fonts.bodyBold }]}>{component.score}</Text>
              </View>
              <ProgressBar value={component.score} style={{ marginTop: 4 }} />
              {component.note ? <Sub style={{ fontSize: 11, marginTop: 2 }}>{component.note}</Sub> : null}
            </View>
          ))}
        </Card>

        {profile.inCommon?.length ? (
          <>
            <H size={15} style={{ marginBottom: 6 }}>
              {es.affinity.inCommon}
            </H>
            <View style={styles.chipWrap}>
              {profile.inCommon.map((item, index) => (
                <Chip key={item} label={item} tone={index < 3 ? 'olive' : 'default'} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yugoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
    marginVertical: 8,
  },
  arc: {
    position: 'absolute',
    top: 0,
    width: 130,
    height: 60,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.wheat,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
  },
  score: { textAlign: 'center', fontFamily: fonts.display, fontSize: 30, color: colors.ink },
  scoreTotal: { fontSize: 15, color: colors.muted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  componentLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
