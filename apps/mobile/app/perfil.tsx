import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es } from '@yugo/shared';
import { AvatarCircle, Button, Card, CheckMark, Chip, H, ProgressBar, Sub } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

export default function ProfileScreen() {
  const user = demoCurrentUser;
  const [paused, setPaused] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <AvatarCircle name={user.displayName} size={64} />
          <View style={{ flex: 1 }}>
            <H>
              {user.displayName}, {user.age}
            </H>
            <Sub>
              {user.city} · {user.occupation}
            </Sub>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Chip label={user.denomination} tone="olive" />
              <Chip label={es.discover.purposeMarriage} tone="wheat" />
            </View>
          </View>
        </View>

        <Card style={{ marginTop: 14 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowText}>{es.profile.completeness}</Text>
            <Text style={[styles.rowText, { fontFamily: fonts.bodyBold }]}>{user.completeness}%</Text>
          </View>
          <ProgressBar value={user.completeness} style={{ marginTop: 6 }} />
          <Sub style={{ fontSize: 11, marginTop: 6 }}>
            {es.profile.completenessHint(user.completenessNext.field, user.completenessNext.targetPct)}
          </Sub>
        </Card>

        <H size={15} style={{ marginBottom: 8 }}>
          {es.profile.verification}
        </H>
        <Card style={{ paddingVertical: 6 }}>
          <VerificationRow done title={es.profile.verificationContact} sub={es.profile.verificationContactDone} />
          <VerificationRow done title={es.profile.verificationIdentity} sub={es.profile.verificationIdentityDone('12 ago')} />
          <VerificationRow
            level3
            title={es.profile.verificationChurch}
            sub={es.profile.verificationChurchHint}
            action={<Button label={es.profile.obtain} small />}
          />
        </Card>

        <Pressable onPress={() => router.push('/plus')}>
          <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.wheat }}>
                  {es.profile.plusOroCard}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted }}>
                  {es.profile.plusOroSub}
                </Text>
              </View>
              <Chip label={es.common.see} tone="wheat" />
            </View>
          </Card>
        </Pressable>

        <SettingsRow label={es.profile.searchPreferences} onPress={() => router.push('/visibilidad')} />
        <SettingsRow label={es.profile.privacySecurity} onPress={() => router.push('/visibilidad')} />
        <View style={styles.settingsRow}>
          <Text style={styles.rowText}>{es.profile.pauseProfile}</Text>
          <Switch
            value={paused}
            onValueChange={setPaused}
            trackColor={{ true: colors.olive, false: '#D5D2C8' }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VerificationRow({
  title,
  sub,
  done,
  level3,
  action,
}: {
  title: string;
  sub: string;
  done?: boolean;
  level3?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.verificationRow}>
      <View
        style={[
          styles.levelBadge,
          { backgroundColor: done ? colors.olive : colors.wheat },
        ]}
      >
        {done ? (
          <CheckMark size={12} />
        ) : (
          <Text style={{ color: colors.inkDeep, fontFamily: fonts.bodyBold, fontSize: 11 }}>3</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowText}>{title}</Text>
        <Sub style={{ fontSize: 11 }}>{sub}</Sub>
      </View>
      {action}
    </View>
  );
}

function SettingsRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 16 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  levelBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
