import { router } from 'expo-router';
import { Platform } from 'react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_PRICES, es, LIMITS, intlLocale } from '@yugo/shared';
import { usePrices, usePurchaseSubscription, useSubscriptionState } from '@yugo/app-core';
import { Button, CheckMark, Chip, Notice } from '../components/ui';
import { errorMessage } from '../lib/api';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

export default function PaywallScreen() {
  const { data: prices = DEFAULT_PRICES } = usePrices();
  const { data: subscription } = useSubscriptionState();
  const purchase = usePurchaseSubscription();
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [selected, setSelected] = useState<'PLUS' | 'ORO'>('ORO');
  const [error, setError] = useState<string | null>(null);

  const currentTier = subscription?.tier ?? null;
  const tierLabel = (tier: 'PLUS' | 'ORO' | 'FREE' | null | undefined) =>
    tier === 'ORO' ? es.paywall.oro : tier === 'PLUS' ? es.paywall.plus : es.common.free;
  const renewsAt = subscription?.renewsAt
    ? new Date(subscription.renewsAt).toLocaleDateString(intlLocale())
    : '';

  const price = (tier: 'PLUS' | 'ORO') => {
    const value = prices[tier][cycle].DOP;
    return `RD$ ${value.toLocaleString(intlLocale())} / ${cycle === 'ANNUAL' ? 'año' : 'mes'}`;
  };

  /**
   * Store billing is mandatory for in-app purchases on iOS and Android, so the
   * receipt provider is the store; the API validates it (RF-PLU-02).
   */
  const buy = async () => {
    setError(null);
    try {
      await purchase.mutateAsync({
        tier: selected,
        plan: cycle,
        channel: Platform.OS === 'ios' ? 'APP_STORE' : 'GOOGLE_PLAY',
        currency: 'DOP',
      });
      router.replace('/perfil/suscripcion');
    } catch (caught) {
      const message = errorMessage(caught);
      setError(
        /receipt_required|not_configured|stub_only/.test(message)
          ? 'La compra dentro de la app todavía no está activa en las tiendas. Mientras tanto puedes suscribirte desde la web de Yugo con tu misma cuenta.'
          : message,
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={styles.rowBetween}>
          <Chip
            label={
              currentTier ? es.paywall.currentTier(tierLabel(currentTier)) : es.paywall.limitReached
            }
            tone="inverse"
          />
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={{ color: colors.inkMuted2, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{es.paywall.chooseLevel}</Text>
        <Text style={styles.sub}>
          {currentTier
            ? subscription?.downgradeToTier !== undefined && subscription?.downgradeToTier !== null
              ? es.paywall.downgradeScheduled(tierLabel(subscription.downgradeToTier), renewsAt)
              : es.paywall.currentTier(tierLabel(currentTier))
            : es.paywall.usedInterests(LIMITS.DAILY_INTERESTS_FREE)}
        </Text>
        {currentTier ? (
          <Button
            label={es.paywall.manageSubscription}
            tone="ghost-light"
            small
            style={{ alignSelf: 'flex-start', marginBottom: 12 }}
            onPress={() => router.push('/perfil/suscripcion')}
          />
        ) : null}

        <View style={styles.segment}>
          {(
            [
              ['MONTHLY', es.paywall.monthly],
              ['ANNUAL', es.paywall.annualSave],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              style={[styles.segmentItem, cycle === value ? styles.segmentActive : null]}
              onPress={() => setCycle(value)}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemiBold,
                  fontSize: 12,
                  color: cycle === value ? colors.inkDeep : colors.inkMuted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.tierCard, selected === 'PLUS' ? styles.tierSelected : null]}
          onPress={() => setSelected('PLUS')}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.tierName}>{es.paywall.plus}</Text>
            <Text style={styles.tierPrice}>{price('PLUS')}</Text>
          </View>
          {es.paywall.plusFeatures.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckMark size={13} color={colors.wheat} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Pressable>

        <Pressable
          style={[
            styles.tierCard,
            styles.oroCard,
            selected === 'ORO' ? { borderColor: colors.wheat } : null,
          ]}
          onPress={() => setSelected('ORO')}
        >
          <View style={styles.mostChosen}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.inkDeep }}>
              {es.paywall.mostChosen}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={[styles.tierName, { color: colors.wheat }]}>{es.paywall.oro}</Text>
            <Text style={styles.tierPrice}>{price('ORO')}</Text>
          </View>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 2 }}
          >
            {es.paywall.allOfPlus}
          </Text>
          {es.paywall.oroFeatures.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckMark size={13} color={colors.wheat} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Pressable>

        {error ? <Notice tone="wine" text={error} /> : null}

        <Button
          label={
            purchase.isPending
              ? es.common.loading
              : selected === 'ORO'
                ? es.paywall.continueOro
                : es.paywall.continuePlus
          }
          tone="wheat"
          disabled={purchase.isPending}
          style={{ marginTop: 18 }}
          onPress={buy}
        />
        <Text style={styles.footer}>{es.paywall.cancelAnytime}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 24, color: '#fff', marginTop: 14 },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted,
    marginVertical: 10,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,.1)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
  segmentActive: { backgroundColor: colors.wheat },
  tierCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.22)',
    backgroundColor: 'rgba(255,255,255,.07)',
    padding: 12,
    marginBottom: 10,
  },
  tierSelected: { borderColor: 'rgba(255,255,255,.6)', backgroundColor: 'rgba(255,255,255,.12)' },
  oroCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(224,178,90,.5)',
    backgroundColor: 'rgba(224,178,90,.12)',
  },
  mostChosen: {
    position: 'absolute',
    right: 12,
    top: -10,
    backgroundColor: colors.wheat,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tierName: { fontFamily: fonts.display, fontSize: 15, color: '#fff' },
  tierPrice: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: '#fff' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#fff',
    flexShrink: 1,
    lineHeight: 16,
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted2,
    marginTop: 8,
  },
});
