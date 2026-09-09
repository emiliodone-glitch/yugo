import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import {
  useMyProfile,
  useRedeemChurchCode,
  useRequestLeaderEndorsement,
  useVerificationStatus,
} from '@yugo/app-core';
import { Button, Card, CheckMark, Field, Notice, ScreenHeader, Sub } from '../../components/ui';
import { SelfieCapture } from '../../components/selfie-capture';
import { DEMO_MODE, errorMessage, getApiClient } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** Sin cámara utilizable (demo, web) la selfie se simula, como antes. */
const SIMULATE_SELFIE = DEMO_MODE || Platform.OS === 'web';

interface SelfieSession {
  gestures: string[];
  uploadKey: string | null;
  uploadUrl: string | null;
}

/** Verificación en tres niveles (RF-VER-01/02/03/04). */
export default function VerificationScreen() {
  const { data: status, isLoading } = useVerificationStatus();
  const { data: myProfile } = useMyProfile();
  const redeemCode = useRedeemChurchCode();
  const requestLeader = useRequestLeaderEndorsement();

  const [selfieStage, setSelfieStage] = useState<'idle' | 'guided' | 'submitted'>('idle');
  const [session, setSession] = useState<SelfieSession | null>(null);
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = status?.level2;
  const endorsement = status?.level3;
  const leaderRequest = status?.leaderRequest;
  const leaderPending = leaderRequest?.status === 'PENDING';

  const startSelfie = async () => {
    setError(null);
    try {
      if (SIMULATE_SELFIE) {
        setSession({ gestures: ['SMILE', 'TURN_LEFT'], uploadKey: null, uploadUrl: null });
      } else {
        const started = await getApiClient().verification.startSelfie();
        setSession({
          gestures: started.gestures,
          uploadKey: started.uploadKey,
          uploadUrl: started.uploadUrl,
        });
      }
      setSelfieStage('guided');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  /**
   * La foto va directa al almacenamiento firmado (mismo camino que las fotos
   * de perfil) y después se avisa a la API con la clave; la selfie nunca pasa
   * por nuestro servidor ni se muestra en el perfil.
   */
  const useSelfie = async (uri: string | null) => {
    setError(null);
    setUploading(true);
    try {
      if (!DEMO_MODE) {
        let current = session;
        if (!current?.uploadKey || !current.uploadUrl) {
          const started = await getApiClient().verification.startSelfie();
          current = {
            gestures: started.gestures,
            uploadKey: started.uploadKey,
            uploadUrl: started.uploadUrl,
          };
          setSession(current);
        }
        if (uri && current.uploadUrl) {
          const file = await fetch(uri);
          const blob = await file.blob();
          const upload = await fetch(current.uploadUrl, {
            method: 'PUT',
            headers: { 'content-type': 'image/jpeg' },
            body: blob,
          });
          if (!upload.ok) throw new Error('upload_failed');
        }
        await getApiClient().verification.submitSelfie(current.uploadKey as string, true);
      }
      setSelfieStage('submitted');
      setNotice('Recibimos tu selfie. Te avisaremos cuando el equipo la revise.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
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

  const churchId = myProfile?.churchId ?? (DEMO_MODE ? 'demo-church' : null);

  const submitLeaderRequest = async () => {
    setError(null);
    if (!churchId) {
      setError('Primero indica tu iglesia en tu perfil para que podamos escribirle a tu líder.');
      return;
    }
    try {
      await requestLeader.mutateAsync({
        churchId,
        leaderEmail: leaderEmail.trim(),
        leaderName: leaderName.trim() || undefined,
      });
      setNotice(es.profile.leaderRequestSent(leaderName.trim() || leaderEmail.trim()));
      setLeaderEmail('');
      setLeaderName('');
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
                  {
                    backgroundColor: identity?.status === 'APPROVED' ? colors.olive : colors.linen2,
                  },
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
                    : identity?.status === 'PENDING' || selfieStage === 'submitted'
                      ? es.profile.verificationIdentityPending
                      : 'Toma una selfie en vivo siguiendo los gestos que te pidamos.'}
                </Sub>
              </View>
            </View>

            {identity?.status !== 'APPROVED' &&
            identity?.status !== 'PENDING' &&
            selfieStage === 'idle' ? (
              <Button
                label="Comenzar verificación con selfie"
                tone="olive"
                style={{ marginTop: 12 }}
                onPress={() => void startSelfie()}
              />
            ) : null}

            {selfieStage === 'guided' && session ? (
              <View style={{ marginTop: 12 }}>
                <SelfieCapture
                  gestures={session.gestures}
                  simulate={SIMULATE_SELFIE}
                  busy={uploading}
                  onUse={(uri) => void useSelfie(uri)}
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
                  onPress={() => void submitCode()}
                />

                <View style={styles.divider} />

                {leaderPending ? (
                  <Notice
                    tone="wheat"
                    text={`${es.profile.leaderRequestPending}${
                      leaderRequest?.leaderName ? ` · ${leaderRequest.leaderName}` : ''
                    }${leaderRequest?.churchName ? ` · ${leaderRequest.churchName}` : ''}`}
                  />
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>{es.profile.leaderEmail}</Text>
                    <Field
                      value={leaderEmail}
                      onChangeText={setLeaderEmail}
                      placeholder="pastor@iglesia.do"
                      keyboardType="email-address"
                    />
                    <Field
                      value={leaderName}
                      onChangeText={setLeaderName}
                      placeholder="Nombre de tu líder (opcional)"
                      autoCapitalize="words"
                      style={{ marginTop: 8 }}
                    />
                    <Button
                      label={requestLeader.isPending ? es.common.loading : es.profile.requestLeader}
                      tone="ghost"
                      small
                      disabled={!leaderEmail.includes('@') || requestLeader.isPending}
                      style={{ marginTop: 10, alignSelf: 'flex-start' }}
                      onPress={() => void submitLeaderRequest()}
                    />
                  </>
                )}
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
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.inkDeep },
  levelTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 14,
    marginBottom: 6,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 16 },
});
