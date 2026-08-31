import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LIMITS, type ProfileCard } from '@yugo/shared';
import {
  useDemoStore,
  useDiscover,
  useMarkInterest,
  usePassProfile,
  useSaveProfile,
} from '@yugo/app-core';
import { AffinityRing, Button, Card, CheckMark, Chip, H, Notice, Sub } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { scaled, useFontScale } from '../../lib/a11y';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/**
 * Descubrir is a curated vertical list, never a swipe deck: the member reads
 * each profile and decides (sección 3 del prompt).
 */
export default function DiscoverScreen() {
  const [endorsedOnly, setEndorsedOnly] = useState(false);
  const { data, isLoading } = useDiscover({ endorsedOnly: endorsedOnly || undefined });
  const markInterest = useMarkInterest();
  const passProfile = usePassProfile();
  const saveProfile = useSaveProfile();
  const sentInterests = useDemoStore((s) => s.sentInterests);
  const savedProfiles = useDemoStore((s) => s.savedProfiles);
  const [error, setError] = useState<string | null>(null);
  // RNF-05: la foto crece con el tamaño de letra del sistema; una altura fija
  // recortaría el nombre y la distancia en vez de acomodarlos.
  const fontScale = useFontScale();

  const profiles = data?.items ?? [];
  const limit = data?.limit ?? LIMITS.DAILY_INTERESTS_FREE;
  const remaining = limit === null ? null : Math.max(0, limit - (data?.used ?? 0));

  const interest = async (userId: string) => {
    setError(null);
    try {
      await markInterest.mutateAsync({ userId });
    } catch (caught) {
      // The daily allowance is spent: the paywall is the answer, not an error.
      if (caught instanceof Error && caught.message === 'daily_interests_used') {
        router.push('/plus');
        return;
      }
      setError(errorMessage(caught));
    }
  };

  const renderCard = ({ item: profile }: { item: ProfileCard }) => {
    const sent = sentInterests[profile.userId];
    return (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[styles.photo, { height: scaled(250, fontScale) }]}>
          {profile.photoUrl ? (
            <Image
              source={{ uri: profile.photoUrl }}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={`Foto de ${profile.displayName}`}
            />
          ) : null}
          {profile.badges.endorsedBy ? (
            <View style={styles.badge}>
              <CheckMark size={11} />
              <Text style={styles.badgeText}>
                {profile.gender === 'FEMALE' ? es.discover.endorsedBadge : es.discover.endorsedBadgeM}
              </Text>
            </View>
          ) : null}
          <View style={styles.ringWrap}>
            <AffinityRing value={profile.affinity.total} />
          </View>
          <View style={styles.photoCaption}>
            <Text style={styles.photoName}>
              {profile.displayName}, {profile.age}
            </Text>
            <Text style={styles.photoMeta}>
              {profile.city} · {profile.distanceLabel}
              {profile.occupation ? ` · ${profile.occupation}` : ''}
            </Text>
          </View>
        </View>
        <View style={{ padding: 14 }}>
          <View style={styles.chips}>
            <Chip label={profile.denomination} tone="olive" />
            {profile.churchName ? <Chip label={profile.churchName} /> : null}
            {profile.intention === 'MARRIAGE' ? (
              <Chip label={es.discover.purposeMarriage} tone="wheat" />
            ) : null}
          </View>
          {/* RF-DES-02: por qué esta persona, en la tarjeta misma */}
          {profile.affinityReason ? (
            <View style={styles.reason}>
              <Text style={styles.reasonText}>✦ {profile.affinityReason}</Text>
            </View>
          ) : null}
          {profile.testimony ? <Text style={styles.testimony}>{profile.testimony}</Text> : null}
          <View style={styles.actions}>
            <Button
              label={es.discover.pass}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => passProfile.mutate(profile.userId)}
            />
            <Button
              label={sent ? es.discover.interestSent : es.discover.interested}
              tone="olive"
              disabled={sent || markInterest.isPending}
              style={{ flex: 1.6 }}
              onPress={() => interest(profile.userId)}
            />
          </View>
          <View style={styles.secondaryActions}>
            <Button
              label={savedProfiles[profile.userId] ? 'Guardado ✓' : es.discover.saveForLater}
              tone="ghost"
              small
              style={{ borderWidth: 0 }}
              onPress={() => saveProfile.mutate(profile.userId)}
            />
            <Button
              label={es.affinity.title}
              tone="ghost"
              small
              style={{ borderWidth: 0 }}
              onPress={() =>
                router.push({ pathname: '/afinidad/[id]', params: { id: profile.userId } })
              }
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <H>{es.discover.title}</H>
        <Chip
          label={
            remaining === null ? es.discover.interestsUnlimited : es.discover.interestsLeft(remaining)
          }
        />
      </View>
      {/* RF-VER-02: el respaldo de iglesia es la señal de confianza del
          producto, así que filtrarlo no cuesta. */}
      <View style={styles.filterRow}>
        <Chip
          label="Solo respaldados por su iglesia"
          tone={endorsedOnly ? 'olive' : 'default'}
          onPress={() => setEndorsedOnly((value) => !value)}
        />
      </View>
      {error ? (
        <View style={{ paddingHorizontal: 18 }}>
          <Notice tone="wine" text={error} />
        </View>
      ) : null}
      <FlatList
        data={profiles}
        keyExtractor={(profile) => profile.userId}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
        ListEmptyComponent={
          isLoading ? (
            <Sub style={{ textAlign: 'center', paddingVertical: 40 }}>{es.common.loading}</Sub>
          ) : (
            /* La lista vacía no es un callejón: siempre ofrece a dónde ir. */
            <Card style={{ paddingVertical: 24 }}>
              <Sub style={{ textAlign: 'center' }}>
                {endorsedOnly
                  ? 'Nadie respaldado por su iglesia coincide contigo hoy. Quita el filtro para ver el resto.'
                  : es.discover.emptyToday}
              </Sub>
              {endorsedOnly ? (
                <Button
                  label="Ver a todos"
                  tone="olive"
                  small
                  style={{ alignSelf: 'center', marginTop: 14 }}
                  onPress={() => setEndorsedOnly(false)}
                />
              ) : null}
              <View style={styles.emptyActions}>
                <Button
                  label={es.community.title}
                  tone="ghost"
                  small
                  onPress={() => router.push('/(tabs)/comunidad')}
                />
                <Button
                  label={es.events.title}
                  tone="ghost"
                  small
                  onPress={() => router.push('/(tabs)/eventos')}
                />
                <Button
                  label="Ampliar mi búsqueda"
                  tone="ghost"
                  small
                  onPress={() => router.push('/perfil/preferencias')}
                />
              </View>
            </Card>
          )
        }
        ListFooterComponent={
          profiles.length > 0 ? (
            <Sub style={{ textAlign: 'center', paddingVertical: 8 }}>
              {es.discover.listProgress(profiles.length, LIMITS.DISCOVER_PER_DAY_FREE)}
            </Sub>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  photo: { height: 250, backgroundColor: '#AFA694' },
  badge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.olive,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 2,
  },
  badgeText: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  ringWrap: { position: 'absolute', right: 12, bottom: 12, zIndex: 2 },
  photoCaption: { position: 'absolute', left: 14, bottom: 14 },
  photoName: { color: '#fff', fontFamily: fonts.display, fontSize: 24 },
  photoMeta: { color: 'rgba(255,255,255,.9)', fontFamily: fonts.body, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reason: {
    backgroundColor: colors.oliveSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
  },
  reasonText: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: colors.oliveText },
  testimony: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryActions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 6 },
});
