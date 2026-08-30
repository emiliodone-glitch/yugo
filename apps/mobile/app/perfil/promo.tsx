import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useRedeemPromo } from '@yugo/app-core';
import { Button, Card, Field, Notice, ScreenHeader, Sub } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** RF-PLU-04: promotional codes and trials for allied congregations. */
export default function PromoCodeScreen() {
  const redeem = useRedeemPromo();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tier: string; trialDays: number } | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const result = await redeem.mutateAsync(code);
      setSuccess({ tier: result.tier, trialDays: result.trialDays });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setError(
        message === 'invalid_promo_code'
          ? 'El código promocional no es válido.'
          : errorMessage(caught),
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Código promocional" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {success ? (
            <Card style={{ backgroundColor: colors.oliveSoft, borderWidth: 0 }}>
              <Text style={styles.successTitle}>
                ¡Listo! Tienes Yugo {success.tier} por {success.trialDays} días
              </Text>
              <Sub style={{ fontSize: 11, color: colors.oliveText, marginTop: 4 }}>
                Al terminar la prueba tu cuenta vuelve al nivel gratuito. No se te cobrará nada.
              </Sub>
            </Card>
          ) : (
            <>
              <Sub style={{ marginBottom: 12 }}>
                Si tu congregación es aliada de Yugo, es posible que te hayan dado un código para
                probar Plus u Oro sin costo.
              </Sub>
              <Card>
                <Field
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  placeholder="CÓDIGO"
                  autoCapitalize="characters"
                  maxLength={40}
                  centered
                />
                {error ? <Notice tone="wine" text={error} /> : null}
                <Button
                  label={redeem.isPending ? es.common.loading : 'Canjear código'}
                  tone="olive"
                  style={{ marginTop: 12 }}
                  disabled={redeem.isPending || code.trim().length < 3}
                  onPress={submit}
                />
              </Card>
              <Sub style={{ textAlign: 'center', fontSize: 11 }}>
                Solo puedes usar un código promocional y no mientras tengas una suscripción activa.
              </Sub>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  successTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.oliveText },
});
