import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { calendarUrl, useDemoStore, useEventDetail, useSetAttendance } from '@yugo/app-core';
import {
  AvatarCircle,
  Button,
  Card,
  Chip,
  QrCode,
  ScreenHeader,
  Sub,
} from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** Event detail with attendance, connections attending and QR check-in. */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event, isLoading } = useEventDetail(eventId);
  const setAttendance = useSetAttendance();
  const eventStatus = useDemoStore((s) => s.eventStatus);
  const [showQr, setShowQr] = useState(false);

  if (isLoading || !event) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.tabs.events} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>
          {isLoading ? es.common.loading : 'Este evento ya no está disponible.'}
        </Sub>
      </SafeAreaView>
    );
  }

  const mine = eventStatus[event.id];
  const dateLabel = new Intl.DateTimeFormat('es-DO', {
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

  const setStatus = (status: 'GOING' | 'INTERESTED') =>
    setAttendance.mutate({
      eventId: event.id,
      status: mine === status || (status === 'GOING' && mine === 'WAITLIST') ? null : status,
    });

  /** RF-EVE-08: the device opens the .ics the API serves. */
  const addToCalendar = () => {
    const url = calendarUrl(event.id);
    if (url !== '#') Linking.openURL(url);
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
          <View style={styles.banner} />
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
                onPress={() => setStatus('GOING')}
              />
            </View>
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

        {/* QR check-in (RF-EVE-06) */}
        {mine === 'GOING' ? (
          <Card style={{ alignItems: 'center' }}>
            {showQr ? (
              <>
                <View style={styles.qrFrame}>
                  <QrCode value={event.id} />
                </View>
                <Sub style={{ textAlign: 'center', fontSize: 11, marginTop: 10 }}>
                  Muestra este código en la entrada para registrar tu asistencia.
                </Sub>
              </>
            ) : (
              <Button label={es.events.checkIn} tone="ghost" onPress={() => setShowQr(true)} />
            )}
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
  banner: { height: 104, backgroundColor: colors.wine },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  connections: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  rowText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
  qrFrame: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 8 },
});
