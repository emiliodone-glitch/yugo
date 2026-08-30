import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es } from '@yugo/shared';
import { useDemoStore, useSetInvisibleMode, useSubscriptionState } from '@yugo/app-core';
import { Card, Chip, H, ScreenHeader, Sub, Toggle } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** Visibilidad y búsqueda: age rule, invisible mode, travel mode, Oro badge. */
export default function VisibilityScreen() {
  const { data: subscription } = useSubscriptionState();
  const setInvisible = useSetInvisibleMode();
  const { showOroBadge, setShowOroBadge, travelModeOn, setTravelMode } = useDemoStore();

  const user = demoCurrentUser;
  const invisible = subscription?.invisibleMode ?? false;
  const travel = subscription?.travelMode ?? null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.visibility.title} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* The mutual age rule is never a toggle (RF-DES-11). */}
        <View style={styles.sectionRow}>
          <H size={15}>{es.visibility.ageRange}</H>
          <Chip label={es.visibility.mandatory} />
        </View>
        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.text}>{es.visibility.wantToMeet}</Text>
            <Text style={[styles.text, { fontFamily: fonts.bodyBold }]}>
              {es.onboarding.ageRangeValue(user.ageMin, user.ageMax)}
            </Text>
          </View>
          <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.visibility.ageRuleHelp}</Sub>
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
            </View>
            <Toggle
              on={invisible}
              onChange={(value) => setInvisible.mutate(value)}
              label={es.visibility.invisibleMode}
            />
          </View>
          {invisible ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Chip label={es.visibility.visibleFor(4)} tone="olive" />
              <Chip label={es.visibility.expiresIn(212)} />
            </View>
          ) : null}
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
                  ? `${travel.city} · hasta el ${new Intl.DateTimeFormat('es-DO', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'America/Santo_Domingo',
                    }).format(new Date(travel.activeUntil))}`
                  : 'Sin viaje programado'}
              </Sub>
            </View>
            <Toggle on={travelModeOn} onChange={setTravelMode} label={es.visibility.travelMode} />
          </View>
        </Card>

        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.text}>{es.visibility.whoViewedMe}</Text>
            <Text style={[styles.text, { fontFamily: fonts.bodyBold }]}>27 ›</Text>
          </View>
        </Card>

        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.text}>{es.visibility.showOroBadge}</Text>
            <Toggle
              on={showOroBadge}
              onChange={setShowOroBadge}
              label={es.visibility.showOroBadge}
            />
          </View>
        </Card>
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
    marginTop: 8,
    marginBottom: 6,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
