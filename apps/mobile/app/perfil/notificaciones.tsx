import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useNotifications } from '@yugo/app-core';
import { Card, Chip, ScreenHeader, Segment, Sub, Toggle } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Tab = 'inbox' | 'preferences';

const CATEGORIES = [
  'CONNECTION',
  'MESSAGE',
  'INTEREST',
  'EVENT',
  'GROUP',
  'VERIFICATION',
  'MODERATION',
  'SUBSCRIPTION',
] as const;

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

/** Notification centre and per-category preferences (RF-NOT-01/02). */
export default function NotificationsScreen() {
  const { data: notifications = [], isLoading } = useNotifications();
  const [tab, setTab] = useState<Tab>('inbox');
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((category) => [category, true])),
  );
  const [quietHours, setQuietHours] = useState(true);

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
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} style={notification.readAt ? { opacity: 0.7 } : undefined}>
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
              {CATEGORIES.map((category) => (
                <View key={category} style={styles.prefRow}>
                  <Text style={styles.prefLabel}>{es.notifications.categories[category]}</Text>
                  <Toggle
                    on={prefs[category]}
                    onChange={(value) => setPrefs((current) => ({ ...current, [category]: value }))}
                    label={es.notifications.categories[category]}
                  />
                </View>
              ))}
            </Card>
            <Card>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.prefLabel}>{es.notifications.quietHours}</Text>
                  <Sub style={{ fontSize: 11 }}>10:00 pm – 7:00 am</Sub>
                </View>
                <Toggle
                  on={quietHours}
                  onChange={setQuietHours}
                  label={es.notifications.quietHours}
                />
              </View>
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
});
