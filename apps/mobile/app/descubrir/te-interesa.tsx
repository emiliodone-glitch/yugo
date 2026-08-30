import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useWhoMarkedMe } from '@yugo/app-core';
import { AvatarCircle, Card, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/**
 * "Te interesa a…" (RF-DES-09): a free account sees only how many people
 * marked interest; Plus and Oro see the profiles and any message.
 */
export default function InterestedInYouScreen() {
  const { data, isLoading } = useWhoMarkedMe();
  const profiles = data?.profiles ?? null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.discover.interestedInYou} />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
          <Text style={styles.countLabel}>Personas que marcaron interés en ti</Text>
          <Text style={styles.count}>{data?.count ?? 0}</Text>
        </Card>

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 20 }}>{es.common.loading}</Sub>
        ) : null}

        {!isLoading && profiles === null ? (
          <Pressable onPress={() => router.push('/plus')}>
            <Card style={{ backgroundColor: colors.wheatSoft, borderColor: colors.wheat }}>
              <Text style={styles.upsellTitle}>Descubre quiénes son con Yugo Plus</Text>
              <Sub style={{ fontSize: 11, color: colors.wheatText, marginTop: 4 }}>
                La cuenta gratuita ve la cantidad; Plus y Oro ven los perfiles completos.
              </Sub>
            </Card>
          </Pressable>
        ) : null}

        {profiles?.map((profile) => (
          <Pressable
            key={profile.userId}
            onPress={() =>
              router.push({ pathname: '/afinidad/[id]', params: { id: profile.userId } })
            }
          >
            <Card style={styles.row}>
              <AvatarCircle name={profile.displayName} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Sub style={{ fontSize: 11 }}>
                  {[profile.denomination, profile.city].filter(Boolean).join(' · ')}
                </Sub>
                {profile.message ? (
                  <Sub style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                    “{profile.message}”
                  </Sub>
                ) : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  countLabel: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 12 },
  count: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  upsellTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.wheatText },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
