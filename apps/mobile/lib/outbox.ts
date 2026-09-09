/**
 * Cola de mensajes sin conexión (RNF-06).
 *
 * En un estacionamiento de iglesia la señal va y viene. Un mensaje escrito
 * sin cobertura no se pierde ni falla con un aviso rojo: se guarda aquí, se
 * ve en la conversación como «pendiente de enviar» y sale solo cuando vuelve
 * la red. Tres reglas:
 *
 * - **Uno a la vez y en orden.** Se reenvía en secuencia; si el primero falla
 *   por red, los demás esperan. Así no se duplica ni se desordena.
 * - **Un rechazo del servidor lo saca de la cola.** Un 4xx (moderación,
 *   conversación cerrada) no se reintenta: se avisa a la persona y ya.
 * - **Solo mensajes.** Nada más se reproduce al reconectar; un «me interesa»
 *   o un pago repetidos son peores que uno perdido.
 */
import { ApiError } from '@yugo/shared';

export interface OutboxItem {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  /** Intentos fallidos por red, para no martillar. */
  attempts: number;
}

export interface OutboxStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface OutboxTransport {
  send(conversationId: string, body: string): Promise<unknown>;
}

const KEY = 'yugo.outbox';
const MAX_ITEMS = 50;

export interface FlushResult {
  sent: OutboxItem[];
  /** Rechazados por el servidor: se descartan y se informa. */
  rejected: Array<{ item: OutboxItem; reason: string }>;
  /** Siguen en cola porque la red volvió a fallar. */
  remaining: number;
}

/** Un fallo de red es un fallo de red; cualquier otra cosa es una respuesta. */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  if (error instanceof TypeError) return true; // fetch: «Network request failed»
  const message = error instanceof Error ? error.message : String(error);
  return /network|timeout|failed to fetch|econn|offline/i.test(message);
}

export class Outbox {
  private listeners = new Set<() => void>();
  private flushing: Promise<FlushResult> | null = null;

  constructor(
    private readonly storage: OutboxStorage,
    private readonly transport: OutboxTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(conversationId?: string): Promise<OutboxItem[]> {
    const items = await this.read();
    return conversationId ? items.filter((i) => i.conversationId === conversationId) : items;
  }

  async enqueue(conversationId: string, body: string): Promise<OutboxItem> {
    const items = await this.read();
    const item: OutboxItem = {
      id: `out-${this.now().getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      body,
      createdAt: this.now().toISOString(),
      attempts: 0,
    };
    // La cola tiene tope: si alguien escribe cincuenta mensajes sin señal, los
    // más viejos ya no tienen sentido cuando vuelva.
    const next = [...items, item].slice(-MAX_ITEMS);
    await this.write(next);
    return item;
  }

  async remove(id: string): Promise<void> {
    const items = await this.read();
    await this.write(items.filter((i) => i.id !== id));
  }

  /** Reenvía en orden. Concurrente-seguro: una segunda llamada espera la primera. */
  flush(): Promise<FlushResult> {
    if (this.flushing) return this.flushing;
    this.flushing = this.doFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async doFlush(): Promise<FlushResult> {
    const result: FlushResult = { sent: [], rejected: [], remaining: 0 };
    let items = await this.read();
    for (const item of [...items]) {
      try {
        await this.transport.send(item.conversationId, item.body);
        items = items.filter((i) => i.id !== item.id);
        result.sent.push(item);
      } catch (error) {
        if (isNetworkFailure(error)) {
          // La red volvió a irse: lo que queda espera al próximo intento.
          items = items.map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i));
          break;
        }
        items = items.filter((i) => i.id !== item.id);
        result.rejected.push({
          item,
          reason: error instanceof Error ? error.message : 'rejected',
        });
      }
    }
    await this.write(items);
    result.remaining = items.length;
    return result;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async read(): Promise<OutboxItem[]> {
    try {
      const raw = await this.storage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async write(items: OutboxItem[]): Promise<void> {
    try {
      await this.storage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Sin almacenamiento la cola vive solo en esta sesión; peor es perder el mensaje.
    }
    this.listeners.forEach((listener) => listener());
  }
}
