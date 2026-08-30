import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LIMITS } from '@yugo/shared';
import { useExportData, useSafetyTips } from '@yugo/app-core';
import { Button, Card, ListRow, Notice, ScreenHeader, Sub, Toggle } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/**
 * Privacidad y seguridad: privacy controls (RF-SEG-07), safety tips
 * (RF-SEG-06) and the Ley 172-13 rights — export and delete (RF-SEG-08).
 */
export default function PrivacySecurityScreen() {
  const { data: tips } = useSafetyTips();
  const exportData = useExportData();
  const [hideDistance, setHideDistance] = useState(false);
  const [hideEventPresence, setHideEventPresence] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const confirmDelete = () =>
    Alert.alert(es.profile.deleteAccount, es.profile.deleteGrace, [
      { text: es.common.cancel, style: 'cancel' },
      {
        text: es.common.confirm,
        style: 'destructive',
        onPress: () => setDeleteRequested(true),
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.privacySecurity} />
      <ScrollView contentContainerStyle={styles.container}>
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
              onChange={setHideDistance}
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
              onChange={setHideEventPresence}
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
            label={exportData.isSuccess ? 'Preparando tu descarga…' : 'Descargar mis datos'}
            tone="ghost"
            style={{ marginTop: 12 }}
            disabled={exportData.isPending}
            onPress={() => exportData.mutate()}
          />
          {exportData.isSuccess ? (
            <Sub style={{ fontSize: 11, marginTop: 8 }}>
              Te avisaremos por correo cuando la copia esté lista. El enlace vence en 24 horas.
            </Sub>
          ) : null}
        </Card>

        <Card style={{ borderColor: colors.wine, borderWidth: 1.5 }}>
          <Text style={[styles.rowText, { color: colors.wine }]}>{es.profile.deleteAccount}</Text>
          <Sub style={{ fontSize: 11, marginTop: 4 }}>
            Tu perfil deja de ser visible de inmediato. Tienes {LIMITS.DELETION_GRACE_DAYS} días para
            arrepentirte: si vuelves a entrar antes, se cancela la eliminación.
          </Sub>
          {deleteRequested ? (
            <Notice tone="wine" text={es.profile.deleteGrace} />
          ) : (
            <Button
              label={es.profile.deleteAccount}
              tone="ghost"
              style={{ marginTop: 12, borderColor: colors.wine }}
              onPress={confirmDelete}
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
