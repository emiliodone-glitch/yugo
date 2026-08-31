import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es } from '@yugo/shared';
import { useDemoStore, useMyPhotos, useSession, useVerificationStatus } from '@yugo/app-core';
import {
  AvatarCircle,
  Button,
  Card,
  CheckMark,
  Chip,
  H,
  ListRow,
  ProgressBar,
  Sub,
  Toggle,
} from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function ProfileScreen() {
  const { data: session } = useSession();
  const { data: verification } = useVerificationStatus();
  const { data: myPhotos = [] } = useMyPhotos();
  const myPhotoUrl = myPhotos.find((photo) => photo.moderationStatus === 'APPROVED')?.url;
  const paused = useDemoStore((s) => s.pausedProfile);
  const setPaused = useDemoStore((s) => s.setPausedProfile);

  const user = demoCurrentUser;
  const displayName = session?.displayName ?? user.displayName;
  const identityApproved = verification?.level2?.status === 'APPROVED';
  const endorsed = verification?.level3?.status === 'APPROVED';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <AvatarCircle name={displayName} size={64} photoUrl={myPhotoUrl} />
          <View style={{ flex: 1 }}>
            <H>
              {displayName}, {user.age}
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
          <VerificationRow
            done
            title={es.profile.verificationContact}
            sub={es.profile.verificationContactDone}
          />
          <VerificationRow
            done={identityApproved}
            level={2}
            title={es.profile.verificationIdentity}
            sub={
              identityApproved
                ? es.profile.verificationIdentityDone('12 ago')
                : es.profile.verificationIdentityPending
            }
          />
          <VerificationRow
            done={endorsed}
            level={3}
            title={es.profile.verificationChurch}
            sub={
              endorsed
                ? `Respaldado por ${verification?.level3?.church?.name ?? 'tu iglesia'}`
                : es.profile.verificationChurchHint
            }
            action={
              endorsed ? undefined : (
                <Button
                  label={es.profile.obtain}
                  small
                  onPress={() => router.push('/perfil/verificacion')}
                />
              )
            }
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

        <ListRow
          label={es.onboarding.photosTitle}
          hint="Entre 2 y 6 fotos, todas moderadas antes de publicarse"
          onPress={() => router.push('/perfil/fotos')}
        />
        <ListRow
          label={es.discover.savedProfiles}
          hint="Perfiles que guardaste para volver a verlos"
          onPress={() => router.push('/descubrir/guardados')}
        />
        <ListRow
          label={es.discover.interestedInYou}
          hint="Quiénes marcaron interés en tu perfil"
          onPress={() => router.push('/descubrir/te-interesa')}
        />
        <ListRow
          label="Perfil destacado"
          hint="Aparece primero por 24 horas"
          onPress={() => router.push('/perfil/destacar')}
        />
        <ListRow
          label="Código promocional"
          hint="Canjea el código de tu congregación"
          onPress={() => router.push('/perfil/promo')}
        />
        <ListRow
          label={es.notifications.title}
          onPress={() => router.push('/perfil/notificaciones')}
        />
        <ListRow
          label={es.profile.searchPreferences}
          onPress={() => router.push('/perfil/preferencias')}
        />
        <ListRow label={es.visibility.title} onPress={() => router.push('/perfil/visibilidad')} />
        <ListRow
          label={es.profile.privacySecurity}
          onPress={() => router.push('/perfil/privacidad')}
        />
        <ListRow
          label={es.profile.pauseProfile}
          hint="Dejas de aparecer en Descubrir; tus conexiones se conservan"
          right={<Toggle on={paused} onChange={setPaused} label={es.profile.pauseProfile} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function VerificationRow({
  title,
  sub,
  done,
  level,
  action,
}: {
  title: string;
  sub: string;
  done?: boolean;
  level?: number;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.verificationRow}>
      <View style={[styles.levelBadge, { backgroundColor: done ? colors.olive : colors.wheat }]}>
        {done ? (
          <CheckMark size={12} />
        ) : (
          <Text style={{ color: colors.inkDeep, fontFamily: fonts.bodyBold, fontSize: 11 }}>
            {level ?? 1}
          </Text>
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
});
