import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { Button, Field, Notice, YugoMark } from '../components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/** Entrar (RF-AUT-01/02/05/07), with the 2FA step staff accounts require. */
export default function SignInScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'two-factor'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);

    if (DEMO_MODE) {
      router.replace('/(tabs)/inicio');
      return;
    }

    setBusy(true);
    try {
      if (stage === 'credentials') {
        const result = await getApiClient().auth.login(identifier, password);
        if ('twoFactorRequired' in result) {
          setIdentifier(result.identifier);
          setStage('two-factor');
          return;
        }
      } else {
        await getApiClient().auth.loginSecondFactor(identifier, code);
      }
      router.replace('/(tabs)/inicio');
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
        <Text style={styles.title}>
          {stage === 'credentials' ? 'Entra a Yugo' : es.onboarding.otpTitle}
        </Text>
        <Text style={styles.sub}>
          {stage === 'credentials'
            ? 'Usa el correo o teléfono con el que te registraste.'
            : 'Tu cuenta tiene verificación en dos pasos. Ingresa el código que te enviamos.'}
        </Text>

        {stage === 'credentials' ? (
          <>
            <Field
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Correo o teléfono"
              keyboardType="email-address"
              style={{ marginBottom: 10 }}
            />
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder={es.onboarding.password}
              secureTextEntry
            />
          </>
        ) : (
          <Field
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            placeholder="······"
            keyboardType="number-pad"
            maxLength={6}
            centered
          />
        )}

        {error ? <Notice tone="wine" text={error} /> : null}

        <Button
          label={busy ? es.common.loading : es.common.continue}
          tone="wheat"
          disabled={busy}
          style={{ marginTop: 16 }}
          onPress={submit}
        />

        <Text style={styles.hint}>
          {DEMO_MODE ? 'Modo demo: cualquier dato te deja entrar.' : es.welcome.socialHint}
        </Text>

        <View style={styles.links}>
          <Pressable onPress={() => router.push('/registro')}>
            <Text style={styles.link}>Crear mi perfil</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/recuperar')}>
            <Text style={styles.link}>Olvidé mi contraseña</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 22 },
  title: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 26,
    marginTop: 18,
  },
  sub: {
    color: colors.inkMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 18,
  },
  hint: {
    textAlign: 'center',
    color: colors.inkMuted2,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 12,
  },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 22 },
  link: {
    color: colors.inkMuted2,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
