import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { Button, Field, Notice, YugoMark } from '../components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/** RF-AUT-05: password recovery by email or SMS with a one-time code. */
export default function PasswordResetScreen() {
  const [stage, setStage] = useState<'request' | 'reset' | 'done'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (stage === 'request') {
        if (!DEMO_MODE) await getApiClient().auth.requestPasswordReset(identifier);
        setStage('reset');
      } else {
        if (!DEMO_MODE) await getApiClient().auth.resetPassword(identifier, code, newPassword);
        setStage('done');
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YugoMark size={48} />

        {stage === 'done' ? (
          <>
            <Text style={styles.title}>Contraseña actualizada</Text>
            <Text style={styles.sub}>
              Cerramos tus otras sesiones por seguridad. Vuelve a entrar con tu nueva contraseña.
            </Text>
            <Button label="Entrar" tone="wheat" onPress={() => router.replace('/entrar')} />
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {stage === 'request' ? 'Recuperar mi contraseña' : es.onboarding.otpTitle}
            </Text>
            <Text style={styles.sub}>
              {stage === 'request'
                ? 'Te enviaremos un código a tu correo o teléfono.'
                : es.onboarding.otpSub(identifier)}
            </Text>

            {stage === 'request' ? (
              <Field
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Correo o teléfono"
                keyboardType="email-address"
              />
            ) : (
              <>
                <Field
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
                  placeholder="······"
                  keyboardType="number-pad"
                  maxLength={6}
                  centered
                  style={{ marginBottom: 10 }}
                />
                <Field
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nueva contraseña"
                  secureTextEntry
                />
              </>
            )}

            {error ? <Notice tone="wine" text={error} /> : null}

            <Button
              label={busy ? es.common.loading : es.common.continue}
              tone="wheat"
              disabled={busy}
              style={{ marginTop: 16 }}
              onPress={submit}
            />
          </>
        )}

        <Pressable onPress={() => router.replace('/entrar')} style={{ marginTop: 22 }}>
          <Text style={styles.link}>Volver a entrar</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 22 },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 26, marginTop: 18 },
  sub: {
    color: colors.inkMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 18,
  },
  link: {
    textAlign: 'center',
    color: colors.inkMuted2,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
