import * as Sentry from '@sentry/node';

/**
 * Errores de servidor a Sentry (RNF-08), solo si hay SENTRY_DSN.
 *
 * Sin la variable no se carga nada ni cambia nada: el log estructurado del
 * LoggingInterceptor sigue siendo la fuente. Con ella, cada 5xx llega con su
 * requestId, ruta y el id del usuario, y sin lo que RF-SEG-08 prohíbe sacar
 * del servidor: cuerpos de petición, cookies y cabeceras de autorización.
 */
let enabled = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export interface ServerErrorContext {
  requestId?: string;
  route?: string;
  method?: string;
  userId?: string | null;
}

/** Captura un error de servidor con lo justo para encontrarlo en los logs. */
export function captureServerError(error: unknown, context: ServerErrorContext = {}): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context.route) scope.setTag('route', context.route);
    if (context.method) scope.setTag('method', context.method);
    if (context.requestId) scope.setTag('requestId', context.requestId);
    // Solo el id: nunca correo ni nombre.
    if (context.userId) scope.setUser({ id: context.userId });
    Sentry.captureException(error);
  });
}

/** Vacía la cola antes de apagar, para que el último error no se pierda. */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  await Sentry.flush(timeoutMs).catch(() => undefined);
}
