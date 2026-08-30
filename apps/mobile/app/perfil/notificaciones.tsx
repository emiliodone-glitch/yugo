import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, NOTIFICATION_CATEGORIES, type NotificationCategory } from '@yugo/shared';
import {
  useNotifications,
  useNotificationSettings,
  useSetNotificationPreference,
  useSetQuietHours,
} from '@yugo/app-core';
import { Card, Chip, ScreenHeader, Segment, Sub, Toggle } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Tab = 'inbox' | 'preferences';

const CATEGORY_TONE: Record<string, 'default' | 'olive' | 'wheat' | 'wine'> = {
  CONNECTION: 'olive',
  MESSAGE: 'default',
  INTEREST: 'wheat',
  EVENT: 'default',
  GROUP: 'default',
  VERIFICATION: 'olive',
  MODERATION: 'wine',
  SUBSCRIPTION: 'wheat',
};

/** Formats a whole hour the way es-DO reads it: "10:00 pm". */
const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
    new Date(2026, 0, 1, hour, 0),
  );

/** Notification centre and per-category preferences (RF-NOT-01/02). */
export default function NotificationsScreen() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: settings } = useNotificationSettings();
  const setPreference = useSetNotificationPreference();
  const setQuietHours = useSetQuietHours();
  const [tab, setTab] = useState<Tab>('inbox');

  const quiet = settings?.quietHours ?? { enabled: true, startHour: 22, endHour: 7 };
  const pushFor = (category: NotificationCategory) =>
    settings?.preferences.find((preference) => preference.category === category)?.push ?? true;

  const shiftHour = (field: 'startHour' | 'endHour') =>
    setQuietHours.mutate({ ...quiet, [field]: (quiet[field] + 1) % 24 });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.notifications.title} />
      <ScrollView contentContainerStyle={styles.container}>
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inbox', label: 'Recibidas' },
            { value: 'preferences', label: 'Preferencias' },
          ]}
        />

        {tab === 'inbox' ? (
          isLoading ? (
            <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
          ) : notifications.length === 0 ? (
            <Card>
              <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
                No tienes notificaciones por ahora.
              </Sub>
            </Card>
          ) : (
            notifications.map((notification) => (
              // Lo no leído se marca con el borde de acento, no atenuando lo
              // leído: bajar la opacidad rompe el contraste del cuerpo.
              <Card
                key={notification.id}
                style={
                  notification.readAt
                    ? undefined
                    : { borderLeftWidth: 3, borderLeftColor: colors.wheat }
                }
              >
                <View style={styles.rowBetween}>
                  <Chip
                    label={es.notifications.categories[notification.category]}
                    tone={CATEGORY_TONE[notification.category] ?? 'default'}
                  />
                  <Sub style={{ fontSize: 11 }}>
                    {new Intl.DateTimeFormat('es-DO', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'America/Santo_Domingo',
                    }).format(new Date(notification.createdAt))}
                  </Sub>
                </View>
                <Text style={styles.title}>{notification.title}</Text>
                <Sub style={{ fontSize: 11 }}>{notification.body}</Sub>
              </Card>
            ))
          )
        ) : null}

        {tab === 'preferences' ? (
          <>
            <Card style={{ paddingVertical: 4 }}>
              {NOTIFICATION_CATEGORIES.map((category) => (
                <View key={category} style={styles.prefRow}>
                  <Text style={styles.prefLabel}>{es.notifications.categories[category]}</Text>
                  <Toggle
                    on={pushFor(category)}
                    onChange={(value) =>
                      setPreference.mutate({ category, push: value, email: false })
                    }
                    label={es.notifications.categories[category]}
                  />
                </View>
              ))}
            </Card>

            {/* RF-NOT-02: nothing pushes inside this window; it waits for it to close. */}
            <Card>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.prefLabel}>{es.notifications.quietHours}</Text>
                  <Sub style={{ fontSize: 11 }}>
                    {hourLabel(quiet.startHour)} – {hourLabel(quiet.endHour)}
                  </Sub>
                </View>
                <Toggle
                  on={quiet.enabled}
                  onChange={(value) => setQuietHours.mutate({ ...quiet, enabled: value })}
                  label={es.notifications.quietHours}
                />
              </View>

              {quiet.enabled ? (
                <View style={styles.hourRow}>
                  <Chip
                    label={`Desde ${hourLabel(quiet.startHour)}`}
                    onPress={() => shiftHour('startHour')}
                  />
                  <Chip
                    label={`Hasta ${hourLabel(quiet.endHour)}`}
                    onPress={() => shiftHour('endHour')}
                  />
                </View>
              ) : null}

              <Sub style={{ fontSize: 11, marginTop: 10 }}>
                Durante el horario silencioso no te llegan notificaciones al teléfono. Las guardamos
                y te las entregamos al terminar.
              </Sub>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text, marginTop: 8 },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  prefLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  hourRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
