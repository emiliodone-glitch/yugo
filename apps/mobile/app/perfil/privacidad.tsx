import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, intlLocale, LIMITS } from '@yugo/shared';
import {
  useAccountStatus,
  useDeleteAccount,
  useExportData,
  usePrivacyPreferences,
  useRestoreAccount,
  useSafetyTips,
  useSetPrivacyPreferences,
} from '@yugo/app-core';
import { Button, Card, ListRow, Notice, ScreenHeader, Sub, Toggle } from '../../components/ui';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const longDate = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

/**
 * Privacidad y seguridad: privacy controls (RF-SEG-07), safety tips
 * (RF-SEG-06) and the Ley 172-13 rights — export and delete (RF-SEG-08).
 *
 * Los interruptores leen y guardan de verdad; antes cambiaban de color y no
 * llegaban a ningún lado.
 */
export default function PrivacySecurityScreen() {
  const { data: tips } = useSafetyTips();
  const { data: prefs } = usePrivacyPreferences();
  const setPrefs = useSetPrivacyPreferences();
  const account = useAccountStatus();
  const deleteAccount = useDeleteAccount();
  const restoreAccount = useRestoreAccount();
  const exportData = useExportData();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // «Guardado» un instante después de cada cambio, y desaparece solo.
  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 1600);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  const change = (patch: { hideExactDistance?: boolean; allowEventPresenceVisible?: boolean }) => {
    setError(null);
    setPrefs.mutate(patch, {
      onSuccess: () => setSavedFlash(true),
      onError: (caught) => setError(errorMessage(caught)),
    });
  };

  const requestDeletion = async () => {
    setError(null);
    try {
      await deleteAccount.mutateAsync();
      setConfirmingDelete(false);
    } catch (caught) {
      setConfirmingDelete(false);
      setError(errorMessage(caught));
    }
  };

  const restore = async () => {
    setError(null);
    try {
      await restoreAccount.mutateAsync();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  // La copia se comparte como JSON con la hoja del sistema: la persona la
  // guarda en Archivos, se la manda por correo o la abre donde quiera.
  const exportCopy = async () => {
    setError(null);
    try {
      const result = await exportData.mutateAsync();
      await Share.share({
        title: es.profile.exportDownload,
        message: JSON.stringify(result, null, 2),
      });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const deletionPending = !!account.data?.deletionRequestedAt;
  const hideDistance = prefs?.hideExactDistance ?? false;
  const hideEventPresence = prefs ? !prefs.allowEventPresenceVisible : false;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader
        title={es.profile.privacySecurity}
        right={savedFlash ? <Sub style={{ color: colors.oliveText }}>{es.common.saved}</Sub> : null}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Notice tone="wine" text={error} /> : null}

        <Text style={styles.sectionTitle}>Visibilidad</Text>
        <Card>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Ocultar mi distancia exacta</Text>
              <Sub style={{ fontSize: 11 }}>
                Las demás personas verán un rango (“5–10 km”) en lugar del número exacto.
              </Sub>
            </View>
            <Toggle
              on={hideDistance}
              disabled={!prefs}
              onChange={(value) => change({ hideExactDistance: value })}
              label="Ocultar distancia exacta"
            />
          </View>
        </Card>
        <Card>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>Ocultar que asisto a eventos</Text>
              <Sub style={{ fontSize: 11 }}>
                Tus conexiones no verán tu nombre en la lista de asistentes.
              </Sub>
            </View>
            <Toggle
              on={hideEventPresence}
              disabled={!prefs}
              onChange={(value) => change({ allowEventPresenceVisible: !value })}
              label="Ocultar asistencia a eventos"
            />
          </View>
        </Card>
        <ListRow label={es.visibility.title} onPress={() => router.push('/perfil/visibilidad')} />

        {/* Safety tips (RF-SEG-06) */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Seguridad</Text>
        {tips ? (
          <>
            <Card style={{ backgroundColor: colors.oliveSoft, borderWidth: 0 }}>
              <Text style={[styles.rowText, { color: colors.oliveText }]}>
                {tips.firstConnection.title}
              </Text>
              {tips.firstConnection.points.map((point) => (
                <Text key={point} style={[styles.tip, { color: colors.oliveText }]}>
                  · {point}
                </Text>
              ))}
            </Card>
            <Card style={{ backgroundColor: colors.wineSoft, borderWidth: 0 }}>
              <Text style={[styles.rowText, { color: colors.wine }]}>{tips.scamWarning.title}</Text>
              {tips.scamWarning.points.map((point) => (
                <Text key={point} style={[styles.tip, { color: colors.wine }]}>
                  · {point}
                </Text>
              ))}
            </Card>
          </>
        ) : null}

        {/* Ley 172-13 (RF-SEG-08) */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Tus datos personales</Text>
        <Card>
          <Sub style={{ fontSize: 11 }}>
            La Ley 172-13 de República Dominicana te da derecho a acceder, rectificar y eliminar tus
            datos personales.
          </Sub>
          <Button
            label={
              exportData.isPending
                ? es.profile.exportPreparing
                : exportData.isSuccess
                  ? es.profile.exportReady
                  : es.profile.exportDownload
            }
            tone="ghost"
            style={{ marginTop: 12 }}
            disabled={exportData.isPending}
            onPress={() => void exportCopy()}
          />
          {exportData.isSuccess ? (
            <Sub style={{ fontSize: 11, marginTop: 8 }}>
              Se abrió la hoja para guardar o enviar tu copia. Puedes volver a pedirla cuando
              quieras.
            </Sub>
          ) : null}
        </Card>

        <Card style={{ borderColor: colors.wine, borderWidth: 1.5 }}>
          <Text style={[styles.rowText, { color: colors.wine }]}>{es.profile.deleteAccount}</Text>
          <Sub style={{ fontSize: 11, marginTop: 4 }}>
            Tu perfil deja de ser visible de inmediato. Tienes{' '}
            {account.data?.graceDays ?? LIMITS.DELETION_GRACE_DAYS} días para arrepentirte: si
            vuelves a entrar antes, se cancela la eliminación.
          </Sub>
          {deletionPending ? (
            <>
              <Notice
                tone="wine"
                text={
                  account.data?.deletesAt
                    ? es.profile.deleteScheduled(longDate(account.data.deletesAt))
                    : es.profile.deleteGrace
                }
              />
              <Button
                label={restoreAccount.isPending ? es.common.loading : es.profile.deleteCancel}
                tone="olive"
                disabled={restoreAccount.isPending}
                onPress={() => void restore()}
              />
            </>
          ) : (
            <Button
              label={es.profile.deleteAccount}
              tone="ghost"
              textColor={colors.wine}
              style={{ marginTop: 12, borderColor: colors.wine }}
              disabled={account.isLoading}
              onPress={() => setConfirmingDelete(true)}
            />
          )}
        </Card>

        <View style={styles.legalLinks}>
          {(
            [
              ['terminos', 'Términos'],
              ['privacidad', 'Política de privacidad'],
              ['pacto', 'Pacto de conducta'],
            ] as const
          ).map(([kind, label]) => (
            <Pressable
              key={kind}
              onPress={() => router.push({ pathname: '/legal/[kind]', params: { kind } })}
            >
              <Text style={styles.legalLink}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmingDelete}
        title={es.profile.deleteConfirmTitle}
        body={`${es.profile.deleteConfirmBody} ${es.profile.deleteGrace}`}
        confirmLabel={es.profile.deleteAccount}
        destructive
        busy={deleteAccount.isPending}
        onConfirm={() => void requestDeletion()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  tip: { fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 6 },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
  },
  legalLink: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
