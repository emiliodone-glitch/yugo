import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { es, intlLocale } from '@yugo/shared';
import { useCancelCall, useConnections, useJoinCall, useVideoCalls } from '@yugo/app-core';
import { Button, Card, Chip, Notice, ScreenHeader, Sub } from '../../../../components/ui';
import { ConfirmSheet } from '../../../../components/confirm-sheet';
import { errorMessage } from '../../../../lib/api';
import { theme } from '../../../../lib/theme';

const { colors, fonts } = theme;

const whenLabel = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));

/**
 * La videollamada (RF-CON-12): la hora, los quince minutos, «Entrar» y
 * «Cancelar». La sala del proveedor se abre dentro de la app, en el navegador
 * integrado, con permiso de cámara y micrófono solo ahí. Al cerrarla, la
 * persona vuelve al chat, donde «Reportar» sigue a un toque.
 */
export default function VideoCallScreen() {
  const { id, callId } = useLocalSearchParams<{ id: string; callId: string }>();
  const conversationId = id ?? '';
  const { data: connections = [] } = useConnections();
  const connection = connections.find(
    (item) => item.conversationId === conversationId || item.matchId === conversationId,
  );
  const calls = useVideoCalls(connection?.matchId);
  const joinCall = useJoinCall();
  const cancelCall = useCancelCall();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const call = (calls.data?.calls ?? []).find((item) => item.id === callId);

  const enter = async () => {
    if (!callId) return;
    setNotice(null);
    try {
      const { url } = await joinCall.mutateAsync(callId);
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
          : /video_unavailable/.test(message)
            ? es.connections.videoUnavailable
            : message,
      );
    }
  };

  const cancel = async () => {
    if (!callId || !connection) return;
    try {
      await cancelCall.mutateAsync({ callId, matchId: connection.matchId });
      setConfirmingCancel(false);
      router.back();
    } catch (caught) {
      setConfirmingCancel(false);
      setNotice(errorMessage(caught));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.connections.videoTitle} />
      <ScrollView contentContainerStyle={styles.container}>
        {notice ? <Notice tone="wheat" text={notice} /> : null}

        {calls.isLoading && !calls.data ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
        ) : !call ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 12 }}>
              {es.connections.videoNone}
            </Sub>
            <Button
              label={es.common.back}
              tone="ghost"
              small
              style={{ alignSelf: 'center' }}
              onPress={() => router.back()}
            />
          </Card>
        ) : (
          <>
            <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
              <Chip
                label={call.joinable ? es.connections.videoOpen : es.connections.videoTitle}
                tone={call.joinable ? 'olive' : 'wheat'}
              />
              <Text style={styles.when}>{whenLabel(call.scheduledAt)}</Text>
              {connection ? (
                <Sub style={{ marginTop: 4 }}>{connection.otherUser.displayName}</Sub>
              ) : null}
              <Sub style={{ textAlign: 'center', marginTop: 12 }}>
                {call.joinable
                  ? es.connections.videoOpen
                  : es.connections.videoWaiting(whenLabel(call.scheduledAt))}
              </Sub>
            </Card>

            {/* Los quince minutos, dichos antes de entrar. */}
            <Notice tone="olive" text={es.connections.videoIntro} />

            <Button
              label={joinCall.isPending ? es.common.loading : es.connections.videoJoin}
              tone="olive"
              disabled={!call.joinable || joinCall.isPending}
              onPress={() => void enter()}
            />
            {call.status === 'SCHEDULED' ? (
              <Button
                label={es.connections.videoCancel}
                tone="ghost"
                style={{ marginTop: 8 }}
                disabled={cancelCall.isPending}
                onPress={() => setConfirmingCancel(true)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmingCancel}
        title={es.connections.videoCancel}
        body={es.connections.videoTitle}
        confirmLabel={es.connections.videoCancel}
        destructive
        busy={cancelCall.isPending}
        onConfirm={() => void cancel()}
        onCancel={() => setConfirmingCancel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  when: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
