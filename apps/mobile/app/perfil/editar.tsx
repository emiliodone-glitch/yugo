import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ATTENDANCE_OPTIONS,
  CITIES,
  DENOMINATIONS,
  es,
  LIMITS,
  SERVICE_AREAS,
  type ProfileUpdateInput,
} from '@yugo/shared';
import { useCurrentMember, useMyProfile, useUpdateProfile } from '@yugo/app-core';
import { Button, Card, Chip, Field, H, Notice, ScreenHeader, Sub } from '../../components/ui';
import { errorMessage, getApiClient } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Attendance = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'OCCASIONAL';
type Intention = 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';
type Openness = 'SAME' | 'AFFINE' | 'ALL';

interface Draft {
  displayName: string;
  city: string;
  occupation: string;
  denomination: string | null;
  churchFreeText: string;
  yearsInFaith: string;
  attendance: Attendance | null;
  intention: Intention | null;
  openness: Openness | null;
  testimony: string;
  verse: string;
  practices: string[];
}

/**
 * Completa tu perfil (RF-PER-01/10): lo que el registro corto dejó para
 * después, todo opcional, en una sola pantalla.
 */
export default function EditProfileScreen() {
  const profile = useMyProfile();
  const member = useCurrentMember();
  const update = useUpdateProfile();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En modo demo no hay perfil completo en la API: se parte de la ficha del
  // miembro actual para que la pantalla se pueda recorrer igual.
  useEffect(() => {
    if (draft || profile.data || profile.isLoading || !member.data) return;
    const m = member.data;
    setDraft({
      displayName: m.displayName,
      city: m.city ?? '',
      occupation: m.occupation ?? '',
      denomination: DENOMINATIONS.find((item) => item.name === m.denomination)?.slug ?? null,
      churchFreeText: m.churchName ?? '',
      yearsInFaith: '',
      attendance: null,
      intention: m.intention,
      openness: null,
      testimony: m.testimony ?? '',
      verse: m.verse ?? '',
      practices: [],
    });
  }, [draft, profile.data, profile.isLoading, member.data]);

  useEffect(() => {
    if (draft || !profile.data) return;
    const p = profile.data;
    setDraft({
      displayName: p.displayName ?? '',
      city: p.city ?? '',
      occupation: p.occupation ?? '',
      denomination: p.denomination?.slug ?? null,
      churchFreeText: p.church?.name ?? p.churchFreeText ?? '',
      yearsInFaith: p.yearsInFaith != null ? String(p.yearsInFaith) : '',
      attendance: (p.attendance as Attendance | null) ?? null,
      intention: p.intention,
      openness: p.openness,
      testimony: p.testimony ?? '',
      verse: p.verse ?? '',
      practices: (p.serviceAreas ?? []).map((item) => item.serviceArea.slug),
    });
  }, [profile.data, draft]);

  const patch = (partial: Partial<Draft>) => {
    setSaved(false);
    setDraft((current) => (current ? { ...current, ...partial } : current));
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    try {
      let denominationId: string | undefined;
      if (draft.denomination) {
        const denominations = await getApiClient()
          .catalog.denominations()
          .catch(() => []);
        denominationId = denominations.find((item) => item.slug === draft.denomination)?.id;
      }
      const input: ProfileUpdateInput = {
        displayName: draft.displayName.trim() || undefined,
        city: draft.city.trim() || undefined,
        occupation: draft.occupation.trim(),
        denominationId,
        churchFreeText: draft.churchFreeText.trim(),
        yearsInFaith: draft.yearsInFaith ? Number(draft.yearsInFaith) : undefined,
        attendance: draft.attendance ?? undefined,
        intention: draft.intention ?? undefined,
        openness: draft.openness ?? undefined,
        testimony: draft.testimony.trim(),
        verse: draft.verse.trim(),
        practiceSlugs: draft.practices,
      };
      await update.mutateAsync(input);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  if (!draft) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.profile.editTitle} />
        <View style={styles.container}>
          {profile.isError ? (
            <>
              <Notice tone="wine" text={es.errors.generic} />
              <Button label={es.common.retry} onPress={() => void profile.refetch()} />
            </>
          ) : (
            <Sub>{es.common.loading}</Sub>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const cityKnown = CITIES.some((item) => item.name === draft.city);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.editTitle} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Sub style={{ marginBottom: 10 }}>{es.profile.editSub}</Sub>

        <H size={15} style={{ marginBottom: 8 }}>
          {es.profile.editBasics}
        </H>
        <Card>
          <Text style={styles.label}>{es.onboarding.displayName}</Text>
          <Field
            value={draft.displayName}
            onChangeText={(value) => patch({ displayName: value })}
            maxLength={40}
          />
          <Text style={styles.label}>{es.onboarding.cityLabel}</Text>
          <View style={styles.chipWrap}>
            {CITIES.map((item) => (
              <Pressable key={item.name} onPress={() => patch({ city: item.name })}>
                <Chip label={item.name} tone={draft.city === item.name ? 'olive' : 'default'} />
              </Pressable>
            ))}
          </View>
          {!cityKnown ? (
            <Field
              value={draft.city}
              onChangeText={(value) => patch({ city: value })}
              placeholder={es.onboarding.cityOther}
              maxLength={80}
            />
          ) : null}
          <Text style={styles.label}>
            {es.profile.fields.occupation.charAt(0).toUpperCase() +
              es.profile.fields.occupation.slice(1)}
          </Text>
          <Field
            value={draft.occupation}
            onChangeText={(value) => patch({ occupation: value })}
            maxLength={80}
          />
        </Card>

        <H size={15} style={{ marginBottom: 8, marginTop: 14 }}>
          {es.profile.editFaith}
        </H>
        <Card>
          <Text style={styles.label}>{es.onboarding.denomination}</Text>
          <View style={styles.chipWrap}>
            {DENOMINATIONS.map((item) => (
              <Pressable
                key={item.slug}
                onPress={() =>
                  patch({ denomination: draft.denomination === item.slug ? null : item.slug })
                }
              >
                <Chip
                  label={item.name}
                  tone={draft.denomination === item.slug ? 'olive' : 'default'}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{es.onboarding.church}</Text>
          <Field
            value={draft.churchFreeText}
            onChangeText={(value) => patch({ churchFreeText: value })}
            placeholder={es.onboarding.churchFreeText}
            maxLength={120}
          />
          <Text style={styles.label}>{es.onboarding.yearsInFaith}</Text>
          <Field
            value={draft.yearsInFaith}
            onChangeText={(value) => patch({ yearsInFaith: value.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.label}>{es.onboarding.attendance}</Text>
          <View style={styles.chipWrap}>
            {ATTENDANCE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => patch({ attendance: option.value as Attendance })}
              >
                <Chip
                  label={option.label}
                  tone={draft.attendance === option.value ? 'olive' : 'default'}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{es.onboarding.intentionTitle}</Text>
          <View style={styles.chipWrap}>
            {(
              [
                ['MARRIAGE', es.onboarding.intentionMarriage],
                ['FRIENDSHIP', es.onboarding.intentionFriendship],
                ['BOTH', es.onboarding.intentionBoth],
              ] as const
            ).map(([value, label]) => (
              <Pressable key={value} onPress={() => patch({ intention: value })}>
                <Chip label={label} tone={draft.intention === value ? 'olive' : 'default'} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{es.onboarding.opennessTitle}</Text>
          <View style={styles.chipWrap}>
            {(
              [
                ['SAME', es.onboarding.opennessSame],
                ['AFFINE', es.onboarding.opennessAffine],
                ['ALL', es.onboarding.opennessAll],
              ] as const
            ).map(([value, label]) => (
              <Pressable key={value} onPress={() => patch({ openness: value })}>
                <Chip label={label} tone={draft.openness === value ? 'olive' : 'default'} />
              </Pressable>
            ))}
          </View>
        </Card>

        <H size={15} style={{ marginBottom: 8, marginTop: 14 }}>
          {es.profile.editStory}
        </H>
        <Card>
          <Text style={styles.label}>{es.onboarding.testimonyTitle}</Text>
          <Sub style={{ fontSize: 11, marginBottom: 6 }}>{es.onboarding.testimonySub}</Sub>
          <TextInput
            style={styles.textarea}
            multiline
            maxLength={LIMITS.TESTIMONY_MAX}
            value={draft.testimony}
            onChangeText={(value) => patch({ testimony: value })}
          />
          <Sub style={{ fontSize: 11, textAlign: 'right' }}>
            {draft.testimony.length}/{LIMITS.TESTIMONY_MAX}
          </Sub>
          <Text style={styles.label}>{es.onboarding.verse}</Text>
          <Field
            value={draft.verse}
            onChangeText={(value) => patch({ verse: value })}
            placeholder="Rut 1:16"
            maxLength={120}
          />
          <Text style={styles.label}>{es.onboarding.practicesTitle}</Text>
          <Sub style={{ fontSize: 11, marginBottom: 6 }}>{es.onboarding.practicesSub}</Sub>
          <View style={styles.chipWrap}>
            {SERVICE_AREAS.map((area) => {
              const active = draft.practices.includes(area.slug);
              return (
                <Pressable
                  key={area.slug}
                  onPress={() =>
                    patch({
                      practices: active
                        ? draft.practices.filter((slug) => slug !== area.slug)
                        : [...draft.practices, area.slug],
                    })
                  }
                >
                  <Chip label={area.name} tone={active ? 'olive' : 'default'} />
                </Pressable>
              );
            })}
          </View>
        </Card>

        {error ? <Notice tone="wine" text={error} /> : null}
        <Button
          label={
            update.isPending
              ? es.common.loading
              : saved
                ? `${es.profile.editSaved} ✓`
                : es.common.save
          }
          tone="olive"
          disabled={update.isPending}
          onPress={() => void save()}
          style={{ marginTop: 14 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 32 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
});
