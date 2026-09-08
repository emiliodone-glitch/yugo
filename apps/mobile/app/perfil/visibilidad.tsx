import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CITIES, es, LIMITS } from '@yugo/shared';
import {
  useCurrentMember,
  useSetInvisibleMode,
  useSetOroBadge,
  useSetTravelMode,
  useSubscriptionState,
  useUpdatePreferences,
  useWhoViewedMe,
} from '@yugo/app-core';
import { Button, Card, Chip, H, Notice, ScreenHeader, Sub, Toggle } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');

const TRAVEL_DAYS = [7, 14, 30];

/**
 * Visibilidad y búsqueda: the mutual age rule (never a toggle), invisible
 * mode, travel mode, who viewed me and the Oro badge, all against the
 * member's real subscription and preferences.
 */
export default function VisibilityScreen() {
  const member = useCurrentMember();
  const { data: subscription } = useSubscriptionState();
  const setInvisible = useSetInvisibleMode();
  const setOroBadge = useSetOroBadge();
  const setTravel = useSetTravelMode();
  const savePrefs = useUpdatePreferences();
  const whoViewed = useWhoViewedMe();

  const invisible = subscription?.invisibleMode ?? false;
  const isOro = subscription?.tier === 'ORO';
  const travel = subscription?.travelMode ?? null;
  const showOroBadge = subscription?.showOroBadge ?? false;

  const [ageMin, setAgeMin] = useState(LIMITS.ADULT_AGE + 4);
  const [ageMax, setAgeMax] = useState(LIMITS.ADULT_AGE + 16);
  const [seeded, setSeeded] = useState(false);
  const [savedRange, setSavedRange] = useState(false);
  const [travelCity, setTravelCity] = useState(CITIES[0].name);
  const [travelDays, setTravelDays] = useState(14);

  useEffect(() => {
    if (seeded || !member.data) return;
    setAgeMin(member.data.ageMin);
    setAgeMax(member.data.ageMax);
    setSeeded(true);
  }, [member.data, seeded]);

  const dirty = !!member.data && (ageMin !== member.data.ageMin || ageMax !== member.data.ageMax);
  const stepMin = (delta: number) =>
    setAgeMin((value) =>
      Math.max(LIMITS.ADULT_AGE, Math.min(value + delta, ageMax - LIMITS.AGE_RANGE_MIN_SPAN)),
    );
  const stepMax = (delta: number) =>
    setAgeMax((value) => Math.min(99, Math.max(value + delta, ageMin + LIMITS.AGE_RANGE_MIN_SPAN)));

  const saveRange = async () => {
    setSavedRange(false);
    try {
      await savePrefs.mutateAsync({ ageMin, ageMax });
      setSavedRange(true);
    } catch {
      // savePrefs.error is rendered below
    }
  };

  const toggleTravel = (on: boolean) => {
    if (!on) {
      setTravel.mutate(null);
      return;
    }
    const city = CITIES.find((item) => item.name === travelCity) ?? CITIES[0];
    setTravel.mutate({ city: city.name, lat: city.lat, lng: city.lng, days: travelDays });
  };

  const failed =
    savePrefs.isError || setInvisible.isError || setOroBadge.isError || setTravel.isError;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.visibility.title} />
      <ScrollView contentContainerStyle={styles.container}>
        {failed ? <Notice tone="wine" text={es.errors.generic} /> : null}

        {/* The mutual age rule is never a toggle (RF-DES-11). */}
        <View style={styles.sectionRow}>
          <H size={15}>{es.visibility.ageRange}</H>
          <Chip label={es.visibility.mandatory} />
        </View>
        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.text}>{es.visibility.wantToMeet}</Text>
            <Text style={[styles.text, { fontFamily: fonts.bodyBold }]}>
              {es.onboarding.ageRangeValue(ageMin, ageMax)}
            </Text>
          </View>
          <View style={styles.stepperRow}>
            <Stepper label="Mínima" value={ageMin} onStep={stepMin} />
            <Stepper label="Máxima" value={ageMax} onStep={stepMax} />
          </View>
          <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.visibility.ageRuleHelp}</Sub>
          {dirty ? (
            <Button
              label={savePrefs.isPending ? es.common.loading : es.common.save}
              tone="olive"
              small
              disabled={savePrefs.isPending}
              onPress={() => void saveRange()}
              style={{ marginTop: 10 }}
            />
          ) : savedRange ? (
            <Sub style={{ fontSize: 11, marginTop: 8, color: colors.oliveText }}>
              {es.profile.savedPreferences}
            </Sub>
          ) : null}
        </Card>

        <View style={styles.sectionRow}>
          <H size={15}>{es.visibility.invisibleMode}</H>
          <Chip label={es.visibility.oroChip} tone="wheat" />
        </View>
        <Card style={{ padding: 12, borderWidth: 1.5, borderColor: colors.wheat }}>
          <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.text}>
                {invisible ? es.visibility.invisibleOn : 'Desactivado'}
              </Text>
              <Sub style={{ fontSize: 11 }}>{es.visibility.invisibleHelp}</Sub>
              {!isOro ? (
                <Sub style={{ fontSize: 11, color: colors.wheatText }}>
                  {es.visibility.oroOnlyHint}
                </Sub>
              ) : null}
            </View>
            <Toggle
              on={invisible}
              disabled={!isOro}
              onChange={(value) => setInvisible.mutate(value)}
              label={es.visibility.invisibleMode}
            />
          </View>
        </Card>

        <View style={styles.sectionRow}>
          <H size={15}>{es.visibility.travelMode}</H>
          <Chip label={es.visibility.oroChip} tone="wheat" />
        </View>
        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{es.visibility.travelSearch}</Text>
              <Sub style={{ fontSize: 11 }}>
                {travel
                  ? es.visibility.travelActive(
                      travel.city,
                      travel.activeUntil ? shortDate(travel.activeUntil) : '—',
                    )
                  : es.visibility.travelOff}
              </Sub>
              {!isOro ? (
                <Sub style={{ fontSize: 11, color: colors.wheatText }}>
                  {es.visibility.oroOnlyHint}
                </Sub>
              ) : null}
            </View>
            <Toggle
              on={!!travel}
              disabled={!isOro}
              onChange={toggleTravel}
              label={es.visibility.travelMode}
            />
          </View>
          {isOro && !travel ? (
            <View style={{ marginTop: 10 }}>
              <Sub style={{ fontSize: 11, marginBottom: 4 }}>{es.visibility.travelPick}</Sub>
              <View style={styles.chipRow}>
                {CITIES.map((city) => (
                  <Chip
                    key={city.name}
                    label={city.name}
                    tone={travelCity === city.name ? 'olive' : 'default'}
                    style={{ marginTop: 6 }}
                    onPress={() => setTravelCity(city.name)}
                  />
                ))}
              </View>
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                {TRAVEL_DAYS.map((days) => (
                  <Chip
                    key={days}
                    label={es.visibility.travelDays(days)}
                    tone={travelDays === days ? 'olive' : 'default'}
                    style={{ marginTop: 6 }}
                    onPress={() => setTravelDays(days)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </Card>

        <Pressable
          onPress={() => (whoViewed.data?.available ? undefined : router.push('/plus'))}
          accessibilityRole="button"
        >
          <Card style={{ padding: 12 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.text}>{es.visibility.whoViewedMe}</Text>
              {whoViewed.data?.available ? (
                <Text style={[styles.text, { fontFamily: fonts.bodyBold }]}>
                  {whoViewed.data.count}
                </Text>
              ) : (
                <Chip label={es.visibility.whoViewedOroOnly} tone="wheat" />
              )}
            </View>
          </Card>
        </Pressable>

        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.text}>{es.visibility.showOroBadge}</Text>
              {!isOro ? (
                <Sub style={{ fontSize: 11, color: colors.wheatText }}>
                  {es.visibility.oroOnlyHint}
                </Sub>
              ) : null}
            </View>
            <Toggle
              on={showOroBadge}
              disabled={!isOro}
              onChange={(value) => setOroBadge.mutate(value)}
              label={es.visibility.showOroBadge}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Two big buttons beat a slider on a phone for a number that moves by one. */
function Stepper({
  label,
  value,
  onStep,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Sub style={{ fontSize: 11, marginBottom: 4 }}>{label}</Sub>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepButton}
          onPress={() => onStep(-1)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: menos`}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          style={styles.stepButton}
          onPress={() => onStep(1)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: más`}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  stepperRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepButton: { paddingHorizontal: 14, paddingVertical: 8 },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  stepValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
