import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LIMITS } from '@yugo/shared';
import { useCurrentMember, useUpdatePreferences } from '@yugo/app-core';
import { Button, Card, Chip, Field, Notice, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Intention = 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';

/**
 * Search preferences (RF-PER-08): mandatory age range, distance, intention and
 * minimum verification level. Seeded from the member's real profile and saved
 * through the API; Discover regenerates on the next open.
 */
export default function PreferencesScreen() {
  const member = useCurrentMember();
  const save = useUpdatePreferences();
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [distance, setDistance] = useState(50);
  const [intention, setIntention] = useState<Intention>('MARRIAGE');
  const [minVerification, setMinVerification] = useState(1);
  const [seeded, setSeeded] = useState(false);
  const [saved, setSaved] = useState(false);

  // The profile arrives after the first render: seed the form once and never
  // overwrite what the person already started typing.
  useEffect(() => {
    if (seeded || !member.data) return;
    setAgeMin(String(member.data.ageMin));
    setAgeMax(String(member.data.ageMax));
    setDistance(member.data.maxDistanceKm);
    setIntention(member.data.intention);
    setMinVerification(member.data.minVerificationLevel ?? 1);
    setSeeded(true);
  }, [member.data, seeded]);

  const min = Number(ageMin) || 0;
  const max = Number(ageMax) || 0;
  const spanError = max - min < LIMITS.AGE_RANGE_MIN_SPAN;
  const underageError = min < LIMITS.ADULT_AGE;
  const canSave = seeded && !spanError && !underageError && !save.isPending;

  const submit = async () => {
    setSaved(false);
    try {
      await save.mutateAsync({
        ageMin: min,
        ageMax: max,
        maxDistanceKm: distance,
        intention,
        minVerificationLevel: minVerification,
      });
      setSaved(true);
    } catch {
      // save.error is rendered below
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.searchPreferences} />
      <ScrollView contentContainerStyle={styles.container}>
        {!seeded && member.isLoading ? <Sub>{es.common.loading}</Sub> : null}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{es.onboarding.ageRange}</Text>
          <Chip label={es.common.required} />
        </View>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.rowText}>{es.visibility.wantToMeet}</Text>
            <Text style={styles.rowValue}>{es.onboarding.ageRangeValue(min, max)}</Text>
          </View>
          <View style={styles.ageRow}>
            <View style={{ flex: 1 }}>
              <Sub style={{ fontSize: 11, marginBottom: 4 }}>Mínima</Sub>
              <Field
                value={ageMin}
                onChangeText={(value) => {
                  setSaved(false);
                  setAgeMin(value);
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Sub style={{ fontSize: 11, marginBottom: 4 }}>Máxima</Sub>
              <Field
                value={ageMax}
                onChangeText={(value) => {
                  setSaved(false);
                  setAgeMax(value);
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
          {underageError ? (
            <Notice tone="wine" text={es.errors.underage} />
          ) : spanError ? (
            <Notice tone="wine" text={es.errors.ageRangeSpan} />
          ) : (
            <Sub style={{ fontSize: 11 }}>{es.onboarding.ageRangeHelp}</Sub>
          )}
        </Card>

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.rowText}>{es.onboarding.maxDistance}</Text>
            <Text style={styles.rowValue}>{distance} km</Text>
          </View>
          <View style={styles.chipRow}>
            {[10, 25, 50, 100, 200, 300].map((value) => (
              <Chip
                key={value}
                label={`${value} km`}
                tone={distance === value ? 'olive' : 'default'}
                style={{ marginTop: 6 }}
                onPress={() => {
                  setSaved(false);
                  setDistance(value);
                }}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.rowText}>{es.onboarding.intentionTitle}</Text>
          <View style={styles.chipRow}>
            {(
              [
                ['MARRIAGE', es.onboarding.intentionMarriage],
                ['FRIENDSHIP', es.onboarding.intentionFriendship],
                ['BOTH', es.onboarding.intentionBoth],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                tone={intention === value ? 'olive' : 'default'}
                style={{ marginTop: 6 }}
                onPress={() => {
                  setSaved(false);
                  setIntention(value);
                }}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.rowText}>Nivel de verificación mínimo</Text>
          <View style={styles.chipRow}>
            {[1, 2, 3].map((level) => (
              <Chip
                key={level}
                label={`Nivel ${level}`}
                tone={minVerification === level ? 'olive' : 'default'}
                style={{ marginTop: 6 }}
                onPress={() => {
                  setSaved(false);
                  setMinVerification(level);
                }}
              />
            ))}
          </View>
        </Card>

        {save.isError ? <Notice tone="wine" text={es.errors.generic} /> : null}
        {saved ? <Notice tone="olive" text={es.profile.savedPreferences} /> : null}
        <Button
          label={saved ? 'Guardado ✓' : es.common.save}
          tone="olive"
          disabled={!canSave}
          onPress={() => void submit()}
        />
        <Sub style={{ textAlign: 'center', fontSize: 11, marginTop: 10 }}>
          Al cambiar tu rango, la lista de Descubrir se regenera.
        </Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
  ageRow: { flexDirection: 'row', gap: 12, marginVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
