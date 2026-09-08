/**
 * Eventos de producto para el embudo (RF-ADM-12).
 *
 * Anónimos por diseño: un identificador por instalación (nunca el correo ni
 * el nombre), propiedades cortas y primitivas, y la API añade un hash del
 * usuario que no se puede revertir cuando hay sesión. Sirve para ver dónde
 * se cae la gente entre la bienvenida y la primera conexión, no para seguir
 * a nadie. En modo demo no se envía nada.
 */
import { api, isDemoMode } from './runtime';

export interface AnalyticsStorage {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
}

interface AnalyticsConfig {
  storage: AnalyticsStorage;
  platform: 'web' | 'ios' | 'android';
  /** Apagado global (opt-out del entorno o de la persona). */
  enabled?: boolean;
}

interface QueuedEvent {
  name: string;
  props?: Record<string, unknown>;
  at: string;
}

const ANON_KEY = 'yugo.anon';
const FLUSH_AFTER_MS = 4000;
const FLUSH_AT = 20;

let config: AnalyticsConfig | null = null;
let anonymousId: string | null = null;
const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function randomId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID().replace(/-/g, '');
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function configureAnalytics(next: AnalyticsConfig): void {
  config = next;
}

async function ensureAnonymousId(): Promise<string | null> {
  if (anonymousId) return anonymousId;
  if (!config) return null;
  try {
    const stored = await config.storage.get(ANON_KEY);
    if (stored && stored.length >= 8) {
      anonymousId = stored;
      return stored;
    }
    const fresh = randomId();
    await config.storage.set(ANON_KEY, fresh);
    anonymousId = fresh;
    return fresh;
  } catch {
    anonymousId = randomId();
    return anonymousId;
  }
}

/** Envía lo acumulado. Best effort: un fallo de red no reintenta ni bloquea. */
export async function flushAnalytics(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!config || config.enabled === false || isDemoMode() || queue.length === 0) return;
  const batch = queue.splice(0, FLUSH_AT);
  const id = await ensureAnonymousId();
  if (!id) return;
  try {
    await api().analytics.send({ anonymousId: id, platform: config.platform, events: batch });
  } catch {
    // Silencio a propósito: la analítica nunca debe romper la app.
  }
  if (queue.length > 0) void flushAnalytics();
}

/** Registra un evento. Nombres en snake_case, sin datos personales en props. */
export function track(name: string, props?: Record<string, unknown>): void {
  if (!config || config.enabled === false || isDemoMode()) return;
  queue.push({ name, props, at: new Date().toISOString() });
  if (queue.length >= FLUSH_AT) {
    void flushAnalytics();
    return;
  }
  if (!timer) timer = setTimeout(() => void flushAnalytics(), FLUSH_AFTER_MS);
}
