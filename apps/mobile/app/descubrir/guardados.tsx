import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useSavedProfiles } from '@yugo/app-core';
import { AffinityRing, AvatarCircle, Card, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** "Guardar para después" (RF-DES-04). */
export default function SavedProfilesScreen() {
  const { data: saved = [], isLoading } = useSavedProfiles();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.discover.savedProfiles} />
      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.common.loading}</Sub>
        ) : saved.length === 0 ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 20 }}>
              Todavía no has guardado ningún perfil. Usa “{es.discover.saveForLater}” en Descubrir.
            </Sub>
          </Card>
        ) : (
          saved.map((profile) => (
            <Pressable
              key={profile.userId}
              onPress={() =>
                router.push({ pathname: '/afinidad/[id]', params: { id: profile.userId } })
              }
            >
              <Card style={styles.row}>
                <AvatarCircle name={profile.displayName} size={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name}>
                    {profile.displayName}, {profile.age}
                  </Text>
                  <Sub style={{ fontSize: 11 }}>
                    {profile.denomination} · {profile.distanceLabel}
                  </Sub>
                </View>
                <AffinityRing value={profile.affinity.total} size={40} />
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
