import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useConnections, useSafetyTips, useWhoMarkedMe } from '@yugo/app-core';
import { AvatarCircle, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function ConnectionsScreen() {
  const { data: connections = [], isLoading } = useConnections();
  const { data: whoMarkedMe } = useWhoMarkedMe();
  const { data: tips } = useSafetyTips();

  const fresh = connections.filter((connection) => connection.isNew);
  const conversations = connections.filter((connection) => !connection.isNew);

  const openChat = (conversationId: string) =>
    router.push({ pathname: '/chat/[id]', params: { id: conversationId } });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.connections.title}</H>
          <Chip
            label={es.discover.interestedCount(whoMarkedMe?.count ?? 0)}
            tone="wheat"
            onPress={() => router.push('/descubrir/te-interesa')}
          />
        </View>

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.common.loading}</Sub>
        ) : null}

        {fresh.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>{es.connections.newSection}</Text>
            <View style={styles.freshRow}>
              {fresh.map((connection) => (
                <Pressable
                  key={connection.matchId}
                  style={{ alignItems: 'center' }}
                  onPress={() => openChat(connection.conversationId ?? connection.matchId)}
                >
                  <AvatarCircle name={connection.otherUser.displayName} size={46} highlight />
                  <Sub style={{ marginTop: 4, fontSize: 11 }}>
                    {connection.otherUser.displayName}
                  </Sub>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {conversations.length > 0 ? (
          <Text style={styles.sectionLabel}>{es.connections.conversations}</Text>
        ) : null}
        {conversations.map((connection) => (
          <Pressable
            key={connection.matchId}
            style={styles.row}
            onPress={() => openChat(connection.conversationId ?? connection.matchId)}
          >
            <AvatarCircle name={connection.otherUser.displayName} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{connection.otherUser.displayName}</Text>
              <Sub numberOfLines={1}>
                {connection.lastMessage
                  ? `${connection.lastMessage.mine ? 'Tú: ' : ''}${connection.lastMessage.body}`
                  : es.connections.newConnectionToday}
              </Sub>
            </View>
            {connection.unreadCount > 0 ? <View style={styles.unread} /> : null}
          </Pressable>
        ))}

        {!isLoading && connections.length === 0 ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
              Todavía no tienes conexiones. Cuando dos personas marcan interés, se abre la
              conversación.
            </Sub>
          </Card>
        ) : null}

        {/* Safety tips before a first meeting (RF-SEG-06) */}
        <Card style={{ backgroundColor: colors.oliveSoft, borderWidth: 0, marginTop: 14 }}>
          <Text style={styles.safetyTitle}>
            {tips?.firstConnection.title ?? es.connections.safetyTitle}
          </Text>
          {(tips?.firstConnection.points ?? [es.connections.safetyBody]).map((point) => (
            <Text key={point} style={styles.safetyBody}>
              · {point}
            </Text>
          ))}
        </Card>
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
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.muted,
    marginBottom: 6,
    marginTop: 6,
  },
  freshRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.wine },
  safetyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.oliveText,
    marginBottom: 4,
  },
  safetyBody: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.oliveText,
    lineHeight: 16,
    marginTop: 4,
  },
});
