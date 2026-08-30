import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useRedeemChurchCode, useVerificationStatus } from '@yugo/app-core';
import {
  Button,
  Card,
  CheckMark,
  Field,
  Notice,
  ScreenHeader,
  Sub,
} from '../../components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const GESTURE_LABELS: Record<string, string> = {
  SMILE: 'Sonríe',
  TURN_LEFT: 'Gira la cabeza a la izquierda',
  TURN_RIGHT: 'Gira la cabeza a la derecha',
  BLINK_TWICE: 'Parpadea dos veces',
  LOOK_UP: 'Mira hacia arriba',
};

/** Verificación en tres niveles (RF-VER-01/02/03/04). */
export default function VerificationScreen() {
  const { data: status, isLoading } = useVerificationStatus();
  const redeemCode = useRedeemChurchCode();

  const [selfieStage, setSelfieStage] = useState<'idle' | 'guided' | 'submitted'>('idle');
  const [gestures, setGestures] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = status?.level2;
  const endorsement = status?.level3;

  const startSelfie = async () => {
    setError(null);
    try {
      if (DEMO_MODE) {
        setGestures(['SMILE', 'TURN_LEFT']);
      } else {
        const started = await getApiClient().verification.startSelfie();
        setGestures(started.gestures);
      }
      setSelfieStage('guided');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const submitSelfie = async () => {
    setError(null);
    try {
      if (!DEMO_MODE) {
        const started = await getApiClient().verification.startSelfie();
        await getApiClient().verification.submitSelfie(started.uploadKey, true);
      }
      setSelfieStage('submitted');
      setNotice('Recibimos tu selfie. Te avisaremos cuando el equipo la revise.');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const submitCode = async () => {
    setError(null);
    try {
      const result = await redeemCode.mutateAsync(code);
      setNotice(`¡Listo! Tu perfil muestra “Respaldado por ${result.endorsedBy}”.`);
      setCode('');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.verification} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {isLoading ? (
            <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
          ) : null}
          {notice ? <Notice text={notice} /> : null}
          {error ? <Notice tone="wine" text={error} /> : null}

          {/* Nivel 1 — contacto */}
          <Card>
            <View style={styles.levelRow}>
              <View style={[styles.badge, { backgroundColor: colors.olive }]}>
                <CheckMark size={12} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>Nivel 1 · {es.profile.verificationContact}</Text>
                <Sub style={{ fontSize: 11 }}>{es.profile.verificationContactDone}</Sub>
              </View>
            </View>
          </Card>

          {/* Nivel 2 — identidad con selfie guiada (RF-VER-01) */}
          <Card>
            <View style={styles.levelRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: identity?.status === 'APPROVED' ? colors.olive : colors.linen2 },
                ]}
              >
                {identity?.status === 'APPROVED' ? (
                  <CheckMark size={12} />
                ) : (
                  <Text style={styles.badgeText}>2</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>Nivel 2 · {es.profile.verificationIdentity}</Text>
                <Sub style={{ fontSize: 11 }}>
                  {identity?.status === 'APPROVED'
                    ? 'Tu identidad está verificada.'
                    : identity?.status === 'PENDING'
                      ? es.profile.verificationIdentityPending
                      : 'Toma una selfie en vivo siguiendo los gestos que te pidamos.'}
                </Sub>
              </View>
            </View>

            {identity?.status !== 'APPROVED' && selfieStage === 'idle' ? (
              <Button
                label="Comenzar verificación con selfie"
                tone="olive"
                style={{ marginTop: 12 }}
                onPress={startSelfie}
              />
            ) : null}

            {selfieStage === 'guided' ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.selfieFrame}>
                  <View style={styles.selfieOval} />
                </View>
                <View style={styles.gestures}>
                  <Text style={styles.gesturesTitle}>Sigue estos gestos:</Text>
                  {gestures.map((gesture, index) => (
                    <Text key={gesture} style={styles.gestureItem}>
                      {index + 1}. {GESTURE_LABELS[gesture] ?? gesture}
                    </Text>
                  ))}
                </View>
                <Sub style={{ fontSize: 11, marginTop: 8 }}>
                  Busca buena luz, sin lentes ni gorra. Tu selfie solo la ve el equipo de
                  verificación; nunca se muestra en tu perfil.
                </Sub>
                <Button
                  label="Enviar selfie"
                  tone="olive"
                  style={{ marginTop: 12 }}
                  onPress={submitSelfie}
                />
              </View>
            ) : null}
          </Card>

          {/* Nivel 3 — respaldo de iglesia (RF-VER-02/03) */}
          <Card>
            <View style={styles.levelRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      endorsement?.status === 'APPROVED' ? colors.olive : colors.wheat,
                  },
                ]}
              >
                {endorsement?.status === 'APPROVED' ? (
                  <CheckMark size={12} />
                ) : (
                  <Text style={styles.badgeText}>3</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>Nivel 3 · {es.profile.verificationChurch}</Text>
                <Sub style={{ fontSize: 11 }}>
                  {endorsement?.status === 'APPROVED'
                    ? `Respaldado por ${endorsement.church?.name ?? 'tu iglesia'}.`
                    : es.profile.verificationChurchHint}
                </Sub>
              </View>
            </View>

            {endorsement?.status !== 'APPROVED' ? (
              <>
                <Text style={styles.fieldLabel}>{es.profile.enterChurchCode}</Text>
                <Field
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  placeholder="SION-XXXX"
                  autoCapitalize="characters"
                  maxLength={40}
                  centered
                />
                <Button
                  label={redeemCode.isPending ? es.common.loading : 'Validar código'}
                  tone="olive"
                  small
                  disabled={redeemCode.isPending || code.trim().length < 4}
                  style={{ marginTop: 10, alignSelf: 'flex-start' }}
                  onPress={submitCode}
                />

                <View style={styles.divider} />

                <Text style={styles.fieldLabel}>{es.profile.leaderEmail}</Text>
                <Field
                  value={leaderEmail}
                  onChangeText={setLeaderEmail}
                  placeholder="pastor@iglesia.do"
                  keyboardType="email-address"
                />
                <Button
                  label={es.profile.requestLeader}
                  tone="ghost"
                  small
                  disabled={!leaderEmail.includes('@')}
                  style={{ marginTop: 10, alignSelf: 'flex-start' }}
                  onPress={() =>
                    setNotice('Enviamos la solicitud a tu líder. Te avisaremos cuando responda.')
                  }
                />
              </>
            ) : null}
          </Card>

          <Sub style={{ textAlign: 'center', fontSize: 11 }}>
            Las insignias se muestran en Descubrir, en tu perfil y en el chat (RF-VER-04).
          </Sub>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkDeep },
  levelTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  selfieFrame: {
    height: 210,
    borderRadius: 16,
    backgroundColor: '#AFA694',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieOval: {
    width: 120,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,.6)',
    borderStyle: 'dashed',
  },
  gestures: {
    backgroundColor: colors.wheatSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  gesturesTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.wheatText },
  gestureItem: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.wheatText,
    marginTop: 4,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 14,
    marginBottom: 6,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 16 },
});
