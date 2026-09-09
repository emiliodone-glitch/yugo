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
import * as WebBrowser from 'expo-web-browser';
import { CLOSING_TEMPLATES, es } from '@yugo/shared';
import {
  useBlockUser,
  useCancelCall,
  useCloseConnection,
  useConnections,
  useConversation,
  useConversationRealtime,
  useCurrentUserId,
  useEvents,
  useInviteToEvent,
  useJoinCall,
  useReport,
  useScheduleCall,
  useSendMessage,
  useVideoCalls,
} from '@yugo/app-core';
import { errorMessage } from '../../lib/api';
import { AvatarCircle, Button, CheckMark, Chip, Field, Notice, Sub } from '../../components/ui';
import {
  AccompanimentCard,
  MeetingPlanCard,
  OurStoryCard,
  RelationshipStageCard,
  StageQuestionsCard,
} from '../../components/relationship';
import { theme } from '../../lib/theme';
import { ChatSkeleton } from '../../components/skeleton';

const { colors, fonts } = theme;

type Sheet = 'none' | 'options' | 'events' | 'close' | 'video';

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
  const calls = useVideoCalls(
    connections.find(
      (item) => item.conversationId === conversationId || item.matchId === conversationId,
    )?.matchId,
  );

  // RF-CON-03: el mensaje llega solo, sin recargar.
  const { otherIsTyping, theyReadAt, notifyTyping } = useConversationRealtime(
    conversationId,
    currentUserId,
  );
  const [draft, setDraft] = useState('');
  // Cierre digno (RF-CON-11) y videollamada (RF-CON-12)
  const closeConnection = useCloseConnection();
  const [closingChoice, setClosingChoice] = useState<string>(CLOSING_TEMPLATES[0].key);
  const [closingOwn, setClosingOwn] = useState('');
  const scheduleCall = useScheduleCall();
  const joinCall = useJoinCall();
  const cancelCall = useCancelCall();
  const [sheet, setSheet] = useState<Sheet>('none');
  const [notice, setNotice] = useState<string | null>(null);

  const connection = connections.find(
    (item) => item.conversationId === conversationId || item.matchId === conversationId,
  );

  if (connectionsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
        <ChatSkeleton />
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

  // Cierre digno: con una palabra, no con silencio (RF-CON-11).
  const closeWithMessage = async () => {
    const isOwn = closingChoice === 'own';
    try {
      await closeConnection.mutateAsync(
        isOwn
          ? { matchId: connection.matchId, message: closingOwn.trim() }
          : { matchId: connection.matchId, template: closingChoice },
      );
      setSheet('none');
      router.back();
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice(
        /closing_message_rejected/.test(message)
          ? 'Ese mensaje no pasó la moderación. Dilo con respeto y sin datos de contacto.'
          : message,
      );
      setSheet('none');
    }
  };

  // Videollamada (RF-CON-12): tres horas propuestas, sin selector de fecha.
  const slots = (() => {
    const list: Array<{ label: string; iso: string }> = [];
    const now = new Date();
    const today20 = new Date(now);
    today20.setHours(20, 0, 0, 0);
    if (today20.getTime() > now.getTime() + 30 * 60_000) {
      list.push({ label: 'Hoy 8:00 p. m.', iso: today20.toISOString() });
    }
    const tomorrow20 = new Date(today20);
    tomorrow20.setDate(tomorrow20.getDate() + 1);
    list.push({ label: 'Mañana 8:00 p. m.', iso: tomorrow20.toISOString() });
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    saturday.setHours(10, 0, 0, 0);
    list.push({ label: 'Sábado 10:00 a. m.', iso: saturday.toISOString() });
    return list;
  })();

  const proposeCall = async (iso: string) => {
    try {
      await scheduleCall.mutateAsync({ matchId: connection.matchId, scheduledAt: iso });
      setNotice(es.connections.videoScheduled);
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice(/video_unavailable/.test(message) ? es.connections.videoUnavailable : message);
    }
    setSheet('none');
  };

  const enterCall = async (callId: string) => {
    try {
      const { url } = await joinCall.mutateAsync(callId);
      setSheet('none');
      if (url.startsWith('about:blank')) {
        setNotice('Entorno de demostración: aquí se abre la sala de video.');
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice(
        /call_not_open/.test(message)
          ? 'Todavía no se abre: puedes entrar desde 10 minutos antes.'
          : message,
      );
    }
  };

  const whenLabel = (iso: string) =>
    new Intl.DateTimeFormat('es-DO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));

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

          <RelationshipStageCard
            matchId={connection.matchId}
            otherName={connection.otherUser.displayName}
          />
          <StageQuestionsCard matchId={connection.matchId} />
          <AccompanimentCard matchId={connection.matchId} />
          <OurStoryCard matchId={connection.matchId} />
          <MeetingPlanCard matchId={connection.matchId} />

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

          {messages.map((message, index) => {
            const mine = message.senderId === currentUserId;
            const held = message.moderationStatus === 'HELD';
            const rejected = message.moderationStatus === 'REJECTED';
            // El acuse va solo bajo el último mensaje propio entregado.
            const isLastMine =
              mine &&
              !held &&
              !rejected &&
              !messages.slice(index + 1).some((later) => later.senderId === currentUserId);
            const receipt = isLastMine
              ? theyReadAt || message.readAt
                ? es.connections.read
                : message.deliveredAt
                  ? es.connections.delivered
                  : null
              : null;
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
                {receipt ? <Text style={styles.receipt}>{receipt}</Text> : null}
              </View>
            );
          })}

          <Sub style={{ textAlign: 'center', marginVertical: 8, fontSize: 11 }}>
            {es.connections.chatRules}
          </Sub>
        </ScrollView>

        {otherIsTyping ? (
          <Sub style={styles.typing}>
            {connection.otherUser.displayName} {es.connections.typing}
          </Sub>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={es.connections.writeMessage}
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              notifyTyping(text.length > 0);
            }}
            onBlur={() => notifyTyping(false)}
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
                label={es.connections.videoTitle}
                tone="ghost"
                style={{ marginTop: 8 }}
                onPress={() => setSheet('video')}
              />
              <Button
                label={es.connections.closeTitle}
                tone="ghost"
                style={{ marginTop: 8, borderColor: colors.wine }}
                onPress={() => setSheet('close')}
              />
              <Button
                label={es.common.cancel}
                tone="ink"
                style={{ marginTop: 12 }}
                onPress={() => setSheet('none')}
              />
            </>
          ) : sheet === 'close' ? (
            <>
              <Text style={styles.sheetTitle}>{es.connections.closeTitle}</Text>
              <Sub style={{ fontSize: 12, marginBottom: 8 }}>{es.connections.closeIntro}</Sub>
              <ScrollView style={{ maxHeight: 320 }}>
                {[...CLOSING_TEMPLATES, { key: 'own', text: es.connections.closeOwn }].map(
                  (template) => (
                    <Pressable
                      key={template.key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: closingChoice === template.key }}
                      onPress={() => setClosingChoice(template.key)}
                      style={[
                        styles.sheetRow,
                        closingChoice === template.key
                          ? { backgroundColor: colors.oliveSoft, borderRadius: 10 }
                          : null,
                      ]}
                    >
                      <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.text }}>
                        {closingChoice === template.key ? '● ' : '○ '}
                        {template.text}
                      </Text>
                    </Pressable>
                  ),
                )}
                {closingChoice === 'own' ? (
                  <Field
                    value={closingOwn}
                    onChangeText={setClosingOwn}
                    placeholder={es.connections.closeOwnPlaceholder}
                    maxLength={400}
                    multiline
                    autoCapitalize="sentences"
                    style={{ marginTop: 8 }}
                  />
                ) : null}
              </ScrollView>
              <Button
                label={es.connections.closeConfirm}
                tone="ink"
                style={{ marginTop: 12 }}
                disabled={
                  closeConnection.isPending ||
                  (closingChoice === 'own' && closingOwn.trim().length < 10)
                }
                onPress={() => void closeWithMessage()}
              />
              <Button
                label={es.common.cancel}
                tone="ghost"
                style={{ marginTop: 8 }}
                onPress={() => setSheet('none')}
              />
            </>
          ) : sheet === 'video' ? (
            <>
              <Text style={styles.sheetTitle}>{es.connections.videoTitle}</Text>
              <Sub style={{ fontSize: 12, marginBottom: 8 }}>{es.connections.videoIntro}</Sub>
              {calls.data && !calls.data.available ? (
                <Notice tone="wheat" text={es.connections.videoUnavailable} />
              ) : null}
              {(calls.data?.calls ?? []).length === 0 ? (
                <Sub style={{ fontSize: 12 }}>{es.connections.videoNone}</Sub>
              ) : (
                (calls.data?.calls ?? []).map((call) => (
                  <View key={call.id} style={[styles.sheetRow, { gap: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{whenLabel(call.scheduledAt)}</Text>
                      <Sub style={{ fontSize: 11 }}>
                        {call.joinable
                          ? es.connections.videoOpen
                          : es.connections.videoWaiting(whenLabel(call.scheduledAt))}
                      </Sub>
                    </View>
                    <Button
                      label={es.connections.videoJoin}
                      tone="olive"
                      small
                      disabled={!call.joinable || joinCall.isPending}
                      onPress={() => void enterCall(call.id)}
                    />
                    <Button
                      label={es.connections.videoCancel}
                      tone="ghost"
                      small
                      disabled={cancelCall.isPending}
                      onPress={() =>
                        cancelCall.mutate({ callId: call.id, matchId: connection.matchId })
                      }
                    />
                  </View>
                ))
              )}
              <Text style={[styles.sheetTitle, { marginTop: 12 }]}>
                {es.connections.videoPropose}
              </Text>
              {slots.map((slot) => (
                <Button
                  key={slot.iso}
                  label={slot.label}
                  tone="ghost"
                  style={{ marginTop: 8 }}
                  disabled={scheduleCall.isPending || calls.data?.available === false}
                  onPress={() => void proposeCall(slot.iso)}
                />
              ))}
              <Button
                label={es.common.close}
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
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
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
  receipt: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,.7)',
    textAlign: 'right',
    marginTop: 2,
  },
  typing: { fontSize: 11, fontStyle: 'italic', paddingHorizontal: 18, paddingBottom: 4 },
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
