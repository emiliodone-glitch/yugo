import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoConnections, demoDailySummary, es } from '@yugo/shared';
import { AvatarCircle, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function ConnectionsScreen() {
  const fresh = demoConnections.filter((c) => c.isNew);
  const conversations = demoConnections.filter((c) => !c.isNew);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.connections.title}</H>
          <Chip label={es.discover.interestedCount(demoDailySummary.whoMarkedInterestCount)} tone="wheat" />
        </View>

        <Text style={styles.sectionLabel}>{es.connections.newSection}</Text>
        <View style={styles.freshRow}>
          {fresh.map((connection) => (
            <Pressable
              key={connection.matchId}
              style={{ alignItems: 'center' }}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: connection.matchId } })}
            >
              <AvatarCircle name={connection.otherUser.displayName} size={46} highlight />
              <Sub style={{ marginTop: 4, fontSize: 11 }}>{connection.otherUser.displayName}</Sub>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{es.connections.conversations}</Text>
        {conversations.map((connection) => (
          <Pressable
            key={connection.matchId}
            style={styles.row}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: connection.matchId } })}
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

        <Card style={{ backgroundColor: colors.oliveSoft, borderWidth: 0, marginTop: 14 }}>
          <Text style={styles.safetyTitle}>{es.connections.safetyTitle}</Text>
          <Text style={styles.safetyBody}>{es.connections.safetyBody}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  safetyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.oliveText, marginBottom: 4 },
  safetyBody: { fontFamily: fonts.body, fontSize: 11, color: colors.oliveText, lineHeight: 16 },
});
