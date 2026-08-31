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
