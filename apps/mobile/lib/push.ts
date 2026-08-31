/**
 * Push notifications (RF-NOT-01/03).
 *
 * The API could already store a device token and fan out through Expo; the app
 * never asked for one, so nothing ever reached a phone. This registers the
 * token and turns a tapped notification into a screen.
 *
 * Quiet hours are honoured on the server (RF-NOT-02): a notification raised at
 * night is held in the queue, not dropped, so nothing extra is needed here.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { destinationFor } from '@yugo/shared';
import { DEMO_MODE, getApiClient } from './api';

/** Foreground behaviour: show the banner, the member is not always reading. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Asks for permission and registers the device token.
 *
 * Returns silently when it cannot: a simulator has no push token, and a member
 * who declines must keep using the app normally — the notification centre in
 * the app still shows everything.
 */
export async function registerForPush(): Promise<void> {
  if (DEMO_MODE || !Device.isDevice) return;

  try {
    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted ||
      (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    if (Platform.OS === 'android') {
      // Android needs a channel or notifications never show.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Yugo',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#E0B25A',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await getApiClient().notifications.registerPushToken(
      token.data,
      Platform.OS === 'ios' ? 'ios' : 'android',
    );
  } catch {
    // Never block the app on push: the in-app notification centre still works.
  }
}

/** Routes a tapped notification to the screen it is about (RF-NOT-03). */
export function routeFromNotification(data: Record<string, unknown> | undefined): void {
  const destination = destinationFor(data);
  switch (destination.screen) {
    case 'conversation':
      router.push({ pathname: '/chat/[id]', params: { id: destination.id } });
      return;
    case 'event':
      router.push({ pathname: '/eventos/[id]', params: { id: destination.id } });
      return;
    case 'group':
      router.push({ pathname: '/comunidad/[id]', params: { id: destination.id } });
      return;
    case 'interested-in-you':
      router.push('/descubrir/te-interesa');
      return;
    case 'verification':
      router.push('/perfil/verificacion');
      return;
    default:
      router.push('/perfil/notificaciones');
  }
}

/** Subscribes to taps. Returns the unsubscribe. */
export function listenToNotificationTaps(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    routeFromNotification(
      response.notification.request.content.data as Record<string, unknown> | undefined,
    );
  });
  return () => subscription.remove();
}
