'use client';

/**
 * Errores del navegador a Sentry (RNF-08), solo si el servidor web tiene
 * SENTRY_DSN_WEB. La DSN llega en tiempo de ejecución (como API_URL), así que
 * se activa o apaga en Railway sin reconstruir. Sin DSN no se descarga ni un
 * byte del SDK: se importa dinámicamente solo cuando hace falta.
 *
 * Nunca se manda quién es la persona (RF-SEG-08): ni usuario, ni cookies, ni
 * cabeceras. Un error se puede entender por la ruta y el stack.
 */
import { useEffect } from 'react';

declare global {
  interface Window {
    __YUGO_SENTRY_DSN__?: string;
    __YUGO_RELEASE__?: string;
  }
}

type SentryModule = typeof import('@sentry/browser');
let sdk: Promise<SentryModule | null> | null = null;

export function startErrorReporting(): Promise<SentryModule | null> {
  if (sdk) return sdk;
  if (typeof window === 'undefined' || !window.__YUGO_SENTRY_DSN__) {
    sdk = Promise.resolve(null);
    return sdk;
  }
  const dsn = window.__YUGO_SENTRY_DSN__;
  sdk = import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: window.location.hostname,
        release: window.__YUGO_RELEASE__ || undefined,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend(event) {
          delete event.user;
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
      });
      return Sentry;
    })
    .catch(() => null);
  return sdk;
}

/** Reporta un error atrapado por un límite de React; sin DSN no hace nada. */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  void startErrorReporting().then((Sentry) => {
    if (!Sentry) return;
    Sentry.captureException(error, extra ? { extra } : undefined);
  });
}

export function ErrorReporting() {
  useEffect(() => {
    void startErrorReporting();
  }, []);
  return null;
}
