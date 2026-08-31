import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useHomeSummary, useSession, useSetAttendance } from '@yugo/app-core';
import { AffinityRing, AvatarCircle, Button, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function HomeScreen() {
  const { data: session } = useSession();
  const { data, isLoading } = useHomeSummary();
  const setAttendance = useSetAttendance();

  const displayName = session?.displayName ?? '';
  const summary = data?.summary;
  const featured = data?.featuredEvent;
  const today = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date());

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Sub style={{ textTransform: 'capitalize' }}>{today}</Sub>
            <H>{es.home.greeting(displayName)}</H>
          </View>
          <Pressable onPress={() => router.push('/perfil')}>
            <AvatarCircle name={displayName || 'Y'} size={34} />
          </Pressable>
        </View>

        {/* Administrable banners (RF-ADM-10) */}
        {data?.banners?.map((banner) => (
          <Card key={banner.id} style={{ backgroundColor: colors.wheatSoft, borderWidth: 0 }}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Sub style={{ fontSize: 11, color: colors.wheatText, marginTop: 4 }}>{banner.body}</Sub>
          </Card>
        ))}

        <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>{es.home.interestsToday}</Text>
              <Text style={styles.summaryValue}>
                {summary?.interestsUsedToday ?? 0}
                <Text style={styles.summaryTotal}> / {summary?.interestsLimit ?? '∞'}</Text>
              </Text>
            </View>
            <Pressable
              style={{ alignItems: 'flex-end' }}
              onPress={() => router.push('/(tabs)/conexiones')}
            >
              <Text style={styles.summaryLabel}>{es.home.newConnections}</Text>
              <Text style={[styles.summaryValue, { color: colors.wheat }]}>
                {summary?.newConnections ?? 0}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.sectionRow}>
          <H size={15}>{es.home.featuredEvents}</H>
          <Pressable onPress={() => router.push('/(tabs)/eventos')}>
            <Sub>{es.common.seeAll}</Sub>
          </Pressable>
        </View>
        {featured ? (
          <Pressable
            onPress={() => router.push({ pathname: '/eventos/[id]', params: { id: featured.id } })}
          >
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.eventBanner} />
              <View style={{ padding: 14 }}>
                <View style={styles.rowBetween}>
                  <Chip label={featured.typeName} tone="wine" />
                  <Sub>
                    {new Intl.DateTimeFormat('es-DO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'America/Santo_Domingo',
                    }).format(new Date(featured.startsAt))}
                  </Sub>
                </View>
                <H size={15} style={{ marginTop: 6 }}>
                  {featured.title}
                </H>
                <Sub>
                  {featured.churchName} · {featured.city}
                  {featured.distanceKm !== undefined ? ` · ${featured.distanceKm} km` : ''}
                </Sub>
                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Sub>{es.home.connectionsGoing(featured.connectionsGoing.length)}</Sub>
                  <Button
                    label={es.home.willAttend}
                    tone="olive"
                    small
                    onPress={() =>
                      setAttendance.mutate({ eventId: featured.id, status: 'GOING' })
                    }
                  />
                </View>
              </View>
            </Card>
          </Pressable>
        ) : (
          <Sub style={{ paddingVertical: 12 }}>
            {isLoading ? es.common.loading : 'No hay eventos destacados esta semana.'}
          </Sub>
        )}

        <View style={styles.sectionRow}>
          <H size={15}>{es.home.suggestionsToday}</H>
          <Pressable onPress={() => router.push('/(tabs)/descubrir')}>
            <Sub>{es.tabs.discover}</Sub>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {(data?.suggestions ?? []).map((profile) => (
            <Pressable
              key={profile.userId}
              onPress={() =>
                router.push({ pathname: '/afinidad/[id]', params: { id: profile.userId } })
              }
            >
              <Card style={styles.suggestionCard}>
                <View style={styles.rowBetween}>
                  <AvatarCircle name={profile.displayName} size={34} photoUrl={profile.photoUrl} />
                  <AffinityRing value={profile.affinity.total} size={34} />
                </View>
                <H size={13} style={{ marginTop: 8 }}>
                  {profile.displayName}, {profile.age}
                </H>
                <Sub style={{ fontSize: 11 }}>
                  {profile.denomination} · {profile.distanceLabel}
                </Sub>
              </Card>
            </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.wheatText },
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
