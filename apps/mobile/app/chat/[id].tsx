import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  demoConnections,
  demoCurrentUser,
  demoIcebreakers,
  demoMessages,
  es,
  type ChatMessage,
} from '@yugo/shared';
import { AvatarCircle, Button, CheckMark, Chip, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

function localModeration(body: string): ChatMessage['moderationStatus'] {
  if (/\b(dinero|deposita|transferencia|invers|préstamo)\b/i.test(body)) return 'REJECTED';
  if (/\b(whatsapp|telegram|instagram)\b/i.test(body)) return 'HELD';
  return 'APPROVED';
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const connection = demoConnections.find((c) => c.matchId === id) ?? demoConnections[0];
  const [messages, setMessages] = useState<ChatMessage[]>(demoMessages[connection.matchId] ?? []);
  const [draft, setDraft] = useState('');

  const icebreakers = demoIcebreakers[connection.matchId] ?? [
    '¿Qué es lo que más agradeces a Dios este año?',
    '¿Cuál es tu plan perfecto para un sábado libre?',
    '¿Qué canción no falta en tu playlist de adoración?',
  ];

  const send = (text: string) => {
    const body = text.trim();
    if (!body) return;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        conversationId: connection.matchId,
        senderId: demoCurrentUser.userId,
        body,
        moderationStatus: localModeration(body),
        sentAt: new Date().toISOString(),
      },
    ]);
    setDraft('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: colors.ink }}>‹</Text>
        </Pressable>
        <AvatarCircle name={connection.otherUser.displayName} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{connection.otherUser.displayName}</Text>
          {connection.otherUser.churchName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <CheckMark size={10} color={colors.olive} />
              <Sub style={{ fontSize: 11 }}>{connection.otherUser.churchName}</Sub>
            </View>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 10 }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Chip label={es.connections.newConnectionToday} tone="wheat" />
          </View>

          {messages.length <= 3 ? (
            <View style={styles.icebreakerCard}>
              <Text style={styles.icebreakerTitle}>{es.connections.icebreakers}</Text>
              {icebreakers.map((question) => (
                <Pressable key={question} style={styles.icebreaker} onPress={() => send(question)}>
                  <Text style={styles.icebreakerText}>{question}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {messages.map((message) => {
            const mine = message.senderId === demoCurrentUser.userId;
            const held = message.moderationStatus === 'HELD';
            const rejected = message.moderationStatus === 'REJECTED';
            return (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                  held ? styles.bubbleHeld : null,
                  rejected ? styles.bubbleRejected : null,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    mine && !held && !rejected ? { color: '#fff' } : null,
                    rejected ? { color: colors.wine, textDecorationLine: 'line-through' } : null,
                    held ? { color: colors.wheatText } : null,
                  ]}
                >
                  {message.body}
                </Text>
                {held ? <Sub style={{ fontSize: 10, marginTop: 2 }}>⏳ {es.connections.messageHeld}</Sub> : null}
              </View>
            );
          })}
          <Sub style={{ textAlign: 'center', marginVertical: 8, fontSize: 11 }}>
            {es.connections.chatRules}
          </Sub>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={es.connections.writeMessage}
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
          />
          <Button label={es.common.send} small onPress={() => send(draft)} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  icebreakerCard: {
    backgroundColor: colors.wheatSoft,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  icebreakerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.wheatText,
    marginBottom: 8,
  },
  icebreaker: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  icebreakerText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.text },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  bubbleHeld: { backgroundColor: colors.wheatSoft, borderWidth: 1, borderColor: colors.wheat, borderStyle: 'dashed' },
  bubbleRejected: { backgroundColor: colors.wineSoft },
  bubbleText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17, color: colors.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
});
