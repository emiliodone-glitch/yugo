import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { es, LIMITS } from '@yugo/shared';
import { useCurrentMember } from '@yugo/app-core';
import { Button, Card, Chip, ProgressBar, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * «Completa tu perfil» (RF-PER-10): barra, cuánto falta para aparecer en
 * Descubrir y el siguiente paso con su valor. Desaparece al 100 %.
 */
export function CompleteProfileCard({ compact = false }: { compact?: boolean }) {
  const { data: user } = useCurrentMember();
  if (!user || user.completeness >= 100) return null;

  const hidden = user.completeness < LIMITS.MIN_COMPLETENESS_FOR_DISCOVER;
  const nextKey = user.completenessNext?.key ?? null;
  const nextLabel = nextKey
    ? ((es.profile.fields as Record<string, string>)[nextKey] ?? nextKey)
    : null;
  const target = nextKey === 'photos' ? '/perfil/fotos' : '/perfil/editar';

  return (
    <Card
      style={hidden ? { backgroundColor: colors.wheatSoft, borderColor: colors.wheat } : undefined}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{es.profile.completeCardTitle(user.completeness)}</Text>
        <Button
          label={es.profile.completeCardCta}
          tone="olive"
          small
          onPress={() => router.push(target)}
        />
      </View>
      <ProgressBar value={Math.max(user.completeness, 2)} style={{ marginTop: 8 }} />
      <Sub style={{ fontSize: 11.5, marginTop: 8, color: hidden ? colors.wheatText : undefined }}>
        {hidden ? es.profile.completeCardHidden : es.profile.completeCardVisible}
        {nextLabel && user.completenessNext
          ? ` ${es.profile.completenessHint(nextLabel, user.completenessNext.targetPct)}`
          : ''}
      </Sub>
      {!compact ? (
        <View style={styles.chips}>
          <Pressable onPress={() => router.push('/perfil/fotos')}>
            <Chip label={es.onboarding.nextPhotos} />
          </Pressable>
          <Pressable onPress={() => router.push('/perfil/verificacion')}>
            <Chip label={es.onboarding.nextVerify} />
          </Pressable>
          <Pressable onPress={() => router.push('/perfil/editar')}>
            <Chip label={es.onboarding.nextComplete} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});
