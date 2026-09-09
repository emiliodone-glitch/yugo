import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, intlLocale } from '@yugo/shared';
import { calendarUrl, useCheckIn, useEventDetail, useSetAttendance } from '@yugo/app-core';
import { AvatarCircle, Button, Card, Chip, Notice, ScreenHeader, Sub } from '../../components/ui';
import { EventCover } from '../../components/event-cover';
import { QueryErrorCard } from '../../components/query-error-card';
import { directionsUrl } from '../../lib/maps';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** Event detail with attendance, connections attending, ticket and check-in. */
export default function EventDetailScreen() {
  const { id, ci } = useLocalSearchParams<{ id: string; ci?: string }>();
  const eventId = id ?? '';
  const { data: event, isLoading, isError, error, refetch } = useEventDetail(eventId);
  const setAttendance = useSetAttendance();
  const checkIn = useCheckIn();
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);

  // Llegó por el enlace del QR de la entrada: se registra sin más toques.
  useEffect(() => {
    if (!ci || checkIn.isPending || checkIn.isSuccess) return;
    checkIn
      .mutateAsync(ci)
      .then(() => setCheckInNotice('¡Asistencia registrada! Que sea una bendición.'))
      .catch(() => setCheckInNotice('No pudimos registrar tu asistencia con ese enlace.'));
  }, [ci, checkIn]);

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.tabs.events} />
        <View style={{ paddingHorizontal: 18 }}>
          <QueryErrorCard error={error} onRetry={() => void refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !event) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.tabs.events} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>
          {isLoading ? es.common.loading : es.events.notFound}
        </Sub>
      </SafeAreaView>
    );
  }

  // Lo que se pinta es lo que dijo el servidor (o la demo, a través del hook).
  const mine = event.myStatus;
  const dateLabel = new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(event.startsAt));

  // Lleno es lleno: ningún plan agranda el salón.
  const full = event.capacity !== undefined && (event.openSeats ?? 0) === 0;

  const setStatus = (status: 'GOING' | 'INTERESTED' | null) =>
    setAttendance.mutate({
      eventId: event.id,
      status:
        status !== null && (mine === status || (status === 'GOING' && mine === 'WAITLIST'))
          ? null
          : status,
    });

  /** RF-EVE-08: the device opens the .ics the API serves. */
  const addToCalendar = () => {
    const url = calendarUrl(event.id);
    if (url !== '#') void Linking.openURL(url);
  };

  const directions = directionsUrl(event);
  const openDirections = () => {
    if (directions) void Linking.openURL(directions);
  };

  const share = () =>
    Share.share({
      message: `${event.title} · ${event.churchName}\n${dateLabel}\nTe invito a acompañarme en Yugo.`,
    });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.tabs.events} />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <EventCover type={event.type} imageUrl={event.imageUrl} height={120} />
          <View style={{ padding: 14 }}>
            <View style={styles.rowBetween}>
              <Chip label={event.typeName} tone="wine" />
              <Sub style={{ fontSize: 11 }}>{event.costLabel}</Sub>
            </View>
            <Text style={styles.title}>{event.title}</Text>
            <Sub style={{ textTransform: 'capitalize', marginTop: 4 }}>{dateLabel}</Sub>
            <Sub style={{ fontSize: 11, marginTop: 4 }}>
              {event.churchName} · {event.address ?? event.city}
              {event.distanceKm !== undefined ? ` · ${event.distanceKm} km` : ''}
            </Sub>

            {event.audience === 'SINGLES' ? (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <Chip label={es.events.singlesBadge} tone="wheat" />
              </View>
            ) : null}

            {/* El cupo, con honestidad: lo que queda ya descuenta lo reservado. */}
            {event.capacity !== undefined ? (
              <Sub style={{ fontSize: 11.5, marginTop: 8 }}>
                {full ? es.events.full : es.events.seatsLeft(event.openSeats ?? 0)}
                {event.waitlistCount ? ` · ${es.events.waitlistCount(event.waitlistCount)}` : ''}
              </Sub>
            ) : null}

            <View style={[styles.row, { marginTop: 14 }]}>
              <Button
                label={es.events.interested}
                tone={mine === 'INTERESTED' ? 'olive' : 'ghost'}
                style={{ flex: 1 }}
                disabled={setAttendance.isPending}
                onPress={() => setStatus('INTERESTED')}
              />
              <Button
                label={
                  mine === 'GOING'
                    ? es.events.goingMarked
                    : full && mine !== 'WAITLIST'
                      ? es.events.joinWaitlist
                      : es.events.going
                }
                tone="olive"
                style={{ flex: 1 }}
                disabled={setAttendance.isPending}
                onPress={() => setStatus('GOING')}
              />
            </View>
            {mine === 'GOING' || mine === 'WAITLIST' ? (
              <Button
                label={es.events.notGoing}
                tone="ghost"
                small
                style={{ alignSelf: 'center', marginTop: 8, borderWidth: 0 }}
                disabled={setAttendance.isPending}
                onPress={() => setStatus(null)}
              />
            ) : null}
            {mine === 'WAITLIST' ? (
              <Sub style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>
                {es.events.waitlistExplained}
              </Sub>
            ) : mine === 'GOING' ? (
              <Sub style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>
                {es.events.reminder}
              </Sub>
            ) : null}
          </View>
        </Card>

        {/* La entrada personal (RF-EVE-06): solo existe cuando va a asistir. */}
        {mine === 'GOING' ? (
          <Card>
            <Text style={styles.sectionTitle}>{es.events.ticketTitle}</Text>
            <Sub style={{ fontSize: 11, marginTop: 4, marginBottom: 10 }}>
              {es.events.ticketHint}
            </Sub>
            <Button
              label={es.events.ticketOpen}
              tone="ink"
              onPress={() =>
                router.push({ pathname: '/eventos/[id]/entrada', params: { id: event.id } })
              }
            />
          </Card>
        ) : null}

        {/* Connections attending, honouring their privacy setting (RF-EVE-05) */}
        {event.connectionsGoing.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>
              {es.home.connectionsGoing(event.connectionsGoing.length)}
            </Text>
            <View style={styles.connections}>
              {event.connectionsGoing.map((connection) => (
                <View key={connection.userId} style={{ alignItems: 'center' }}>
                  <AvatarCircle name={connection.displayName} size={46} />
                  <Sub style={{ fontSize: 11, marginTop: 4 }}>{connection.displayName}</Sub>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.rowText}>Asistirán</Text>
            <Text style={styles.rowValue}>{event.goingCount}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={styles.rowText}>{es.events.interested}</Text>
            <Text style={styles.rowValue}>{event.interestedCount}</Text>
          </View>
        </Card>

        {/* Dónde (RF-EVE-03): la app de mapas del teléfono lleva hasta allá. */}
        <Card>
          <Text style={styles.sectionTitle}>{es.events.mapTitle}</Text>
          <Sub style={{ fontSize: 11.5, marginTop: 4 }}>
            {event.address ?? event.city}
            {event.address && event.city ? ` · ${event.city}` : ''}
          </Sub>
          {directions ? (
            <Button
              label={es.common.openInMaps}
              tone="ghost"
              small
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
              onPress={openDirections}
            />
          ) : (
            <Sub style={{ fontSize: 11, marginTop: 8 }}>{es.events.mapUnavailable}</Sub>
          )}
        </Card>

        {/* Check-in (RF-EVE-06): el QR está en la entrada; la app lo lee. */}
        {checkInNotice ? (
          <Notice tone={checkIn.isSuccess ? 'olive' : 'wine'} text={checkInNotice} />
        ) : null}
        {mine === 'GOING' && !checkIn.isSuccess ? (
          <Card>
            <Text style={styles.rowText}>{es.events.checkIn}</Text>
            <Sub style={{ fontSize: 11, marginTop: 4, marginBottom: 10 }}>
              Al llegar, escanea el QR de la entrada. La iglesia solo ve el total de asistentes,
              nunca tu nombre.
            </Sub>
            <Button
              label="Registrar mi asistencia"
              tone="olive"
              onPress={() =>
                router.push({ pathname: '/eventos/escanear', params: { eventId: event.id } })
              }
            />
          </Card>
        ) : null}

        <View style={styles.row}>
          <Button
            label={es.events.addToCalendar}
            tone="ghost"
            style={{ flex: 1 }}
            onPress={addToCalendar}
          />
          <Button label={es.events.share} tone="ghost" style={{ flex: 1 }} onPress={share} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  connections: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  rowText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
});
