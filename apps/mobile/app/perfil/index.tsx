import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LOCALE_NAMES, SUPPORTED_LOCALES, intlLocale } from '@yugo/shared';
import {
  useCurrentMember,
  useDemoStore,
  useLogout,
  useMyPhotos,
  usePauseProfile,
  useSession,
  useSubscriptionState,
  useUnreadNotifications,
  useVerificationStatus,
  useSaveLocalePreference,
} from '@yugo/app-core';
import {
  AvatarCircle,
  Button,
  Card,
  CheckMark,
  Chip,
  H,
  ListRow,
  Notice,
  ProgressBar,
  Sub,
  Toggle,
} from '../../components/ui';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { notifySignedOut } from '../../lib/api';
import { theme } from '../../lib/theme';
import { chooseLocale, useLocale } from '../../lib/locale';
import { CompleteProfileCard } from '../../components/complete-profile-card';

const { colors, fonts } = theme;

const shortDate = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat(intlLocale(), {
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Santo_Domingo',
      })
        .format(new Date(iso))
        .replace('.', '')
    : '';

const INTENTION_LABEL = {
  get MARRIAGE() {
    return es.discover.purposeMarriage;
  },
  get FRIENDSHIP() {
    return es.onboarding.intentionFriendship;
  },
  get BOTH() {
    return es.onboarding.intentionBoth;
  },
} as const;

/** Mi perfil (RF-PER-01/10): la ficha real de quien entró, no la de demostración. */
export default function ProfileScreen() {
  const locale = useLocale();
  const saveLocale = useSaveLocalePreference();
  const member = useCurrentMember();
  const { data: session } = useSession();
  const { data: verification } = useVerificationStatus();
  const { data: myPhotos = [] } = useMyPhotos();
  const pausedDemo = useDemoStore((s) => s.pausedProfile);
  const pauseProfile = usePauseProfile();
  const { data: unread = 0 } = useUnreadNotifications();
  const { data: subscription } = useSubscriptionState();
  const logout = useLogout();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const tier = subscription?.tier ?? null;
  const tierName = tier === 'ORO' ? es.paywall.oro : tier === 'PLUS' ? es.paywall.plus : null;

  // Cerrar sesión: se borra el token y después se hace lo mismo que cuando la
  // sesión se pierde sola (vaciar caché, cortar tiempo real, ir a «Entrar»).
  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      setConfirmingSignOut(false);
      notifySignedOut();
      router.replace('/entrar');
    }
  };

  const myPhotoUrl = myPhotos.find((photo) => photo.moderationStatus === 'APPROVED')?.url;
  const user = member.data;
  const displayName = user?.displayName ?? session?.displayName ?? '';
  const paused = session && !session.demo ? session.me.status === 'PAUSED' : pausedDemo;

  const contactOk = verification ? verification.level1?.status === 'APPROVED' : true;
  const identity = verification?.level2;
  const identityApproved = identity?.status === 'APPROVED';
  const endorsement = verification?.level3;
  const endorsed = endorsement?.status === 'APPROVED';
  const nextField = user?.completenessNext
    ? ((es.profile.fields as Record<string, string>)[user.completenessNext.key] ??
      user.completenessNext.key)
    : null;

  if (member.isError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Notice tone="wine" text={es.errors.generic} />
          <Button label={es.common.retry} onPress={() => void member.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <AvatarCircle name={displayName || '·'} size={64} photoUrl={myPhotoUrl} />
          <View style={{ flex: 1 }}>
            <H>
              {user
                ? user.age
                  ? `${user.displayName}, ${user.age}`
                  : user.displayName
                : es.common.loading}
            </H>
            {user ? <Sub>{[user.city, user.occupation].filter(Boolean).join(' · ')}</Sub> : null}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {user?.denomination ? <Chip label={user.denomination} tone="olive" /> : null}
              {user ? <Chip label={INTENTION_LABEL[user.intention]} tone="wheat" /> : null}
            </View>
          </View>
        </View>

        {user ? (
          <Card style={{ marginTop: 14 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowText}>{es.profile.completeness}</Text>
              <Text style={[styles.rowText, { fontFamily: fonts.bodyBold }]}>
                {user.completeness}%
              </Text>
            </View>
            <ProgressBar value={user.completeness} style={{ marginTop: 6 }} />
            <Sub style={{ fontSize: 11, marginTop: 6 }}>
              {nextField && user.completenessNext
                ? es.profile.completenessHint(nextField, user.completenessNext.targetPct)
                : es.profile.complete}
            </Sub>
          </Card>
        ) : null}

        <View style={{ marginBottom: 12 }}>
          <CompleteProfileCard />
        </View>

        <H size={15} style={{ marginBottom: 8 }}>
          {es.profile.verification}
        </H>
        <Card style={{ paddingVertical: 6 }}>
          <VerificationRow
            done={contactOk}
            level={1}
            title={es.profile.verificationContact}
            sub={
              contactOk ? es.profile.verificationContactDone : es.profile.verificationContactPending
            }
          />
          <VerificationRow
            done={identityApproved}
            level={2}
            title={es.profile.verificationIdentity}
            sub={
              identityApproved
                ? es.profile.verificationIdentityDone(shortDate(identity?.resolvedAt))
                : identity?.status === 'PENDING'
                  ? es.profile.verificationIdentityPending
                  : identity?.status === 'REJECTED'
                    ? es.profile.verificationIdentityRejected
                    : es.profile.verificationIdentityStart
            }
            action={
              identityApproved || identity?.status === 'PENDING' ? undefined : (
                <Button
                  label={es.profile.obtain}
                  small
                  onPress={() => router.push('/perfil/verificacion')}
                />
              )
            }
          />
          <VerificationRow
            done={endorsed}
            level={3}
            title={es.profile.verificationChurch}
            sub={
              endorsed
                ? es.profile.verificationChurchDone(
                    endorsement?.church?.name ?? user?.churchName ?? 'tu iglesia',
                  )
                : endorsement?.status === 'PENDING'
                  ? es.church.inReview
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

        {/* La tarjeta refleja el plan real: con uno activo lleva a gestionarlo. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(tierName ? '/perfil/suscripcion' : '/plus')}
        >
          <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.wheat }}>
                  {tierName ?? es.profile.plusOroCard}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted }}>
                  {tierName
                    ? subscription?.downgradeToTier
                      ? es.paywall.downgradeScheduled(
                          subscription.downgradeToTier === 'PLUS'
                            ? es.paywall.plus
                            : es.common.free,
                          shortDate(subscription.renewsAt),
                        )
                      : es.paywall.manageSubscription
                    : es.profile.plusOroSub}
                </Text>
              </View>
              <Chip label={tierName ? es.paywall.manageSubscription : es.common.see} tone="wheat" />
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
          label={es.accompaniment.mentorTitle}
          hint="Acompaña a una pareja de tu iglesia"
          onPress={() => router.push('/perfil/acompanar')}
        />
        <ListRow
          label={es.profile.voiceLink}
          hint={es.profile.voiceLinkHint}
          onPress={() => router.push('/perfil/voz')}
        />
        <ListRow
          label="Mi suscripción"
          hint="Nivel, recibos y cancelación"
          onPress={() => router.push('/perfil/suscripcion')}
        />
        <ListRow
          label={es.notifications.title}
          hint={unread > 0 ? (unread === 1 ? '1 sin leer' : `${unread} sin leer`) : undefined}
          onPress={() => router.push('/perfil/notificaciones')}
        />
        <ListRow
          label={es.profile.searchPreferences}
          onPress={() => router.push('/perfil/preferencias')}
        />
        <ListRow label={es.visibility.title} onPress={() => router.push('/perfil/visibilidad')} />
        <ListRow
          label={es.common.language}
          hint={LOCALE_NAMES[locale]}
          onPress={() => {
            const next = SUPPORTED_LOCALES.find((candidate) => candidate !== locale) ?? locale;
            saveLocale.mutate(next);
            // El cambio vuelve a montar la navegación; se regresa a Perfil
            // para que la persona vea el cambio donde lo pidió.
            void chooseLocale(next).then(() => setTimeout(() => router.push('/perfil'), 0));
          }}
        />
        <ListRow
          label={es.profile.privacySecurity}
          onPress={() => router.push('/perfil/privacidad')}
        />
        <ListRow
          label={es.profile.pauseProfile}
          hint={
            paused
              ? es.profile.pausedHint
              : 'Dejas de aparecer en Descubrir; tus conexiones se conservan'
          }
          right={
            <Toggle
              on={!!paused}
              onChange={(value) => pauseProfile.mutate(value)}
              label={es.profile.pauseProfile}
            />
          }
        />
        {pauseProfile.isError ? <Notice tone="wine" text={es.errors.generic} /> : null}

        <ListRow
          label={es.profile.signOut}
          hint={es.profile.signOutConfirmBody}
          onPress={() => setConfirmingSignOut(true)}
        />
      </ScrollView>

      <ConfirmSheet
        visible={confirmingSignOut}
        title={es.profile.signOut}
        body={es.profile.signOutConfirmBody}
        confirmLabel={es.profile.signOut}
        busy={logout.isPending}
        onConfirm={() => void signOut()}
        onCancel={() => setConfirmingSignOut(false)}
      />
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
  levelBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
