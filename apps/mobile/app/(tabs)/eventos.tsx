import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_TIMEZONE, es, intlLocale, type EventSummary } from '@yugo/shared';
import { useEvents, useSetAttendance } from '@yugo/app-core';
import { AvatarCircle, Button, Card, Chip, H, Sub } from '../../components/ui';
import { EventCover } from '../../components/event-cover';
import { QueryErrorCard } from '../../components/query-error-card';
import { theme } from '../../lib/theme';
import { CardSkeleton } from '../../components/skeleton';

const { colors, fonts } = theme;

function dayParts(iso: string) {
  const date = new Date(iso);
  // Events happen in the Dominican Republic; the detail screen and the shared
  // helpers already format in APP_TIMEZONE. Without it, a phone set to another
  // zone showed "SÁB" here and "viernes" on the detail for the same event.
  const timeZone = APP_TIMEZONE;
  return {
    weekday: new Intl.DateTimeFormat(intlLocale(), { weekday: 'short', timeZone })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
    day: new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', timeZone }).format(date),
    time: new Intl.DateTimeFormat(intlLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date),
  };
}

const TYPE_TONE: Record<string, 'wine' | 'olive' | 'wheat' | 'default'> = {
  VIGILIA: 'wine',
  SERVICIO_COMUNITARIO: 'olive',
  CONCIERTO: 'wheat',
  RETIRO: 'olive',
};

export default function EventsScreen() {
  const { data: events = [], isLoading, isError, error, refetch } = useEvents();
  const setAttendance = useSetAttendance();

  // «Asistiré» va y vuelve: tocarlo con la asistencia marcada la quita. Lo que
  // se pinta es `myStatus`, que viene del servidor (o de la demo por el hook).
  const toggleGoing = (event: EventSummary) =>
    setAttendance.mutate({
      eventId: event.id,
      status: event.myStatus === 'GOING' || event.myStatus === 'WAITLIST' ? null : 'GOING',
    });
  const toggleInterested = (event: EventSummary) =>
    setAttendance.mutate({
      eventId: event.id,
      status: event.myStatus === 'INTERESTED' ? null : 'INTERESTED',
    });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.events.title}</H>
          <Chip label={es.events.thisWeek} />
        </View>

        {isError ? <QueryErrorCard error={error} onRetry={() => void refetch()} /> : null}
        {isLoading ? <CardSkeleton lines={2} /> : null}

        {events.map((event) => {
          const parts = dayParts(event.startsAt);
          const mine = event.myStatus;
          return (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/eventos/[id]', params: { id: event.id } })}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <EventCover type={event.type} imageUrl={event.imageUrl} height={64} />
                <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
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
                    <View style={[styles.rowBetween, { marginTop: 8 }]}>
                      {event.connectionsGoing.length > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {event.connectionsGoing.slice(0, 2).map((connection, index) => (
                            <View
                              key={connection.userId}
                              style={{ marginLeft: index > 0 ? -8 : 0 }}
                            >
                              <AvatarCircle name={connection.displayName} size={22} />
                            </View>
                          ))}
                          <Sub style={{ fontSize: 11, marginLeft: 6 }}>
                            {es.events.connectionsGoing(event.connectionsGoing.length)}
                          </Sub>
                        </View>
                      ) : (
                        <Sub style={{ fontSize: 11 }}>
                          {es.events.interestedCount(event.interestedCount)}
                        </Sub>
                      )}
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {mine === 'GOING' || mine === 'WAITLIST' ? (
                          <Button
                            label={es.events.notGoing}
                            tone="ghost"
                            small
                            disabled={setAttendance.isPending}
                            onPress={() => toggleGoing(event)}
                          />
                        ) : (
                          <Button
                            label={es.events.interested}
                            tone={mine === 'INTERESTED' ? 'olive' : 'ghost'}
                            small
                            disabled={setAttendance.isPending}
                            onPress={() => toggleInterested(event)}
                          />
                        )}
                        {mine === 'GOING' ? (
                          <Chip label={es.events.goingMarked} tone="olive" />
                        ) : mine === 'WAITLIST' ? (
                          <Chip label={es.events.waitlistCount(1)} tone="wheat" />
                        ) : (
                          <Button
                            label={es.events.going}
                            tone="olive"
                            small
                            disabled={setAttendance.isPending}
                            onPress={() => toggleGoing(event)}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {!isLoading && !isError && events.length === 0 ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
              No hay eventos publicados cerca de ti esta semana.
            </Sub>
          </Card>
        ) : null}

        <Sub style={{ textAlign: 'center', paddingVertical: 8, fontSize: 11 }}>
          {es.events.reminder}
        </Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayNumber: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text, marginTop: 4 },
});
