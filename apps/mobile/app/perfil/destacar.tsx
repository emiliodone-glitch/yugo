import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LIMITS } from '@yugo/shared';
import { useActivateBoost, useBoostStatus } from '@yugo/app-core';
import { Button, Card, Notice, ProgressBar, ScreenHeader, Sub } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** RF-DES-10 "Perfil destacado": 24 h in the first positions of Descubrir. */
export default function BoostScreen() {
  const { data: status, isLoading } = useBoostStatus();
  const activate = useActivateBoost();
  const [error, setError] = useState<string | null>(null);

  const activeUntil = status?.activeUntil ? new Date(status.activeUntil) : null;
  const isFree = status?.tier === 'FREE';

  const handleActivate = async () => {
    setError(null);
    try {
      await activate.mutateAsync();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Perfil destacado" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ backgroundColor: colors.ink, borderWidth: 0 }}>
          <Text style={styles.heroTitle}>★ Aparece primero por 24 horas</Text>
          <Text style={styles.heroBody}>
            Tu perfil se muestra en las primeras posiciones de Descubrir de las personas compatibles
            contigo. La regla mutua de edad y el resto de filtros siguen aplicando.
          </Text>
        </Card>

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
        ) : isFree ? (
          <Pressable onPress={() => router.push('/plus')}>
            <Card style={{ backgroundColor: colors.wheatSoft, borderColor: colors.wheat }}>
              <Text style={styles.upsellTitle}>Destacar tu perfil es de Plus y Oro</Text>
              <Sub style={{ fontSize: 11, color: colors.wheatText, marginTop: 4 }}>
                Plus incluye {LIMITS.FEATURED_PER_WEEK_PLUS} destaque por semana; Oro incluye{' '}
                {LIMITS.FEATURED_PER_WEEK_ORO}.
              </Sub>
            </Card>
          </Pressable>
        ) : (
          <>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.rowText}>Destaques disponibles esta semana</Text>
                <Text style={styles.rowValue}>
                  {status?.remaining} / {status?.allowancePerWeek}
                </Text>
              </View>
              <ProgressBar
                value={((status?.remaining ?? 0) / (status?.allowancePerWeek || 1)) * 100}
                style={{ marginTop: 8 }}
              />
            </Card>

            {activeUntil ? (
              <Card style={{ backgroundColor: colors.wheatSoft, borderColor: colors.wheat }}>
                <Text style={styles.upsellTitle}>Tu perfil está destacado ahora</Text>
                <Sub style={{ fontSize: 11, color: colors.wheatText, marginTop: 4 }}>
                  Hasta el{' '}
                  {new Intl.DateTimeFormat('es-DO', {
                    weekday: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Santo_Domingo',
                  }).format(activeUntil)}
                  .
                </Sub>
              </Card>
            ) : (
              <Button
                label={activate.isPending ? es.common.loading : 'Destacar mi perfil ahora'}
                tone="wheat"
                disabled={activate.isPending || (status?.remaining ?? 0) <= 0}
                onPress={handleActivate}
              />
            )}

            {error ? <Notice tone="wine" text={error} /> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  heroTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.wheat },
  heroBody: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: colors.inkMuted,
    marginTop: 6,
  },
  upsellTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.wheatText },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
});
