import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_PRICES, es, LIMITS } from '@yugo/shared';
import { Button, CheckMark, Chip } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

export default function PaywallScreen() {
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [selected, setSelected] = useState<'PLUS' | 'ORO'>('ORO');

  const price = (tier: 'PLUS' | 'ORO') => {
    const value = DEFAULT_PRICES[tier][cycle].DOP;
    return `RD$ ${value.toLocaleString('es-DO')} / ${cycle === 'ANNUAL' ? 'año' : 'mes'}`;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <View style={styles.rowBetween}>
          <Chip label={es.paywall.limitReached} tone="inverse" />
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.inkMuted2, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{es.paywall.chooseLevel}</Text>
        <Text style={styles.sub}>{es.paywall.usedInterests(LIMITS.DAILY_INTERESTS_FREE)}</Text>

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
          style={[styles.tierCard, styles.oroCard, selected === 'ORO' ? { borderColor: colors.wheat } : null]}
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
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>
            {es.paywall.allOfPlus}
          </Text>
          {es.paywall.oroFeatures.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckMark size={13} color={colors.wheat} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Pressable>

        <Button
          label={selected === 'ORO' ? es.paywall.continueOro : es.paywall.continuePlus}
          tone="wheat"
          style={{ marginTop: 18 }}
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
  sub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.inkMuted, marginVertical: 10 },
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
  oroCard: { borderWidth: 1.5, borderColor: 'rgba(224,178,90,.5)', backgroundColor: 'rgba(224,178,90,.12)' },
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
  featureText: { fontFamily: fonts.body, fontSize: 12, color: '#fff', flexShrink: 1, lineHeight: 16 },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted2,
    marginTop: 8,
  },
});
