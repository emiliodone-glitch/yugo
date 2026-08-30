import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoEvents, es } from '@yugo/shared';
import { AvatarCircle, Button, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

function dayParts(iso: string) {
  const date = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat('es-DO', { weekday: 'short' }).format(date).replace('.', '').toUpperCase(),
    day: new Intl.DateTimeFormat('es-DO', { day: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date),
  };
}

const TYPE_TONE: Record<string, 'wine' | 'olive' | 'wheat' | 'default'> = {
  VIGILIA: 'wine',
  SERVICIO_COMUNITARIO: 'olive',
  CONCIERTO: 'wheat',
  RETIRO: 'olive',
};

export default function EventsScreen() {
  const [status, setStatus] = useState<Record<string, string | undefined>>({ 'ev-vigilia': 'GOING' });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.events.title}</H>
          <Chip label={es.events.thisWeek} />
        </View>

        {/* Map placeholder — react-native-maps renders the real map (RF-EVE-03) */}
        <View style={styles.map}>
          {[
            { left: '22%', top: '40%', olive: false },
            { left: '56%', top: '26%', olive: true },
            { left: '72%', top: '60%', olive: false },
            { left: '38%', top: '68%', olive: true },
          ].map((pin, index) => (
            <View
              key={index}
              style={[
                styles.pin,
                { left: pin.left as never, top: pin.top as never, backgroundColor: pin.olive ? colors.olive : colors.wine },
              ]}
            />
          ))}
          <Chip label={es.events.list} style={styles.mapChip} />
        </View>

        {demoEvents.map((event) => {
          const parts = dayParts(event.startsAt);
          const mine = status[event.id];
          return (
            <Card key={event.id} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ minWidth: 40, alignItems: 'center' }}>
                  <Sub style={{ fontSize: 11 }}>{parts.weekday}</Sub>
                  <Text style={styles.dayNumber}>{parts.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Chip label={event.typeName} tone={TYPE_TONE[event.type] ?? 'default'} />
                    <Sub style={{ fontSize: 11 }}>
                      {parts.time} · {event.costLabel}
                    </Sub>
                  </View>
                  <Text style={styles.title}>{event.title}</Text>
                  <Sub style={{ fontSize: 11 }}>
                    {event.churchName}
                    {event.distanceKm !== undefined ? ` · ${event.distanceKm} km` : ''}
                  </Sub>
                  <View style={[styles.rowBetween, { marginTop: 6 }]}>
                    {event.connectionsGoing.length > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {event.connectionsGoing.slice(0, 2).map((connection, index) => (
                          <View key={connection.userId} style={{ marginLeft: index > 0 ? -8 : 0 }}>
                            <AvatarCircle name={connection.displayName} size={22} />
                          </View>
                        ))}
                        <Sub style={{ fontSize: 11, marginLeft: 6 }}>
                          {es.events.connectionsGoing(event.connectionsGoing.length)}
                        </Sub>
                      </View>
                    ) : (
                      <Sub style={{ fontSize: 11 }}>{es.events.interestedCount(event.interestedCount)}</Sub>
                    )}
                    {mine === 'GOING' ? (
                      <Chip label={es.events.goingMarked} tone="olive" />
                    ) : (
                      <Button
                        label={es.events.going}
                        tone="olive"
                        small
                        onPress={() => setStatus((s) => ({ ...s, [event.id]: 'GOING' }))}
                      />
                    )}
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
        <Sub style={{ textAlign: 'center', paddingVertical: 8, fontSize: 11 }}>{es.events.reminder}</Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  map: {
    height: 150,
    borderRadius: 14,
    backgroundColor: '#EFECE3',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderBottomLeftRadius: 0,
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  mapChip: { position: 'absolute', right: 8, bottom: 8, backgroundColor: '#fff' },
  dayNumber: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text, marginTop: 4 },
});
