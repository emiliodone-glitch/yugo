import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es, LIMITS } from '@yugo/shared';
import { Button, Card, Chip, Field, Notice, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** Search preferences (RF-PER-08): mandatory age range, distance, intention. */
export default function PreferencesScreen() {
  const [ageMin, setAgeMin] = useState(String(demoCurrentUser.ageMin));
  const [ageMax, setAgeMax] = useState(String(demoCurrentUser.ageMax));
  const [distance, setDistance] = useState(demoCurrentUser.maxDistanceKm);
  const [intention, setIntention] = useState<'MARRIAGE' | 'FRIENDSHIP' | 'BOTH'>('MARRIAGE');
  const [minVerification, setMinVerification] = useState(2);
  const [saved, setSaved] = useState(false);

  const min = Number(ageMin) || 0;
  const max = Number(ageMax) || 0;
  const spanError = max - min < LIMITS.AGE_RANGE_MIN_SPAN;
  const underageError = min < LIMITS.ADULT_AGE;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.profile.searchPreferences} />
      <ScrollView contentContainerStyle={styles.container}>
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
              <Field value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" maxLength={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Sub style={{ fontSize: 11, marginBottom: 4 }}>Máxima</Sub>
              <Field value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" maxLength={2} />
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
                onPress={() => setDistance(value)}
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
                onPress={() => setIntention(value)}
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
                onPress={() => setMinVerification(level)}
              />
            ))}
          </View>
        </Card>

        <Button
          label={saved ? 'Guardado ✓' : es.common.save}
          tone="olive"
          disabled={spanError || underageError}
          onPress={() => setSaved(true)}
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
