/**
 * Errores de la app a Sentry (RNF-08), solo con EXPO_PUBLIC_SENTRY_DSN.
 *
 * Sin la variable no se inicializa nada. Con ella, los errores de JavaScript
 * no atrapados (los que cierran la app) llegan con la versión y el modo, y
 * sin la persona: ni usuario, ni correo, ni cuerpo de peticiones (RF-SEG-08).
 *
 * El SDK es un módulo nativo: activar la variable exige un build nuevo con
 * EAS, igual que expo-av. Los mapas de fuente se suben cuando se configure el
 * plugin de Expo con SENTRY_AUTH_TOKEN; hasta entonces las trazas llegan
 * minificadas, que ya sirve para saber qué pantalla se cae y cuánto.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let started = false;

export function startMonitoring(): boolean {
  if (started) return true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;
  const version = Constants.expoConfig?.version;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ? 'demo' : 'production',
    release: version ? `yugo-mobile@${version}` : undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.data;
      }
      return event;
    },
  });
  started = true;
  return true;
}

/** Reporta un error atrapado a mano (p. ej. al reenviar la cola sin conexión). */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (!started) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
