import { useLocalSearchParams } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_TIMEZONE, es, intlLocale } from '@yugo/shared';
import { useEventDetail, useEventTicket, useSetAttendance } from '@yugo/app-core';
import { Button, Card, Notice, ScreenHeader, Sub } from '../../../components/ui';
import { QrCodeSvg } from '../../../components/qr-code';
import { QueryErrorCard } from '../../../components/query-error-card';
import { theme } from '../../../lib/theme';

const { colors, fonts } = theme;

const when = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso));

const checkedInWhen = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso));

/**
 * Tu entrada (RF-EVE-06): un QR de verdad con el código personal y el mismo
 * código en texto, por si quien recibe prefiere escribirlo. Si la persona
 * todavía no marcó «Asistiré», se le ofrece hacerlo aquí mismo.
 */
export default function EventTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event } = useEventDetail(eventId);
  const ticket = useEventTicket(eventId, true);
  const setAttendance = useSetAttendance();

  const notGoing =
    ticket.isError && ticket.error instanceof Error && ticket.error.message === 'not_going';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.events.ticketTitle} />
      <ScrollView contentContainerStyle={styles.container}>
        {ticket.isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.common.loading}</Sub>
        ) : notGoing ? (
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={styles.eventTitle}>{event?.title ?? ''}</Text>
            <Sub style={{ textAlign: 'center', marginTop: 6 }}>{es.events.ticketNotGoing}</Sub>
            <Button
              label={setAttendance.isPending ? es.common.loading : es.events.going}
              tone="olive"
              style={{ marginTop: 16, width: 'auto', paddingHorizontal: 24 }}
              disabled={setAttendance.isPending}
              onPress={() =>
                setAttendance.mutate(
                  { eventId, status: 'GOING' },
                  { onSuccess: () => void ticket.refetch() },
                )
              }
            />
          </Card>
        ) : ticket.isError ? (
          <QueryErrorCard error={ticket.error} onRetry={() => void ticket.refetch()} />
        ) : ticket.data ? (
          <>
            <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
              <QrCodeSvg
                value={ticket.data.code}
                size={220}
                label={`${es.events.ticketTitle}: ${ticket.data.code}`}
              />
              <Text style={styles.code} selectable>
                {ticket.data.code}
              </Text>
              <Text style={styles.eventTitle}>{ticket.data.title}</Text>
              <Sub style={{ textAlign: 'center', textTransform: 'capitalize', marginTop: 4 }}>
                {when(ticket.data.startsAt)}
              </Sub>
              {ticket.data.place ? (
                <Sub style={{ textAlign: 'center', marginTop: 2 }}>{ticket.data.place}</Sub>
              ) : null}
            </Card>
            {ticket.data.checkedInAt ? (
              <Notice
                tone="olive"
                text={es.events.ticketCheckedIn(checkedInWhen(ticket.data.checkedInAt))}
              />
            ) : (
              <Notice tone="wheat" text={es.events.ticketHint} />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  code: {
    // El código se lee y se dicta: monoespaciada del sistema, sin descargar nada.
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 20,
    letterSpacing: 2,
    color: colors.ink,
    marginTop: 14,
  },
  eventTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginTop: 10,
    textAlign: 'center',
  },
});
