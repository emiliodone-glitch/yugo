import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, intlLocale } from '@yugo/shared';
import { useCancelSubscription, useMyPayments, useSubscriptionState } from '@yugo/app-core';
import { Button, Card, Chip, Notice, ScreenHeader, Sub } from '../../components/ui';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const PLAN: Record<string, string> = {
  MONTHLY: 'mensual',
  QUARTERLY: 'trimestral',
  ANNUAL: 'anual',
};
const PROVIDER: Record<string, string> = {
  STRIPE: 'Tarjeta',
  AZUL: 'Azul',
  APP_STORE: 'App Store',
  GOOGLE_PLAY: 'Google Play',
  PROMO: 'Código promocional',
};
const STATUS: Record<string, string> = {
  SUCCEEDED: 'Pagado',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
  REFUND_REQUESTED: 'Reembolso en revisión',
  REFUNDED: 'Reembolsado',
};
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(intlLocale()) : '—');

/** Mi suscripción (RF-PLU-05/07): nivel, hasta cuándo, recibos y cancelar. */
export default function SubscriptionScreen() {
  const { data: subscription, refetch } = useSubscriptionState();
  const payments = useMyPayments();
  const cancel = useCancelSubscription();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const tier = subscription?.tier ?? null;
  const paid = tier === 'PLUS' || tier === 'ORO';
  const canceled = !!subscription?.canceledAt;
  const storeManaged =
    subscription?.channel === 'APP_STORE' || subscription?.channel === 'GOOGLE_PLAY';

  const cancelNow = async () => {
    try {
      const result = await cancel.mutateAsync();
      setNotice(`Suscripción cancelada. Conservas el acceso hasta el ${date(result.accessUntil)}.`);
      void refetch();
    } catch (caught) {
      setNotice(errorMessage(caught));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Mi suscripción" />
      <ScrollView contentContainerStyle={styles.container}>
        {notice ? <Notice tone="olive" text={notice} /> : null}

        <Card>
          <Text style={styles.eyebrow}>NIVEL ACTUAL</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.tier}>
              {tier === 'ORO' ? 'Yugo Oro' : tier === 'PLUS' ? 'Yugo Plus' : 'Gratuito'}
            </Text>
            {paid && subscription?.plan ? <Chip label={PLAN[subscription.plan] ?? ''} /> : null}
          </View>
          <Sub style={{ fontSize: 12, marginTop: 6 }}>
            {paid
              ? canceled
                ? `Cancelada: conservas el acceso hasta el ${date(subscription?.renewsAt)}.`
                : subscription?.downgradeToTier
                  ? `Pasas a ${subscription.downgradeToTier === 'PLUS' ? 'Plus' : 'gratuito'} el ${date(subscription?.renewsAt)}.`
                  : `Acceso hasta el ${date(subscription?.renewsAt)}. No se renueva sola: te avisamos antes de que termine.`
              : 'Grupos, eventos, devocional y oración son gratis siempre. Plus y Oro añaden intereses ilimitados, modo invisible y más.'}
          </Sub>
          <Button
            label={paid ? 'Cambiar de nivel' : 'Ver Plus y Oro'}
            tone="ink"
            small
            style={{ marginTop: 12 }}
            onPress={() => router.push('/plus')}
          />
          {paid && !canceled && !storeManaged ? (
            <Button
              label="Cancelar suscripción"
              tone="ghost"
              small
              style={{ marginTop: 8 }}
              disabled={cancel.isPending}
              onPress={() => setConfirming(true)}
            />
          ) : null}
          {storeManaged ? (
            <Sub style={{ fontSize: 11, marginTop: 8 }}>
              Esta suscripción se gestiona desde la tienda de tu teléfono: allí puedes cancelarla.
            </Sub>
          ) : null}
        </Card>

        <Text style={styles.section}>Recibos</Text>
        {payments.isLoading ? (
          <Sub>{es.common.loading}</Sub>
        ) : (payments.data ?? []).length === 0 ? (
          <Card>
            <Sub>Todavía no hay pagos.</Sub>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {(payments.data ?? []).map((payment) => (
              <View key={payment.id} style={styles.receipt}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptTitle}>
                    Yugo {payment.tier === 'ORO' ? 'Oro' : payment.tier === 'PLUS' ? 'Plus' : ''}
                    {payment.plan ? ` · ${PLAN[payment.plan]}` : ''}
                  </Text>
                  <Sub style={{ fontSize: 11 }}>
                    {date(payment.createdAt)} · {PROVIDER[payment.provider] ?? payment.provider}
                  </Sub>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.receiptTitle}>
                    {payment.currency === 'DOP' ? 'RD$' : 'US$'}{' '}
                    {payment.amount.toLocaleString(intlLocale())}
                  </Text>
                  <Sub style={{ fontSize: 11 }}>{STATUS[payment.status] ?? payment.status}</Sub>
                </View>
              </View>
            ))}
          </Card>
        )}
        <Sub style={{ fontSize: 11, marginTop: 8 }}>
          Cada recibo también llega a tu correo. Para un reembolso, escríbenos: lo revisan dos
          personas del equipo.
        </Sub>
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title={`¿Cancelar ${tier === 'ORO' ? 'Oro' : 'Plus'}?`}
        body={`Conservas todo hasta el ${date(subscription?.renewsAt)}. Después vuelves al nivel gratuito: tus conexiones, grupos y eventos se quedan contigo.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Seguir suscrito"
        destructive
        busy={cancel.isPending}
        onConfirm={() => void cancelNow()}
        onCancel={() => setConfirming(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.olive,
    marginBottom: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tier: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  section: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 8,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  receiptTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
