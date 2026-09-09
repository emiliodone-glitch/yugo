/**
 * Offline behaviour for the mobile app.
 *
 * Yugo is used on a phone in the Dominican Republic, often on mobile data in a
 * church parking lot. Losing signal should not empty the screen: the last
 * lists stay readable and the app says plainly that it is showing what it had.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * React Query decides whether to fire a request from `onlineManager`. On the
 * web the browser reports this; React Native needs NetInfo wired in, and
 * without it queries fire into a dead radio and fail instead of waiting.
 */
export function bindNetworkState(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    }),
  );
}

/**
 * Persists the query cache so a cold start with no signal still shows the last
 * Discover list, connections and events instead of empty screens.
 *
 * Only cached reads are restored. Nothing that changes data is replayed from
 * here: a stale mutation firing on reconnect is how apps double-send.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'yugo.query-cache',
  throttleTime: 2000,
});

/** Whether the device currently has usable connectivity. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}

// ---------------------------------------------------------------------------
// Cola de mensajes sin conexión (RNF-06)
// ---------------------------------------------------------------------------

import { getApiClient } from './api';
import { Outbox, type OutboxItem } from './outbox';

/** La cola de la app: AsyncStorage detrás, el cliente tipado delante. */
export const outbox = new Outbox(AsyncStorage, {
  send: (conversationId, body) => getApiClient().connections.send(conversationId, body),
});

/**
 * Reenvía lo pendiente cada vez que vuelve la red (y una vez al arrancar, por
 * si la app se cerró con mensajes en cola). Devuelve la función para dejar de
 * escuchar.
 */
export function startOutboxSync(onFlushed?: (sent: OutboxItem[]) => void): () => void {
  let wasOnline = onlineManager.isOnline();
  const flush = () =>
    outbox
      .flush()
      .then((result) => {
        if (result.sent.length > 0) onFlushed?.(result.sent);
      })
      .catch(() => undefined);
  if (wasOnline) void flush();
  return onlineManager.subscribe((online) => {
    if (online && !wasOnline) void flush();
    wasOnline = online;
  });
}

/** Lo pendiente de una conversación, para pintarlo como «por enviar». */
export function useOutboxItems(conversationId: string): OutboxItem[] {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      outbox.list(conversationId).then((next) => {
        if (alive) setItems(next);
      });
    void load();
    const unsubscribe = outbox.subscribe(() => void load());
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [conversationId]);
  return items;
}
