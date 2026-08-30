import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es } from '@yugo/shared';
import { Button, Card, Chip, H, Sub } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

export default function VisibilityScreen() {
  const [invisible, setInvisible] = useState(true);
  const [travel, setTravel] = useState(true);
  const [oroBadge, setOroBadge] = useState(false);
  const user = demoCurrentUser;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Button label="‹" tone="ghost" small onPress={() => router.back()} />
          <H>{es.visibility.title}</H>
        </View>

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
              <Text style={styles.text}>{invisible ? es.visibility.invisibleOn : 'Desactivado'}</Text>
              <Sub style={{ fontSize: 11 }}>{es.visibility.invisibleHelp}</Sub>
            </View>
            <Switch
              value={invisible}
              onValueChange={setInvisible}
              trackColor={{ true: colors.olive, false: '#D5D2C8' }}
              thumbColor="#fff"
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
              <Sub style={{ fontSize: 11 }}>Nueva York, EE. UU. · hasta el 15 sep</Sub>
            </View>
            <Switch
              value={travel}
              onValueChange={setTravel}
              trackColor={{ true: colors.olive, false: '#D5D2C8' }}
              thumbColor="#fff"
            />
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
            <Switch
              value={oroBadge}
              onValueChange={setOroBadge}
              trackColor={{ true: colors.olive, false: '#D5D2C8' }}
              thumbColor="#fff"
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
