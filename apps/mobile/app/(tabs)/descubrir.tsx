import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoDiscover, es, LIMITS, type ProfileCard } from '@yugo/shared';
import { AffinityRing, Button, Card, CheckMark, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function DiscoverScreen() {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [passed, setPassed] = useState<Record<string, boolean>>({});
  const [used, setUsed] = useState(3);
  const remaining = Math.max(0, LIMITS.DAILY_INTERESTS_FREE - used);

  const visible = demoDiscover.filter((profile) => !passed[profile.userId]);

  const markInterest = (userId: string) => {
    if (remaining <= 0) {
      router.push('/plus');
      return;
    }
    setSent((s) => ({ ...s, [userId]: true }));
    setUsed((u) => u + 1);
  };

  const renderCard = ({ item: profile }: { item: ProfileCard }) => (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={styles.photo}>
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
            {profile.city} · {profile.distanceKm} km{profile.occupation ? ` · ${profile.occupation}` : ''}
          </Text>
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <View style={styles.chips}>
          <Chip label={profile.denomination} tone="olive" />
          {profile.churchName ? <Chip label={profile.churchName} /> : null}
          {profile.intention === 'MARRIAGE' ? <Chip label={es.discover.purposeMarriage} tone="wheat" /> : null}
        </View>
        {profile.testimony ? <Text style={styles.testimony}>{profile.testimony}</Text> : null}
        <View style={styles.actions}>
          <Button
            label={es.discover.pass}
            tone="ghost"
            style={{ flex: 1 }}
            onPress={() => setPassed((p) => ({ ...p, [profile.userId]: true }))}
          />
          <Button
            label={sent[profile.userId] ? es.discover.interestSent : es.discover.interested}
            tone="olive"
            disabled={sent[profile.userId]}
            style={{ flex: 1.6 }}
            onPress={() => markInterest(profile.userId)}
          />
        </View>
        <Button
          label={es.affinity.title}
          tone="ghost"
          small
          style={{ alignSelf: 'center', marginTop: 8, borderWidth: 0 }}
          onPress={() => router.push({ pathname: '/afinidad/[id]', params: { id: profile.userId } })}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <H>{es.discover.title}</H>
        <Chip label={es.discover.interestsLeft(remaining)} />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(profile) => profile.userId}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
        ListFooterComponent={
          <Sub style={{ textAlign: 'center', paddingVertical: 8 }}>
            {es.discover.listProgress(visible.length, LIMITS.DISCOVER_PER_DAY_FREE)}
          </Sub>
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
  testimony: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
