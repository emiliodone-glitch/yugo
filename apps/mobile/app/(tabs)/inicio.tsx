import { Link, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, demoDailySummary, demoDiscover, demoEvents, es } from '@yugo/shared';
import { AffinityRing, AvatarCircle, Button, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function HomeScreen() {
  const featured = demoEvents[0];
  const today = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Sub style={{ textTransform: 'capitalize' }}>{today}</Sub>
            <H>{es.home.greeting(demoCurrentUser.displayName)}</H>
          </View>
          <AvatarCircle name={demoCurrentUser.displayName} size={34} />
        </View>

        <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{es.home.interestsToday}</Text>
              <Text style={styles.summaryValue}>
                {demoDailySummary.interestsUsedToday}
                <Text style={styles.summaryTotal}> / {demoDailySummary.interestsLimit ?? '∞'}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>{es.home.newConnections}</Text>
              <Text style={[styles.summaryValue, { color: colors.wheat }]}>
                {demoDailySummary.newConnections}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.sectionRow}>
          <H size={15}>{es.home.featuredEvents}</H>
          <Link href="/(tabs)/eventos" asChild>
            <Sub>{es.common.seeAll}</Sub>
          </Link>
        </View>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={styles.eventBanner} />
          <View style={{ padding: 14 }}>
            <View style={styles.rowBetween}>
              <Chip label={featured.typeName} tone="wine" />
              <Sub>Vie 4 sep · 8:00 pm</Sub>
            </View>
            <H size={15} style={{ marginTop: 6 }}>
              {featured.title}
            </H>
            <Sub>
              {featured.churchName} · {featured.city} · {featured.distanceKm} km
            </Sub>
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <Sub>{es.home.connectionsGoing(featured.connectionsGoing.length)}</Sub>
              <Button label={es.home.willAttend} tone="olive" small />
            </View>
          </View>
        </Card>

        <View style={styles.sectionRow}>
          <H size={15}>{es.home.suggestionsToday}</H>
          <Link href="/(tabs)/descubrir" asChild>
            <Sub>{es.tabs.discover}</Sub>
          </Link>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {demoDiscover.slice(0, 4).map((profile) => (
            <Card key={profile.userId} style={styles.suggestionCard}>
              <View style={styles.rowBetween}>
                <AvatarCircle name={profile.displayName} size={34} />
                <AffinityRing value={profile.affinity.total} size={34} />
              </View>
              <H size={13} style={{ marginTop: 8 }}>
                {profile.displayName}, {profile.age}
              </H>
              <Sub style={{ fontSize: 11 }}>
                {profile.denomination} · {profile.distanceKm} km
              </Sub>
            </Card>
          ))}
        </ScrollView>

        <Button
          label={es.profile.title}
          tone="ghost"
          style={{ marginTop: 16 }}
          onPress={() => router.push('/perfil')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 12 },
  summaryValue: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  summaryTotal: { fontSize: 14, color: colors.inkMuted2 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventBanner: { height: 92, backgroundColor: colors.wine },
  suggestionCard: { minWidth: 130, marginBottom: 0, padding: 10 },
});
