import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import {
  useBlockUser,
  useConnections,
  useConversation,
  useCurrentUserId,
  useDisconnect,
  useEvents,
  useInviteToEvent,
  useReport,
  useSendMessage,
} from '@yugo/app-core';
import { AvatarCircle, Button, CheckMark, Chip, Notice, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Sheet = 'none' | 'options' | 'events';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? '';

  const currentUserId = useCurrentUserId();
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const { data: conversation } = useConversation(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const inviteToEvent = useInviteToEvent(conversationId);
  const { data: events = [] } = useEvents();
  const report = useReport();
  const blockUser = useBlockUser();
  const disconnect = useDisconnect();

  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<Sheet>('none');
  const [notice, setNotice] = useState<string | null>(null);

  const connection = connections.find(
    (item) => item.conversationId === conversationId || item.matchId === conversationId,
  );

  if (connectionsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
        <Sub style={{ textAlign: 'center', paddingVertical: 40 }}>{es.common.loading}</Sub>
      </SafeAreaView>
    );
  }

  if (!connection) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
        <Sub style={{ textAlign: 'center', paddingVertical: 40 }}>
          Esta conversación ya no está disponible.
        </Sub>
        <Button
          label={es.common.back}
          tone="ghost"
          style={{ alignSelf: 'center', width: 160 }}
          onPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const messages = conversation?.messages ?? [];
  const icebreakers = conversation?.icebreakers ?? [];

  const send = (text: string) => {
    const body = text.trim();
    if (!body) return;
    sendMessage.mutate(body);
    setDraft('');
  };

  const submitReport = () => {
    report.mutate({
      targetType: 'PROFILE',
      targetId: connection.otherUser.userId,
      category: 'INAPPROPRIATE',
    });
    setSheet('none');
    setNotice('Reporte enviado. El equipo de moderación lo revisará.');
  };

  const block = () => {
    blockUser.mutate(connection.otherUser.userId);
    setSheet('none');
    setNotice('Bloqueaste a esta persona. No volverán a verse en Yugo.');
  };

  const end = () => {
    disconnect.mutate(connection.matchId);
    setSheet('none');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: colors.ink }}>‹</Text>
        </Pressable>
        <AvatarCircle
          name={connection.otherUser.displayName}
          size={34}
          photoUrl={connection.otherUser.photoUrl}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{connection.otherUser.displayName}</Text>
          {connection.otherUser.churchName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <CheckMark size={10} color={colors.olive} />
              <Sub style={{ fontSize: 11 }}>{connection.otherUser.churchName}</Sub>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Opciones"
          onPress={() => setSheet('options')}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 18, color: colors.ink }}>⋯</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 10 }}>
          {notice ? <Notice text={notice} /> : null}

          {connection.isNew ? (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Chip label={es.connections.newConnectionToday} tone="wheat" />
            </View>
          ) : null}

          {messages.length <= 3 && icebreakers.length > 0 ? (
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
            const mine = message.senderId === currentUserId;
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
                {held ? (
                  <Sub style={{ fontSize: 10, marginTop: 2 }}>⏳ {es.connections.messageHeld}</Sub>
                ) : null}
                {rejected ? (
                  <Sub style={{ fontSize: 10, marginTop: 2, color: colors.wine }}>
                    {es.connections.messageRejected}
                  </Sub>
                ) : null}
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
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            maxLength={2000}
          />
          <Button label={es.common.send} small onPress={() => send(draft)} />
        </View>
      </KeyboardAvoidingView>

      {/* Options: invite to an event, report, block, end the connection */}
      <Modal
        visible={sheet !== 'none'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('none')}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheet('none')} />
        <View style={styles.sheet}>
          {sheet === 'options' ? (
            <>
              <Button
                label={es.connections.inviteToEvent}
                tone="ghost"
                onPress={() => setSheet('events')}
              />
              <Button
                label={es.connections.report}
                tone="ghost"
                style={{ marginTop: 8 }}
                onPress={submitReport}
              />
              <Button
                label={es.connections.block}
                tone="ghost"
                style={{ marginTop: 8 }}
                onPress={block}
              />
              <Button
                label={es.connections.disconnect}
                tone="ghost"
                style={{ marginTop: 8, borderColor: colors.wine }}
                onPress={end}
              />
              <Button
                label={es.common.cancel}
                tone="ink"
                style={{ marginTop: 12 }}
                onPress={() => setSheet('none')}
              />
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>{es.connections.inviteToEvent}</Text>
              <ScrollView style={{ maxHeight: 280 }}>
                {events.map((event) => (
                  <Pressable
                    key={event.id}
                    style={styles.sheetRow}
                    onPress={() => {
                      inviteToEvent.mutate({ id: event.id, title: event.title });
                      setSheet('none');
                    }}
                  >
                    <Text style={styles.name}>{event.title}</Text>
                    <Sub style={{ fontSize: 11 }}>
                      {event.churchName} ·{' '}
                      {new Intl.DateTimeFormat('es-DO', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'America/Santo_Domingo',
                      }).format(new Date(event.startsAt))}
                    </Sub>
                  </Pressable>
                ))}
              </ScrollView>
              <Button
                label={es.common.cancel}
                tone="ink"
                style={{ marginTop: 12 }}
                onPress={() => setSheet('none')}
              />
            </>
          )}
        </View>
      </Modal>
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
  icebreaker: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
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
  bubbleHeld: {
    backgroundColor: colors.wheatSoft,
    borderWidth: 1,
    borderColor: colors.wheat,
    borderStyle: 'dashed',
  },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(24,28,44,.4)' },
  sheet: {
    backgroundColor: colors.linen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 10,
  },
  sheetRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});
